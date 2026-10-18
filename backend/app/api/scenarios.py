"""Scenarios API"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.models.models import TestScenario
from app.schemas.schemas import ScenarioOut, ScenarioCreate

router = APIRouter()


@router.get("", response_model=List[ScenarioOut])
def list_scenarios(
    category: Optional[str] = None,
    severity: Optional[str] = None,
    db: Session = Depends(get_db),
):
    q = db.query(TestScenario).filter(TestScenario.is_active == True)
    if category:
        q = q.filter(TestScenario.category == category)
    if severity:
        q = q.filter(TestScenario.severity == severity)
    return q.order_by(TestScenario.scenario_id).all()


@router.get("/{scenario_id}", response_model=ScenarioOut)
def get_scenario(scenario_id: str, db: Session = Depends(get_db)):
    row = db.query(TestScenario).filter(
        (TestScenario.id == scenario_id) | (TestScenario.scenario_id == scenario_id)
    ).first()
    if not row:
        raise HTTPException(status_code=404, detail="Scenario not found")
    return row


@router.post("", response_model=ScenarioOut, status_code=201)
def create_scenario(data: ScenarioCreate, db: Session = Depends(get_db)):
    existing = db.query(TestScenario).filter(TestScenario.scenario_id == data.scenario_id).first()
    if existing:
        raise HTTPException(status_code=409, detail=f"Scenario ID '{data.scenario_id}' already exists")
    row = TestScenario(**data.model_dump(), is_builtin=False)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.delete("/{scenario_id}", status_code=204)
def delete_scenario(scenario_id: str, db: Session = Depends(get_db)):
    row = db.query(TestScenario).filter(
        TestScenario.id == scenario_id,
        TestScenario.is_builtin == False,
    ).first()
    if not row:
        raise HTTPException(status_code=404, detail="Scenario not found or is a built-in scenario")
    db.delete(row)
    db.commit()
