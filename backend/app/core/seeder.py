"""
Database seeder — populates built-in scenarios, suites, and target configs on first run.
"""
from sqlalchemy.orm import Session
from app.models.models import TestScenario, TestSuite, SuiteScenario, TargetConfig
from app.security.runner import ALL_SCENARIOS, build_default_suites
import logging

log = logging.getLogger(__name__)


def seed_scenarios(db: Session) -> None:
    existing = {s.scenario_id for s in db.query(TestScenario).with_entities(TestScenario.scenario_id).all()}
    added = 0
    for scenario in ALL_SCENARIOS:
        if scenario.id not in existing:
            db.add(TestScenario(
                scenario_id=scenario.id,
                name=scenario.name,
                description=scenario.description,
                category=scenario.category,
                severity=scenario.severity,
                tags=scenario.tags,
                payload=getattr(scenario, "_last_payload", None),
                technique=scenario.technique,
                expected_behavior=scenario.expected_behavior,
                is_builtin=True,
                is_active=True,
            ))
            added += 1
    db.commit()
    if added:
        log.info(f"Seeded {added} scenarios")


def seed_suites(db: Session) -> None:
    # Map scenario_id string → DB row id
    scenario_rows = {
        s.scenario_id: s.id
        for s in db.query(TestScenario).filter(TestScenario.is_builtin == True).all()
    }

    default_suites = build_default_suites()
    suite_meta = {
        "full_assessment": ("Full Security Assessment", "Runs all available security scenarios across all categories."),
        "prompt_injection": ("Prompt Injection Suite", "Scenarios targeting direct and indirect prompt injection attacks."),
        "information_leakage": ("Information Leakage Suite", "Scenarios targeting sensitive data and credential extraction."),
        "tool_exploitation": ("Tool Exploitation Suite", "Scenarios targeting unauthorized tool invocation and SSRF."),
        "policy_violations": ("Policy Violation Suite", "Scenarios testing content policy and output safety controls."),
        "critical_only": ("Critical Severity Only", "Only the highest-severity scenarios for rapid assessment."),
        "quick_smoke": ("Quick Smoke Test", "Fast 5-scenario smoke test for rapid regression checks."),
    }

    existing_names = {s.name for s in db.query(TestSuite.name).all()}
    for key, (name, desc) in suite_meta.items():
        if name in existing_names:
            continue
        suite = TestSuite(name=name, description=desc, is_builtin=True)
        db.add(suite)
        db.flush()

        for i, sid in enumerate(default_suites.get(key, [])):
            db_id = scenario_rows.get(sid)
            if db_id:
                db.add(SuiteScenario(
                    suite_id=suite.id,
                    scenario_id_fk=db_id,
                    order_index=i,
                ))
    db.commit()
    log.info("Seeded default suites")


def seed_targets(db: Session) -> None:
    existing = db.query(TargetConfig).count()
    if existing == 0:
        db.add(TargetConfig(
            name="Mock Baseline",
            description="Built-in mock AI target with no defensive controls (demonstrates vulnerable behavior).",
            target_type="mock",
            config={"hardened": False},
            is_hardened=False,
        ))
        db.add(TargetConfig(
            name="Mock Hardened",
            description="Built-in mock AI target with defensive controls enabled (demonstrates secure behavior).",
            target_type="mock",
            config={"hardened": True},
            is_hardened=True,
        ))
        db.commit()
        log.info("Seeded default targets")


def seed_all(db: Session) -> None:
    seed_scenarios(db)
    seed_suites(db)
    seed_targets(db)
