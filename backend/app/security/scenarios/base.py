"""
Base classes for security testing scenarios.
Every scenario must subclass BaseScenario and implement execute().
"""
from __future__ import annotations
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Optional, Dict, Any, List
import time


@dataclass
class TargetResponse:
    """Represents a response from a target AI application"""
    text: str
    tool_calls: List[Dict[str, Any]] = field(default_factory=list)
    raw: Optional[Dict[str, Any]] = None
    duration_ms: int = 0
    error: Optional[str] = None

    @property
    def is_error(self) -> bool:
        return self.error is not None

    def contains(self, substring: str, case_sensitive: bool = False) -> bool:
        text = self.text if case_sensitive else self.text.lower()
        needle = substring if case_sensitive else substring.lower()
        return needle in text

    def contains_any(self, patterns: List[str], case_sensitive: bool = False) -> bool:
        return any(self.contains(p, case_sensitive) for p in patterns)

    def contains_all(self, patterns: List[str], case_sensitive: bool = False) -> bool:
        return all(self.contains(p, case_sensitive) for p in patterns)


@dataclass
class ScenarioResult:
    """The result of executing a single security scenario"""
    scenario_id: str
    scenario_name: str
    category: str
    severity: str
    status: str                          # passed | failed | error | skipped
    payload: Optional[str]
    response_text: Optional[str]
    expected_behavior: str
    observed_behavior: str
    evidence: Dict[str, Any]
    error_message: Optional[str] = None
    duration_ms: int = 0
    notes: Optional[str] = None          # Interpretation or limitations

    @property
    def passed(self) -> bool:
        return self.status == "passed"

    @property
    def failed(self) -> bool:
        return self.status == "failed"

    @property
    def is_security_finding(self) -> bool:
        """True only if a genuine security issue was found (not an execution error)"""
        return self.status == "failed"


class BaseScenario(ABC):
    """Abstract base class for all HEPHAESTUS security scenarios"""

    # Subclasses MUST define these
    id: str = ""
    name: str = ""
    category: str = ""
    severity: str = "medium"
    technique: str = ""
    description: str = ""
    expected_behavior: str = ""
    tags: List[str] = []

    @abstractmethod
    def execute(self, target) -> ScenarioResult:
        """Execute this scenario against the given target."""
        ...

    def build_result(
        self,
        passed: bool,
        response: Optional[TargetResponse],
        observed_behavior: Optional[str] = None,
        evidence: Optional[Dict[str, Any]] = None,
        notes: Optional[str] = None,
        error: Optional[str] = None,
    ) -> ScenarioResult:
        """Helper to build a ScenarioResult from a response."""
        if error:
            status = "error"
        elif passed:
            status = "passed"
        else:
            status = "failed"

        return ScenarioResult(
            scenario_id=self.id,
            scenario_name=self.name,
            category=self.category,
            severity=self.severity,
            status=status,
            payload=getattr(self, "_last_payload", None),
            response_text=response.text if response else None,
            expected_behavior=self.expected_behavior,
            observed_behavior=observed_behavior or (response.text[:500] if response else ""),
            evidence=evidence or {
                "response": response.text if response else None,
                "tool_calls": response.tool_calls if response else [],
                "raw": response.raw if response else None,
            },
            error_message=error or (response.error if response else None),
            duration_ms=response.duration_ms if response else 0,
            notes=notes,
        )

    def skip(self, reason: str) -> ScenarioResult:
        return ScenarioResult(
            scenario_id=self.id,
            scenario_name=self.name,
            category=self.category,
            severity=self.severity,
            status="skipped",
            payload=None,
            response_text=None,
            expected_behavior=self.expected_behavior,
            observed_behavior=f"Skipped: {reason}",
            evidence={},
            notes=reason,
        )
