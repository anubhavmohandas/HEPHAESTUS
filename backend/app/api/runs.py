"""Test Runs API — trigger runs, retrieve history, get results"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import uuid

from app.core.database import get_db, SessionLocal
from app.models.models import TestRun, TestResult, TestSuite, SuiteScenario, TestScenario, TargetConfig
from app.schemas.schemas import RunCreate, RunOut, RunDetail, ResultOut
from app.security.runner import TestRunner, create_target, SCENARIO_BY_ID, ALL_SCENARIOS

router = APIRouter()


def _run_out(run: TestRun) -> RunOut:
    return RunOut(
        id=run.id, suite_id=run.suite_id, target_id=run.target_id,
        run_name=run.run_name, status=run.status,
        started_at=run.started_at, completed_at=run.completed_at,
        duration_ms=run.duration_ms,
        total_scenarios=run.total_scenarios, passed=run.passed,
        failed=run.failed, errors=run.errors, skipped=run.skipped,
        created_at=run.created_at,
        suite_name=run.suite.name if run.suite else None,
        target_name=run.target.name if run.target else None,
    )


@router.get("", response_model=List[RunOut])
def list_runs(limit: int = 50, db: Session = Depends(get_db)):
    runs = db.query(TestRun).order_by(TestRun.created_at.desc()).limit(limit).all()
    return [_run_out(r) for r in runs]


@router.get("/{run_id}", response_model=RunDetail)
def get_run(run_id: str, db: Session = Depends(get_db)):
    run = db.query(TestRun).filter(TestRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    results = [ResultOut.model_validate(r) for r in run.results]
    return RunDetail(**_run_out(run).model_dump(), results=results)


@router.post("", response_model=RunOut, status_code=202)
def create_run(data: RunCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    # Determine target
    if data.target_id:
        target_row = db.query(TargetConfig).filter(TargetConfig.id == data.target_id).first()
        if not target_row:
            raise HTTPException(status_code=404, detail="Target not found")
        target_type = target_row.target_type
        hardened = target_row.is_hardened
        target_config = target_row.config or {}
    else:
        # Default to mock baseline
        target_row = db.query(TargetConfig).filter(TargetConfig.is_hardened == False).first()
        target_type = "mock"
        hardened = False
        target_config = {}

    # Determine scenarios to run
    scenario_ids: Optional[List[str]] = None
    suite_id = data.suite_id

    if data.scenario_ids:
        scenario_ids = data.scenario_ids
    elif suite_id:
        suite = db.query(TestSuite).filter(TestSuite.id == suite_id).first()
        if not suite:
            raise HTTPException(status_code=404, detail="Suite not found")
        scenario_ids = [
            ss.scenario.scenario_id
            for ss in sorted(suite.suite_scenarios, key=lambda x: x.order_index)
            if ss.scenario
        ]
    else:
        # Run all scenarios
        scenario_ids = [s.id for s in ALL_SCENARIOS]

    run_name = data.run_name or (
        f"Run {datetime.utcnow().strftime('%Y-%m-%d %H:%M')} — "
        f"{'Hardened' if hardened else 'Baseline'}"
    )

    # Create the run record immediately
    run = TestRun(
        id=str(uuid.uuid4()),
        suite_id=suite_id,
        target_id=target_row.id if target_row else None,
        run_name=run_name,
        status="pending",
        total_scenarios=len(scenario_ids),
    )
    db.add(run)
    db.commit()
    db.refresh(run)

    # Execute in background
    background_tasks.add_task(
        _execute_run,
        run_id=run.id,
        scenario_ids=scenario_ids,
        target_type=target_type,
        hardened=hardened,
        target_config=target_config,
    )

    return _run_out(run)


def _execute_run(
    run_id: str,
    scenario_ids: List[str],
    target_type: str,
    hardened: bool,
    target_config: dict,
):
    """Background task: execute test run and persist results."""
    db = SessionLocal()
    try:
        run = db.query(TestRun).filter(TestRun.id == run_id).first()
        if not run:
            return

        run.status = "running"
        run.started_at = datetime.utcnow()
        db.commit()

        target = create_target(target_type, hardened, target_config)
        runner = TestRunner(target=target, run_id=run_id)
        summary = runner.run_scenarios(scenario_ids=scenario_ids)

        # Persist results
        for result in summary.results:
            db.add(TestResult(
                run_id=run_id,
                scenario_id=result.scenario_id,
                scenario_name=result.scenario_name,
                category=result.category,
                severity=result.severity,
                status=result.status,
                payload=result.payload,
                response_text=result.response_text,
                expected_behavior=result.expected_behavior,
                observed_behavior=result.observed_behavior,
                evidence=result.evidence or {},
                error_message=result.error_message,
                duration_ms=result.duration_ms,
                target_config_snapshot=target.get_config_snapshot(),
            ))

        run.status = "completed"
        run.completed_at = summary.completed_at
        run.duration_ms = summary.duration_ms
        run.total_scenarios = summary.total
        run.passed = summary.passed
        run.failed = summary.failed
        run.errors = summary.errors
        run.skipped = summary.skipped
        db.commit()

    except Exception as e:
        db = SessionLocal()
        run = db.query(TestRun).filter(TestRun.id == run_id).first()
        if run:
            run.status = "failed"
            run.metadata_ = {"error": str(e)}
            db.commit()
        db.close()
    finally:
        db.close()


@router.delete("/{run_id}", status_code=204)
def delete_run(run_id: str, db: Session = Depends(get_db)):
    run = db.query(TestRun).filter(TestRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    db.delete(run)
    db.commit()


@router.get("/{run_id}/results", response_model=List[ResultOut])
def get_run_results(run_id: str, db: Session = Depends(get_db)):
    run = db.query(TestRun).filter(TestRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    return [ResultOut.model_validate(r) for r in run.results]
