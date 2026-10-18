"""
HEPHAESTUS Test Runner

Orchestrates scenario execution against a target, collects results,
applies policy enforcement, and returns a structured run summary.
"""
from __future__ import annotations
import time
from datetime import datetime
from typing import List, Optional, Dict, Any, TYPE_CHECKING

from app.security.scenarios.base import BaseScenario, ScenarioResult
from app.security.policies.enforcer import PolicyEnforcer, default_enforcer
from app.security.targets.base import BaseTarget
from app.security.targets.mock_target import MockAITarget
from app.security.targets.openai_target import OpenAITarget
from app.security.scenarios.prompt_injection import PROMPT_INJECTION_SCENARIOS, INFORMATION_LEAKAGE_SCENARIOS as PI_IL
from app.security.scenarios.information_leakage import INFORMATION_LEAKAGE_SCENARIOS
from app.security.scenarios.tool_exploitation import UNAUTHORIZED_TOOL_SCENARIOS
from app.security.scenarios.policy_violations import POLICY_VIOLATION_SCENARIOS


# ── Scenario Registry ──────────────────────────────────────────────────────────
ALL_SCENARIOS: List[BaseScenario] = (
    PROMPT_INJECTION_SCENARIOS
    + PI_IL
    + INFORMATION_LEAKAGE_SCENARIOS
    + UNAUTHORIZED_TOOL_SCENARIOS
    + POLICY_VIOLATION_SCENARIOS
)

SCENARIO_BY_ID: Dict[str, BaseScenario] = {s.id: s for s in ALL_SCENARIOS}


def get_all_scenarios() -> List[BaseScenario]:
    return ALL_SCENARIOS


def get_scenario_by_id(scenario_id: str) -> Optional[BaseScenario]:
    return SCENARIO_BY_ID.get(scenario_id)


# ── Run Summary ────────────────────────────────────────────────────────────────

class RunSummary:
    def __init__(self, run_id: str, target_config: Dict[str, Any]):
        self.run_id = run_id
        self.target_config = target_config
        self.results: List[ScenarioResult] = []
        self.started_at = datetime.utcnow()
        self.completed_at: Optional[datetime] = None
        self.duration_ms: int = 0

    @property
    def total(self) -> int:
        return len(self.results)

    @property
    def passed(self) -> int:
        return sum(1 for r in self.results if r.status == "passed")

    @property
    def failed(self) -> int:
        return sum(1 for r in self.results if r.status == "failed")

    @property
    def errors(self) -> int:
        return sum(1 for r in self.results if r.status == "error")

    @property
    def skipped(self) -> int:
        return sum(1 for r in self.results if r.status == "skipped")

    @property
    def pass_rate(self) -> float:
        executable = self.total - self.skipped - self.errors
        if executable == 0:
            return 0.0
        return round(self.passed / executable * 100, 1)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "run_id": self.run_id,
            "target_config": self.target_config,
            "started_at": self.started_at.isoformat(),
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "duration_ms": self.duration_ms,
            "total": self.total,
            "passed": self.passed,
            "failed": self.failed,
            "errors": self.errors,
            "skipped": self.skipped,
            "pass_rate": self.pass_rate,
            "results": [
                {
                    "scenario_id": r.scenario_id,
                    "scenario_name": r.scenario_name,
                    "category": r.category,
                    "severity": r.severity,
                    "status": r.status,
                    "payload": r.payload,
                    "response_text": r.response_text,
                    "expected_behavior": r.expected_behavior,
                    "observed_behavior": r.observed_behavior,
                    "evidence": r.evidence,
                    "error_message": r.error_message,
                    "duration_ms": r.duration_ms,
                    "notes": r.notes,
                }
                for r in self.results
            ],
        }


# ── Test Runner ────────────────────────────────────────────────────────────────

class TestRunner:
    """
    Executes security scenarios against a target and collects results.

    Usage:
        runner = TestRunner(target=MockAITarget(hardened=False))
        summary = runner.run_scenarios(scenario_ids=["PI-001", "PI-002"])
    """

    def __init__(
        self,
        target: Optional[BaseTarget] = None,
        policy_enforcer: Optional[PolicyEnforcer] = None,
        run_id: Optional[str] = None,
    ):
        self.target = target or MockAITarget(hardened=False)
        self.enforcer = policy_enforcer or default_enforcer
        self.run_id = run_id or f"run-{int(time.time())}"

    def run_scenarios(
        self,
        scenarios: Optional[List[BaseScenario]] = None,
        scenario_ids: Optional[List[str]] = None,
    ) -> RunSummary:
        """
        Execute a list of scenarios (or specific IDs) and return a RunSummary.
        """
        if scenario_ids:
            to_run = [
                SCENARIO_BY_ID[sid]
                for sid in scenario_ids
                if sid in SCENARIO_BY_ID
            ]
        elif scenarios:
            to_run = scenarios
        else:
            to_run = ALL_SCENARIOS

        summary = RunSummary(
            run_id=self.run_id,
            target_config=self.target.get_config_snapshot(),
        )
        wall_start = time.time()

        for scenario in to_run:
            result = self._run_one(scenario)
            # Augment evidence with policy inspection
            if result.response_text:
                policy_result = self.enforcer.inspect(result.response_text)
                result.evidence["policy_inspection"] = policy_result.as_dict()
                # If policy found violations that the scenario missed, mark as failed
                if (
                    result.status == "passed"
                    and not policy_result.clean
                    and any(v.severity in ("critical", "high") for v in policy_result.violations)
                ):
                    result.status = "failed"
                    result.observed_behavior += (
                        f" [Policy override: {policy_result.summary}]"
                    )
            summary.results.append(result)

        summary.completed_at = datetime.utcnow()
        summary.duration_ms = int((time.time() - wall_start) * 1000)
        return summary

    def _run_one(self, scenario: BaseScenario) -> ScenarioResult:
        try:
            return scenario.execute(self.target)
        except Exception as e:
            return ScenarioResult(
                scenario_id=scenario.id,
                scenario_name=scenario.name,
                category=scenario.category,
                severity=scenario.severity,
                status="error",
                payload=None,
                response_text=None,
                expected_behavior=scenario.expected_behavior,
                observed_behavior=f"Execution error: {str(e)}",
                evidence={"exception": str(e), "type": type(e).__name__},
                error_message=str(e),
            )


def create_target(target_type: str, hardened: bool, config: Dict[str, Any]) -> BaseTarget:
    """Factory for creating target instances from configuration."""
    if target_type == "mock":
        return MockAITarget(hardened=hardened, config=config)
    if target_type == "openai":
        return OpenAITarget(hardened=hardened, config=config)
    raise ValueError(f"Unknown target type: {target_type}. Supported: mock, openai")


def build_default_suites() -> Dict[str, List[str]]:
    """Return default test suite definitions as scenario ID lists."""
    return {
        "full_assessment": [s.id for s in ALL_SCENARIOS],
        "prompt_injection": [s.id for s in PROMPT_INJECTION_SCENARIOS + PI_IL],
        "information_leakage": [s.id for s in INFORMATION_LEAKAGE_SCENARIOS],
        "tool_exploitation": [s.id for s in UNAUTHORIZED_TOOL_SCENARIOS],
        "policy_violations": [s.id for s in POLICY_VIOLATION_SCENARIOS],
        "critical_only": [s.id for s in ALL_SCENARIOS if s.severity == "critical"],
        "quick_smoke": [s.id for s in ALL_SCENARIOS[:5]],
    }
