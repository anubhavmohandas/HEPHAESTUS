"""Reports API — export JSON and self-contained HTML reports"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse, HTMLResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.models import TestRun
from app.reporting.generator import generate_json_report, generate_html_report

router = APIRouter()


@router.get("/{run_id}/json")
def export_json(run_id: str, include_evidence: bool = True, db: Session = Depends(get_db)):
    run = db.query(TestRun).filter(TestRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    report = generate_json_report(run, include_evidence=include_evidence)
    return JSONResponse(content=report)


@router.get("/{run_id}/html", response_class=HTMLResponse)
def export_html(run_id: str, db: Session = Depends(get_db)):
    run = db.query(TestRun).filter(TestRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    html = generate_html_report(run)
    return HTMLResponse(content=html)
