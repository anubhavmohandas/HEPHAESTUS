"""Targets API"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.models.models import TargetConfig
from app.schemas.schemas import TargetConfigCreate, TargetConfigOut

router = APIRouter()


@router.get("", response_model=List[TargetConfigOut])
def list_targets(db: Session = Depends(get_db)):
    return db.query(TargetConfig).filter(TargetConfig.is_active == True).all()


@router.get("/{target_id}", response_model=TargetConfigOut)
def get_target(target_id: str, db: Session = Depends(get_db)):
    row = db.query(TargetConfig).filter(TargetConfig.id == target_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Target not found")
    return row


@router.post("", response_model=TargetConfigOut, status_code=201)
def create_target(data: TargetConfigCreate, db: Session = Depends(get_db)):
    row = TargetConfig(**data.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.delete("/{target_id}", status_code=204)
def delete_target(target_id: str, db: Session = Depends(get_db)):
    row = db.query(TargetConfig).filter(TargetConfig.id == target_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Target not found")
    row.is_active = False
    db.commit()
