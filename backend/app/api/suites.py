"""Test Suites API"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.models.models import TestSuite, TestScenario, SuiteScenario
from app.schemas.schemas import SuiteOut, SuiteCreate, SuiteUpdate, SuiteDetail, ScenarioOut

router = APIRouter()


def _suite_out(suite: TestSuite) -> SuiteOut:
    return SuiteOut(
        id=suite.id,
        name=suite.name,
        description=suite.description,
        tags=suite.tags or [],
        is_builtin=suite.is_builtin,
        scenario_count=len(suite.suite_scenarios),
        created_at=suite.created_at,
    )


@router.get("", response_model=List[SuiteOut])
def list_suites(db: Session = Depends(get_db)):
    suites = db.query(TestSuite).order_by(TestSuite.name).all()
    return [_suite_out(s) for s in suites]


@router.get("/{suite_id}", response_model=SuiteDetail)
def get_suite(suite_id: str, db: Session = Depends(get_db)):
    suite = db.query(TestSuite).filter(TestSuite.id == suite_id).first()
    if not suite:
        raise HTTPException(status_code=404, detail="Suite not found")
    scenarios = [ss.scenario for ss in sorted(suite.suite_scenarios, key=lambda x: x.order_index)]
    return SuiteDetail(
        **_suite_out(suite).model_dump(),
        scenarios=[ScenarioOut.model_validate(s) for s in scenarios if s],
    )


@router.post("", response_model=SuiteOut, status_code=201)
def create_suite(data: SuiteCreate, db: Session = Depends(get_db)):
    suite = TestSuite(name=data.name, description=data.description, tags=data.tags, is_builtin=False)
    db.add(suite)
    db.flush()
    for i, sid in enumerate(data.scenario_ids):
        sc = db.query(TestScenario).filter(
            (TestScenario.id == sid) | (TestScenario.scenario_id == sid)
        ).first()
        if sc:
            db.add(SuiteScenario(suite_id=suite.id, scenario_id_fk=sc.id, order_index=i))
    db.commit()
    db.refresh(suite)
    return _suite_out(suite)


@router.put("/{suite_id}", response_model=SuiteOut)
def update_suite(suite_id: str, data: SuiteUpdate, db: Session = Depends(get_db)):
    suite = db.query(TestSuite).filter(TestSuite.id == suite_id, TestSuite.is_builtin == False).first()
    if not suite:
        raise HTTPException(status_code=404, detail="Suite not found or is built-in")
    if data.name is not None:
        suite.name = data.name
    if data.description is not None:
        suite.description = data.description
    if data.tags is not None:
        suite.tags = data.tags
    if data.scenario_ids is not None:
        # Replace scenarios
        for ss in suite.suite_scenarios:
            db.delete(ss)
        db.flush()
        for i, sid in enumerate(data.scenario_ids):
            sc = db.query(TestScenario).filter(
                (TestScenario.id == sid) | (TestScenario.scenario_id == sid)
            ).first()
            if sc:
                db.add(SuiteScenario(suite_id=suite.id, scenario_id_fk=sc.id, order_index=i))
    db.commit()
    db.refresh(suite)
    return _suite_out(suite)


@router.delete("/{suite_id}", status_code=204)
def delete_suite(suite_id: str, db: Session = Depends(get_db)):
    suite = db.query(TestSuite).filter(TestSuite.id == suite_id, TestSuite.is_builtin == False).first()
    if not suite:
        raise HTTPException(status_code=404, detail="Suite not found or is built-in")
    db.delete(suite)
    db.commit()
