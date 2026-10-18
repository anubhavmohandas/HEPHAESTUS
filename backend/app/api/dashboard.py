"""Dashboard API"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta

from app.core.database import get_db
from app.models.models import TestScenario, TestSuite, TestRun, TestResult
from app.schemas.schemas import DashboardStats, RunOut

router = APIRouter()


@router.get("", response_model=DashboardStats)
def get_dashboard(db: Session = Depends(get_db)):
    total_scenarios = db.query(TestScenario).filter(TestScenario.is_active == True).count()
    total_suites = db.query(TestSuite).count()
    total_runs = db.query(TestRun).count()

    # Recent runs (last 10)
    recent_run_rows = (
        db.query(TestRun)
        .order_by(TestRun.created_at.desc())
        .limit(10)
        .all()
    )
    recent_runs = []
    for r in recent_run_rows:
        run_out = RunOut(
            id=r.id, suite_id=r.suite_id, target_id=r.target_id,
            run_name=r.run_name, status=r.status,
            started_at=r.started_at, completed_at=r.completed_at,
            duration_ms=r.duration_ms,
            total_scenarios=r.total_scenarios, passed=r.passed,
            failed=r.failed, errors=r.errors, skipped=r.skipped,
            created_at=r.created_at,
            suite_name=r.suite.name if r.suite else None,
            target_name=r.target.name if r.target else None,
        )
        recent_runs.append(run_out)

    # Pass rate across all completed results
    total_results = db.query(TestResult).count()
    passed_results = db.query(TestResult).filter(TestResult.status == "passed").count()
    pass_rate = round(passed_results / total_results * 100, 1) if total_results > 0 else 0.0

    # Category breakdown (failed results by category)
    category_rows = (
        db.query(TestResult.category, func.count(TestResult.id))
        .filter(TestResult.status == "failed")
        .group_by(TestResult.category)
        .all()
    )
    category_breakdown = {row[0]: row[1] for row in category_rows if row[0]}

    # Severity breakdown (failed results by severity)
    severity_rows = (
        db.query(TestResult.severity, func.count(TestResult.id))
        .filter(TestResult.status == "failed")
        .group_by(TestResult.severity)
        .all()
    )
    severity_breakdown = {row[0]: row[1] for row in severity_rows if row[0]}

    # Last run timestamp
    last_run = db.query(func.max(TestRun.completed_at)).scalar()

    return DashboardStats(
        total_scenarios=total_scenarios,
        total_suites=total_suites,
        total_runs=total_runs,
        recent_runs=recent_runs,
        pass_rate=pass_rate,
        category_breakdown=category_breakdown,
        severity_breakdown=severity_breakdown,
        last_run_at=last_run,
    )
