"""
Report generators — JSON and self-contained HTML.
"""
from __future__ import annotations
import json
from datetime import datetime, timezone
from typing import Any, Dict

from app.models.models import TestRun


def generate_json_report(run: TestRun, include_evidence: bool = True) -> Dict[str, Any]:
    """Generate a complete JSON report for a test run."""
    results = []
    for r in run.results:
        entry = {
            "id": r.id,
            "scenario_id": r.scenario_id,
            "scenario_name": r.scenario_name,
            "category": r.category,
            "severity": r.severity,
            "status": r.status,
            "payload": r.payload,
            "response_text": r.response_text,
            "expected_behavior": r.expected_behavior,
            "observed_behavior": r.observed_behavior,
            "error_message": r.error_message,
            "duration_ms": r.duration_ms,
            "executed_at": r.executed_at.isoformat() if r.executed_at else None,
        }
        if include_evidence:
            entry["evidence"] = r.evidence
            entry["target_config_snapshot"] = r.target_config_snapshot
        results.append(entry)

    passed = sum(1 for r in run.results if r.status == "passed")
    failed = sum(1 for r in run.results if r.status == "failed")
    errors = sum(1 for r in run.results if r.status == "error")
    skipped = sum(1 for r in run.results if r.status == "skipped")
    total = len(run.results)
    executable = total - skipped - errors
    pass_rate = round(passed / executable * 100, 1) if executable > 0 else 0.0

    return {
        "report_type": "HEPHAESTUS Security Assessment",
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "run": {
            "id": run.id,
            "name": run.run_name,
            "status": run.status,
            "suite": run.suite.name if run.suite else None,
            "target": run.target.name if run.target else None,
            "started_at": run.started_at.isoformat() if run.started_at else None,
            "completed_at": run.completed_at.isoformat() if run.completed_at else None,
            "duration_ms": run.duration_ms,
        },
        "summary": {
            "total": total,
            "passed": passed,
            "failed": failed,
            "errors": errors,
            "skipped": skipped,
            "pass_rate": pass_rate,
        },
        "disclaimer": (
            "IMPORTANT: Results from the mock target are simulated for demonstration "
            "purposes only. They do not certify the security of any real AI application. "
            "Synthetic secrets in this report are FAKE test values and not real credentials."
        ),
        "results": results,
    }


def generate_html_report(run: TestRun) -> str:
    """Generate a fully self-contained HTML security assessment report."""
    data = generate_json_report(run, include_evidence=True)
    summary = data["summary"]
    run_info = data["run"]

    pass_rate = summary["pass_rate"]
    pass_color = "#6b2d2d" if pass_rate < 50 else "#7a5c1e" if pass_rate < 80 else "#2d5a2d"

    def badge(status: str) -> str:
        colors = {
            "passed": ("background:#1e3a1e;color:#7fcf7f;border:1px solid #2d5a2d", "PASS"),
            "failed": ("background:#3a1e1e;color:#cf7f7f;border:1px solid #5a2d2d", "FAIL"),
            "error": ("background:#3a2e1e;color:#cf9f5f;border:1px solid #5a4a2d", "ERR"),
            "skipped": ("background:#2e2e2e;color:#888;border:1px solid #444", "SKIP"),
        }
        style, label = colors.get(status, ("background:#333;color:#ccc", status.upper()))
        return f'<span style="padding:2px 8px;border-radius:3px;font-size:11px;font-family:monospace;font-weight:bold;{style}">{label}</span>'

    def sev_badge(severity: str) -> str:
        colors = {
            "critical": "background:#5a1e1e;color:#ff9090;border:1px solid #8b3030",
            "high": "background:#4a2e1e;color:#ffaa70;border:1px solid #7a4a2d",
            "medium": "background:#3a3a1e;color:#ffd060;border:1px solid #6a6a2d",
            "low": "background:#1e3a3a;color:#70cccc;border:1px solid #2d6a6a",
            "info": "background:#2a2a2a;color:#aaa;border:1px solid #444",
        }
        style = colors.get(severity.lower(), "background:#333;color:#aaa")
        return f'<span style="padding:2px 8px;border-radius:3px;font-size:11px;font-family:monospace;{style}">{severity.upper()}</span>'

    # Build results rows
    rows_html = ""
    for r in data["results"]:
        evidence_json = json.dumps(r.get("evidence", {}), indent=2)
        rows_html += f"""
        <details style="margin:12px 0;background:#1c1410;border:1px solid #3a2e20;border-radius:6px;overflow:hidden;">
          <summary style="padding:12px 16px;cursor:pointer;display:flex;align-items:center;gap:10px;list-style:none;background:#221a10;">
            {badge(r['status'])}
            {sev_badge(r.get('severity','info'))}
            <span style="font-family:monospace;color:#c8a96e;font-size:12px;min-width:70px;">{r.get('scenario_id','')}</span>
            <span style="color:#e8d5b0;font-weight:600;">{r.get('scenario_name','')}</span>
            <span style="margin-left:auto;color:#7a6a50;font-size:11px;">{r.get('category','').replace('_',' ').title()}</span>
          </summary>
          <div style="padding:16px;border-top:1px solid #3a2e20;">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:12px;">
              <div>
                <div style="color:#7a6a50;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">Expected Behavior</div>
                <div style="color:#c8b090;font-size:13px;">{r.get('expected_behavior','')}</div>
              </div>
              <div>
                <div style="color:#7a6a50;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">Observed Behavior</div>
                <div style="color:#c8b090;font-size:13px;">{r.get('observed_behavior','')}</div>
              </div>
            </div>
            {"<div style='background:#0f0e0c;border:1px solid #3a2e20;border-radius:4px;padding:10px;margin-bottom:10px;'><div style='color:#7a6a50;font-size:11px;text-transform:uppercase;margin-bottom:6px;'>Payload</div><pre style='color:#e8a050;font-size:11px;margin:0;white-space:pre-wrap;word-break:break-all;'>" + str(r.get('payload',''))[:500] + "</pre></div>" if r.get('payload') else ""}
            {"<div style='background:#0f0e0c;border:1px solid #3a2e20;border-radius:4px;padding:10px;margin-bottom:10px;'><div style='color:#7a6a50;font-size:11px;text-transform:uppercase;margin-bottom:6px;'>AI Response</div><pre style='color:#d4c4a0;font-size:11px;margin:0;white-space:pre-wrap;word-break:break-all;'>" + str(r.get('response_text',''))[:800] + "</pre></div>" if r.get('response_text') else ""}
            <details style="margin-top:8px;">
              <summary style="color:#7a6a50;font-size:11px;cursor:pointer;text-transform:uppercase;letter-spacing:0.05em;">Evidence (JSON)</summary>
              <pre style="background:#0f0e0c;border:1px solid #2a2010;border-radius:4px;padding:10px;margin-top:8px;font-size:10px;color:#a09070;overflow-x:auto;white-space:pre-wrap;">{evidence_json[:3000]}</pre>
            </details>
          </div>
        </details>"""

    # Category breakdown
    from collections import Counter
    cats = Counter(r.get("category", "unknown") for r in data["results"])
    cat_bars = ""
    for cat, count in sorted(cats.items()):
        cat_bars += f"""
        <div style="display:flex;align-items:center;gap:8px;margin:4px 0;">
          <span style="width:200px;font-size:12px;color:#a09070;">{cat.replace('_',' ').title()}</span>
          <div style="flex:1;background:#1c1410;border-radius:2px;height:14px;overflow:hidden;">
            <div style="height:100%;background:#8b4513;width:{min(count/len(data['results'])*100,100):.0f}%;"></div>
          </div>
          <span style="font-size:11px;color:#7a6a50;width:30px;text-align:right;">{count}</span>
        </div>"""

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>HEPHAESTUS Security Report — {run_info.get('name', run.id)}</title>
<style>
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{ background: #0d0a07; color: #e8d5b0; font-family: -apple-system, "Segoe UI", system-ui, sans-serif; font-size: 14px; line-height: 1.6; }}
  .container {{ max-width: 1000px; margin: 0 auto; padding: 32px 24px; }}
  details > summary::-webkit-details-marker {{ display: none; }}
</style>
</head>
<body>
<div class="container">
  <!-- Header -->
  <div style="border-bottom:2px solid #5a3820;padding-bottom:24px;margin-bottom:32px;">
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
      <span style="font-size:28px;">⚒</span>
      <div>
        <h1 style="font-size:22px;font-weight:700;color:#e8c88a;letter-spacing:0.05em;">HEPHAESTUS</h1>
        <div style="font-size:12px;color:#7a6a50;letter-spacing:0.1em;text-transform:uppercase;">AI Security Testing &amp; Resilience Lab</div>
      </div>
    </div>
    <h2 style="font-size:16px;color:#c8a96e;margin-top:8px;">{run_info.get('name', 'Security Assessment Report')}</h2>
    <div style="margin-top:8px;font-size:12px;color:#7a6a50;">
      Generated: {data['generated_at']} &nbsp;|&nbsp; Run ID: {run_info['id'][:16]}...
      {f"&nbsp;|&nbsp; Suite: {run_info.get('suite','')}" if run_info.get('suite') else ""}
      {f"&nbsp;|&nbsp; Target: {run_info.get('target','')}" if run_info.get('target') else ""}
    </div>
  </div>

  <!-- Disclaimer -->
  <div style="background:#1a1207;border:1px solid #7a5520;border-radius:6px;padding:12px 16px;margin-bottom:28px;">
    <span style="color:#e8a050;font-weight:600;font-size:12px;">⚠ SCOPE &amp; LIMITATIONS</span>
    <p style="color:#a09070;font-size:12px;margin-top:4px;">{data['disclaimer']}</p>
  </div>

  <!-- Summary Cards -->
  <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-bottom:28px;">
    <div style="background:#1c1410;border:1px solid #3a2e20;border-radius:6px;padding:16px;text-align:center;">
      <div style="font-size:28px;font-weight:700;color:#e8d5b0;">{summary['total']}</div>
      <div style="font-size:11px;color:#7a6a50;text-transform:uppercase;letter-spacing:0.05em;">Total</div>
    </div>
    <div style="background:#1a2a1a;border:1px solid #2d5a2d;border-radius:6px;padding:16px;text-align:center;">
      <div style="font-size:28px;font-weight:700;color:#7fcf7f;">{summary['passed']}</div>
      <div style="font-size:11px;color:#4a8a4a;text-transform:uppercase;letter-spacing:0.05em;">Passed</div>
    </div>
    <div style="background:#2a1a1a;border:1px solid #5a2d2d;border-radius:6px;padding:16px;text-align:center;">
      <div style="font-size:28px;font-weight:700;color:#cf7f7f;">{summary['failed']}</div>
      <div style="font-size:11px;color:#8a4a4a;text-transform:uppercase;letter-spacing:0.05em;">Failed</div>
    </div>
    <div style="background:#2a2a1a;border:1px solid #5a5a2d;border-radius:6px;padding:16px;text-align:center;">
      <div style="font-size:28px;font-weight:700;color:#cfcf7f;">{summary['errors']}</div>
      <div style="font-size:11px;color:#7a7a4a;text-transform:uppercase;letter-spacing:0.05em;">Errors</div>
    </div>
    <div style="background:#1c1410;border:1px solid #5a4020;border-radius:6px;padding:16px;text-align:center;">
      <div style="font-size:28px;font-weight:700;color:{pass_color.replace('#', '#')};">{pass_rate}%</div>
      <div style="font-size:11px;color:#7a6a50;text-transform:uppercase;letter-spacing:0.05em;">Pass Rate</div>
    </div>
  </div>

  <!-- Category Breakdown -->
  <div style="background:#1c1410;border:1px solid #3a2e20;border-radius:6px;padding:20px;margin-bottom:28px;">
    <h3 style="font-size:13px;color:#c8a96e;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:16px;">Category Distribution</h3>
    {cat_bars}
  </div>

  <!-- Results -->
  <div>
    <h3 style="font-size:13px;color:#c8a96e;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:16px;">Test Results</h3>
    {rows_html}
  </div>

  <!-- Footer -->
  <div style="margin-top:40px;padding-top:16px;border-top:1px solid #2a1e10;text-align:center;color:#5a4a30;font-size:11px;">
    Made with ⚒ HEPHAESTUS — AI Security Testing &amp; Resilience Lab
  </div>
</div>
</body>
</html>"""
