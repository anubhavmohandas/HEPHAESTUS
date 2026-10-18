"""
API integration tests — tests the FastAPI endpoints end-to-end.
"""
import pytest
import time


class TestHealth:
    def test_health(self, client):
        resp = client.get("/api/health")
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"


class TestScenarioAPI:
    def test_list_scenarios(self, client):
        resp = client.get("/api/scenarios")
        assert resp.status_code == 200
        scenarios = resp.json()
        assert isinstance(scenarios, list)
        assert len(scenarios) > 0

    def test_get_scenario_by_id(self, client):
        resp = client.get("/api/scenarios/PI-001")
        assert resp.status_code == 200
        data = resp.json()
        assert data["scenario_id"] == "PI-001"
        assert data["category"] == "prompt_injection"

    def test_scenario_not_found(self, client):
        resp = client.get("/api/scenarios/FAKE-999")
        assert resp.status_code == 404

    def test_filter_by_category(self, client):
        resp = client.get("/api/scenarios?category=prompt_injection")
        assert resp.status_code == 200
        scenarios = resp.json()
        for s in scenarios:
            assert s["category"] == "prompt_injection"

    def test_create_custom_scenario(self, client):
        resp = client.post("/api/scenarios", json={
            "scenario_id": "CUSTOM-TEST-001",
            "name": "Test Custom Scenario",
            "category": "prompt_injection",
            "severity": "low",
            "description": "A test scenario",
            "expected_behavior": "Should refuse",
        })
        assert resp.status_code == 201
        assert resp.json()["scenario_id"] == "CUSTOM-TEST-001"
        assert resp.json()["is_builtin"] == False

    def test_duplicate_scenario_id_rejected(self, client):
        resp = client.post("/api/scenarios", json={
            "scenario_id": "PI-001",  # Already exists
            "name": "Duplicate",
            "category": "prompt_injection",
            "severity": "low",
        })
        assert resp.status_code == 409


class TestSuiteAPI:
    def test_list_suites(self, client):
        resp = client.get("/api/suites")
        assert resp.status_code == 200
        suites = resp.json()
        assert isinstance(suites, list)
        assert len(suites) > 0

    def test_suite_has_scenario_count(self, client):
        resp = client.get("/api/suites")
        suites = resp.json()
        full = next((s for s in suites if "Full" in s["name"]), None)
        assert full is not None
        assert full["scenario_count"] > 0

    def test_get_suite_detail(self, client):
        resp = client.get("/api/suites")
        suites = resp.json()
        suite_id = suites[0]["id"]
        resp2 = client.get(f"/api/suites/{suite_id}")
        assert resp2.status_code == 200
        assert "scenarios" in resp2.json()

    def test_create_custom_suite(self, client):
        resp = client.post("/api/suites", json={
            "name": "My Test Suite",
            "description": "Custom suite for testing",
            "tags": ["custom", "test"],
            "scenario_ids": ["PI-001", "PI-002"],
        })
        assert resp.status_code == 201
        assert resp.json()["name"] == "My Test Suite"


class TestTargetAPI:
    def test_list_targets(self, client):
        resp = client.get("/api/targets")
        assert resp.status_code == 200
        targets = resp.json()
        assert len(targets) >= 2  # baseline + hardened

    def test_has_baseline_and_hardened(self, client):
        resp = client.get("/api/targets")
        targets = resp.json()
        names = [t["name"] for t in targets]
        assert any("Baseline" in n or "baseline" in n for n in names)
        assert any("Hardened" in n or "hardened" in n for n in names)


class TestRunAPI:
    def test_create_run_returns_202(self, client):
        resp = client.post("/api/runs", json={
            "scenario_ids": ["PI-001"],
            "run_name": "API Test Run",
        })
        assert resp.status_code == 202
        data = resp.json()
        assert "id" in data
        assert data["status"] in ("pending", "running", "completed")

    def test_list_runs(self, client):
        resp = client.get("/api/runs")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_run_not_found(self, client):
        resp = client.get("/api/runs/nonexistent-id-12345")
        assert resp.status_code == 404


class TestDashboardAPI:
    def test_dashboard_returns_stats(self, client):
        resp = client.get("/api/dashboard")
        assert resp.status_code == 200
        data = resp.json()
        assert "total_scenarios" in data
        assert "total_suites" in data
        assert "total_runs" in data
        assert "pass_rate" in data
        assert isinstance(data["recent_runs"], list)
        assert data["total_scenarios"] > 0
        assert data["total_suites"] > 0
