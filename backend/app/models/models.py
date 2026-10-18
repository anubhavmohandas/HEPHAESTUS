"""
SQLAlchemy ORM Models for HEPHAESTUS
"""
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, Text, DateTime,
    ForeignKey, JSON, Enum as SAEnum
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
import enum

from app.core.database import Base


def new_uuid():
    return str(uuid.uuid4())


class SeverityLevel(str, enum.Enum):
    critical = "critical"
    high = "high"
    medium = "medium"
    low = "low"
    info = "info"


class TestCategory(str, enum.Enum):
    prompt_injection = "prompt_injection"
    instruction_override = "instruction_override"
    information_leakage = "information_leakage"
    unauthorized_tool = "unauthorized_tool"
    policy_violation = "policy_violation"
    malformed_output = "malformed_output"


class RunStatus(str, enum.Enum):
    pending = "pending"
    running = "running"
    completed = "completed"
    failed = "failed"
    cancelled = "cancelled"


class ResultStatus(str, enum.Enum):
    passed = "passed"      # Security control held: attack was blocked
    failed = "failed"      # Security control failed: attack succeeded
    error = "error"        # Execution error (not a security finding)
    skipped = "skipped"    # Test was skipped


class TestScenario(Base):
    """A single adversarial test scenario"""
    __tablename__ = "test_scenarios"

    id = Column(String, primary_key=True, default=new_uuid)
    scenario_id = Column(String, unique=True, nullable=False)  # e.g. "PI-001"
    name = Column(String, nullable=False)
    description = Column(Text)
    category = Column(String, nullable=False)
    severity = Column(String, nullable=False, default="medium")
    tags = Column(JSON, default=list)
    payload = Column(Text)                # The attack payload
    technique = Column(String)            # Attack technique name
    expected_behavior = Column(Text)      # What a secure system should do
    detection_criteria = Column(JSON)     # Machine-readable pass/fail logic
    is_builtin = Column(Boolean, default=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    suite_scenarios = relationship("SuiteScenario", back_populates="scenario")
    results = relationship("TestResult", back_populates="scenario")


class TestSuite(Base):
    """A named collection of test scenarios"""
    __tablename__ = "test_suites"

    id = Column(String, primary_key=True, default=new_uuid)
    name = Column(String, nullable=False)
    description = Column(Text)
    tags = Column(JSON, default=list)
    is_builtin = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    suite_scenarios = relationship("SuiteScenario", back_populates="suite", cascade="all, delete-orphan")
    runs = relationship("TestRun", back_populates="suite")


class SuiteScenario(Base):
    """Many-to-many mapping between suites and scenarios"""
    __tablename__ = "suite_scenarios"

    id = Column(String, primary_key=True, default=new_uuid)
    suite_id = Column(String, ForeignKey("test_suites.id", ondelete="CASCADE"), nullable=False)
    scenario_id_fk = Column(String, ForeignKey("test_scenarios.id", ondelete="CASCADE"), nullable=False)
    order_index = Column(Integer, default=0)

    suite = relationship("TestSuite", back_populates="suite_scenarios")
    scenario = relationship("TestScenario", back_populates="suite_scenarios")


class TargetConfig(Base):
    """Configuration for a target AI application under test"""
    __tablename__ = "target_configs"

    id = Column(String, primary_key=True, default=new_uuid)
    name = Column(String, nullable=False)
    description = Column(Text)
    target_type = Column(String, nullable=False, default="mock")  # mock | openai | anthropic | custom
    config = Column(JSON, default=dict)  # Type-specific config (model, endpoint, etc.)
    is_hardened = Column(Boolean, default=False)  # Whether defensive controls are enabled
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())

    runs = relationship("TestRun", back_populates="target")


class TestRun(Base):
    """A single execution of a test suite against a target"""
    __tablename__ = "test_runs"

    id = Column(String, primary_key=True, default=new_uuid)
    suite_id = Column(String, ForeignKey("test_suites.id"), nullable=True)
    target_id = Column(String, ForeignKey("target_configs.id"), nullable=True)
    run_name = Column(String)
    status = Column(String, nullable=False, default="pending")
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    duration_ms = Column(Integer)
    total_scenarios = Column(Integer, default=0)
    passed = Column(Integer, default=0)
    failed = Column(Integer, default=0)
    errors = Column(Integer, default=0)
    skipped = Column(Integer, default=0)
    metadata_ = Column("metadata", JSON, default=dict)
    created_at = Column(DateTime, server_default=func.now())

    suite = relationship("TestSuite", back_populates="runs")
    target = relationship("TargetConfig", back_populates="runs")
    results = relationship("TestResult", back_populates="run", cascade="all, delete-orphan")


class TestResult(Base):
    """The result of running a single scenario in a test run"""
    __tablename__ = "test_results"

    id = Column(String, primary_key=True, default=new_uuid)
    run_id = Column(String, ForeignKey("test_runs.id", ondelete="CASCADE"), nullable=False)
    scenario_fk = Column(String, ForeignKey("test_scenarios.id"), nullable=True)
    scenario_id = Column(String)          # Denormalized for history preservation
    scenario_name = Column(String)
    category = Column(String)
    severity = Column(String)
    status = Column(String, nullable=False)  # passed/failed/error/skipped
    payload = Column(Text)
    response_text = Column(Text)
    expected_behavior = Column(Text)
    observed_behavior = Column(Text)
    evidence = Column(JSON, default=dict)    # Full request/response, matched patterns, etc.
    error_message = Column(Text)             # Only set when status=error
    duration_ms = Column(Integer)
    executed_at = Column(DateTime, server_default=func.now())
    target_config_snapshot = Column(JSON, default=dict)  # Snapshot of target config at time of run

    run = relationship("TestRun", back_populates="results")
    scenario = relationship("TestScenario", back_populates="results")
