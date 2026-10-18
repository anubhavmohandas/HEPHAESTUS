import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import type { DashboardStats, TestRun } from "../api/client";
import { PageHeader } from "../components/Layout";
import {
  StatCard, PassRateGauge, StatusBadge, Card, Button, Spinner, ErrorBanner, EmptyState,
} from "../components/ui";
import { colors, font } from "../tokens";

export function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const load = () => {
    setLoading(true);
    api.dashboard()
      .then(setStats)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const runAll = async () => {
    try {
      const run = await api.runs.create({ run_name: "Quick Assessment" });
      navigate(`/runs/${run.id}`);
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <PageHeader
        title="Security Dashboard"
        subtitle="Overview of AI security posture across all test runs"
        action={
          <Button variant="primary" onClick={runAll} icon={<span>▶</span>}>
            Run Full Assessment
          </Button>
        }
      />

      <div style={{ padding: "28px 32px", flex: 1, overflowY: "auto" }}>
        {error && <ErrorBanner message={error} />}
        {loading && !stats && (
          <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
            <Spinner size={32} />
          </div>
        )}

        {stats && (
          <>
            {/* Top stats row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 28 }}>
              <StatCard
                label="Scenarios"
                value={stats.total_scenarios}
                accent={colors.textSecondary}
              />
              <StatCard
                label="Test Suites"
                value={stats.total_suites}
                accent={colors.copper}
              />
              <StatCard
                label="Total Runs"
                value={stats.total_runs}
                accent={colors.textPrimary}
              />
              <StatCard
                label="Last Run"
                value={stats.last_run_at
                  ? new Date(stats.last_run_at).toLocaleDateString()
                  : "—"}
                sub={stats.last_run_at
                  ? new Date(stats.last_run_at).toLocaleTimeString()
                  : undefined}
                accent={colors.textMuted}
              />
            </div>

            {/* Pass rate + breakdowns */}
            <div style={{ display: "grid", gridTemplateColumns: "auto 1fr 1fr", gap: 14, marginBottom: 28 }}>
              {/* Pass rate gauge */}
              <Card style={{ padding: "24px 32px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <PassRateGauge rate={stats.pass_rate} />
              </Card>

              {/* Category breakdown */}
              <Card style={{ padding: "20px 24px" }}>
                <div style={{ fontSize: font.size.xs, color: colors.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>
                  Failed by Category
                </div>
                {Object.keys(stats.category_breakdown).length === 0 ? (
                  <div style={{ color: colors.textDim, fontSize: font.size.sm }}>No failures recorded yet</div>
                ) : (
                  Object.entries(stats.category_breakdown).map(([cat, count]) => (
                    <BreakdownBar key={cat} label={cat.replace(/_/g, " ")} count={count}
                      max={Math.max(...Object.values(stats.category_breakdown))}
                      color="#8b2020" />
                  ))
                )}
              </Card>

              {/* Severity breakdown */}
              <Card style={{ padding: "20px 24px" }}>
                <div style={{ fontSize: font.size.xs, color: colors.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>
                  Failed by Severity
                </div>
                {Object.keys(stats.severity_breakdown).length === 0 ? (
                  <div style={{ color: colors.textDim, fontSize: font.size.sm }}>No failures recorded yet</div>
                ) : (
                  Object.entries(stats.severity_breakdown).map(([sev, count]) => (
                    <BreakdownBar key={sev} label={sev} count={count}
                      max={Math.max(...Object.values(stats.severity_breakdown))}
                      color={sev === "critical" ? "#c03030" : sev === "high" ? "#c07030" : "#b0b030"} />
                  ))
                )}
              </Card>
            </div>

            {/* Recent runs */}
            <Card style={{ padding: "20px 24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div style={{ fontSize: font.size.xs, color: colors.textMuted, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Recent Runs
                </div>
                <Button variant="ghost" size="sm" onClick={() => navigate("/runs")}>
                  View all →
                </Button>
              </div>

              {stats.recent_runs.length === 0 ? (
                <EmptyState title="No runs yet" message="Click 'Run Full Assessment' to start your first security evaluation." />
              ) : (
                <div>
                  {stats.recent_runs.map(run => (
                    <RunRow key={run.id} run={run} onClick={() => navigate(`/runs/${run.id}`)} />
                  ))}
                </div>
              )}
            </Card>

            {/* Disclaimer */}
            <div style={{
              marginTop: 20,
              padding: "12px 16px",
              background: "#0f0d08",
              border: "1px solid #3a2a14",
              borderRadius: 6,
              fontSize: font.size.xs,
              color: "#5a4a30",
              lineHeight: 1.7,
            }}>
              <strong style={{ color: "#7a6a40" }}>⚠ Scope &amp; Limitations:</strong>{" "}
              Results shown are from the built-in mock target and demonstrate simulated AI behavior.
              They do not certify the security of any real AI application.
              Synthetic secrets used in tests are FAKE values — no real credentials are ever present.
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function BreakdownBar({ label, count, max, color }: { label: string; count: number; max: number; color: string }) {
  const pct = max > 0 ? (count / max) * 100 : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
      <span style={{ width: 160, fontSize: font.size.xs, color: colors.textMuted, textTransform: "capitalize", flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 10, background: "#1c1410", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 2, transition: "width 0.5s ease" }} />
      </div>
      <span style={{ fontSize: font.size.xs, color: colors.textDim, width: 22, textAlign: "right", flexShrink: 0 }}>{count}</span>
    </div>
  );
}

function RunRow({ run, onClick }: { run: TestRun; onClick: () => void }) {
  const passRate = run.total_scenarios > 0
    ? Math.round((run.passed / (run.total_scenarios - run.skipped - run.errors || 1)) * 100)
    : 0;

  return (
    <div
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 12px",
        borderRadius: 5,
        cursor: "pointer",
        marginBottom: 2,
        transition: "background 0.12s",
      }}
      onMouseEnter={e => (e.currentTarget.style.background = "#221a10")}
      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
    >
      <StatusBadge status={run.status} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: font.size.sm, color: colors.textPrimary, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {run.run_name ?? run.id.slice(0, 12) + "…"}
        </div>
        <div style={{ fontSize: font.size.xs, color: colors.textMuted }}>
          {run.suite_name ?? "Ad-hoc"} · {run.target_name ?? "Default"}
        </div>
      </div>
      <div style={{ fontSize: font.size.xs, color: colors.textMuted, textAlign: "right", flexShrink: 0 }}>
        <div style={{ color: passRate >= 80 ? "#4a8a4a" : passRate >= 50 ? "#c8a028" : "#c04040", fontWeight: 600 }}>
          {run.status === "completed" ? `${passRate}%` : "—"}
        </div>
        <div>{run.total_scenarios} tests</div>
      </div>
    </div>
  );
}
