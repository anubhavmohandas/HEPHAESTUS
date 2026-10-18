"""
Pydantic schemas for HEPHAESTUS API
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Any, Dict
from datetime import datetime


# ─────────────────────────── Scenarios ────────────────────────────

class ScenarioBase(BaseModel):
    scenario_id: str
    name: str
    description: Optional[str] = None
    category: str
    severity: str = "medium"
    tags: List[str] = []
    payload: Optional[str] = None
    technique: Optional[str] = None
    expected_behavior: Optional[str] = None
    detection_criteria: Optional[Dict[str, Any]] = None


class ScenarioCreate(ScenarioBase):
    pass


class ScenarioOut(ScenarioBase):
    id: str
    is_builtin: bool
    is_active: bool
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ─────────────────────────── Test Suites ──────────────────────────

class SuiteCreate(BaseModel):
    name: str
    description: Optional[str] = None
    tags: List[str] = []
    scenario_ids: List[str] = []


class SuiteUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[List[str]] = None
    scenario_ids: Optional[List[str]] = None


class SuiteOut(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    tags: List[str] = []
    is_builtin: bool
    scenario_count: int = 0
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class SuiteDetail(SuiteOut):
    scenarios: List[ScenarioOut] = []


# ─────────────────────────── Targets ──────────────────────────────

class TargetConfigCreate(BaseModel):
    name: str
    description: Optional[str] = None
    target_type: str = "mock"
    config: Dict[str, Any] = {}
    is_hardened: bool = False


class TargetConfigOut(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    target_type: str
    config: Dict[str, Any]
    is_hardened: bool
    is_active: bool
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ─────────────────────────── Test Runs ────────────────────────────

class RunCreate(BaseModel):
    suite_id: Optional[str] = None
    target_id: Optional[str] = None
    run_name: Optional[str] = None
    scenario_ids: Optional[List[str]] = None  # Run specific scenarios without a suite


class RunOut(BaseModel):
    id: str
    suite_id: Optional[str] = None
    target_id: Optional[str] = None
    run_name: Optional[str] = None
    status: str
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    duration_ms: Optional[int] = None
    total_scenarios: int
    passed: int
    failed: int
    errors: int
    skipped: int
    created_at: Optional[datetime] = None
    suite_name: Optional[str] = None
    target_name: Optional[str] = None

    class Config:
        from_attributes = True


# ─────────────────────────── Test Results ─────────────────────────

class ResultOut(BaseModel):
    id: str
    run_id: str
    scenario_id: Optional[str] = None
    scenario_name: Optional[str] = None
    category: Optional[str] = None
    severity: Optional[str] = None
    status: str
    payload: Optional[str] = None
    response_text: Optional[str] = None
    expected_behavior: Optional[str] = None
    observed_behavior: Optional[str] = None
    evidence: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    duration_ms: Optional[int] = None
    executed_at: Optional[datetime] = None
    target_config_snapshot: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True


class RunDetail(RunOut):
    results: List[ResultOut] = []


# ─────────────────────────── Dashboard ────────────────────────────

class DashboardStats(BaseModel):
    total_scenarios: int
    total_suites: int
    total_runs: int
    recent_runs: List[RunOut]
    pass_rate: float
    category_breakdown: Dict[str, int]
    severity_breakdown: Dict[str, int]
    last_run_at: Optional[datetime] = None


# ─────────────────────────── Reports ──────────────────────────────

class ReportRequest(BaseModel):
    run_id: str
    format: str = "json"  # json | html
    include_evidence: bool = True
    include_passing: bool = True
