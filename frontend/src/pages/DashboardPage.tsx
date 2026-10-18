import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import type { DashboardStats, Target, TestRun } from "../api/client";
import { PageHeader } from "../components/Layout";
import {
  StatCard, PassRateGauge, StatusBadge, Card, Button, Spinner, ErrorBanner, EmptyState,
} from "../components/ui";
import { colors, font } from "../tokens";

// ─── Quick-run target picker ──────────────────────────────────────────────────

function RunButton({ onRun }: { onRun: (targetId?: string) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [targets, setTargets] = useState<Target[]>([]);
  const [running, setRunning] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Load targets when dropdown opens
  useEffect(() => {
    if (!open) return;
    api.targets.list().then(setTargets).catch(() => setTargets([]));
  }, [open]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const fire = async (targetId?: string) => {
    setOpen(false);
    setRunning(true);
    try { await onRun(targetId); } finally { setRunning(false); }
  };

  const mockTargets = targets.filter(t => t.target_type === "mock");
  const realTargets = targets.filter(t => t.target_type === "openai");

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-flex" }}>
      {/* Main button */}
      <Button
        variant="primary"
        loading={running}
        icon={<span>▶</span>}
        style={{ borderTopRightRadius: 0, borderBottomRightRadius: 0, borderRight: "1px solid #5a4020" }}
        onClick={() => fire()}
      >
        Run Full Assessment
      </Button>
      {/* Caret to open picker */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          background: "#c8a028", border: "none", borderTopRightRadius: 4,
          borderBottomRightRadius: 4, padding: "0 8px",
          cursor: "pointer", color: "#1a1000", fontSize: 10, fontWeight: 700,
        }}
        title="Choose target"
      >
        ▾
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", right: 0, zIndex: 100,
          background: "#1c1410", border: "1px solid #4a3020",
          borderRadius: 6, minWidth: 260, boxShadow: "0 4px 16px rgba(0,0,0,0.6)",
          overflow: "hidden",
        }}>
          <div style={{ padding: "8px 12px", borderBottom: "1px solid #2a1e10", fontSize: font.size.xs, color: colors.textMuted, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Select target to run against
          </div>

          {/* Default (auto-pick mock baseline) */}
          <PickerItem
            label="Default (Mock Baseline)"
            sub="Auto-selects baseline mock target"
            badge="mock"
            badgeColor="#c8a028"
            onClick={() => fire()}
          />

          {mockTargets.length > 0 && (
            <>
              <div style={{ padding: "6px 12px 2px", fontSize: font.size.xs, color: "#5a4a30", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Mock Targets
              </div>
              {mockTargets.map(t => (
                <PickerItem
                  key={t.id}
                  label={t.name}
                  sub={t.is_hardened ? "Hardened — defenses active" : "Baseline — no defenses"}
                  badge={t.is_hardened ? "hardened" : "baseline"}
                  badgeColor={t.is_hardened ? "#4a8a4a" : "#c8a028"}
                  onClick={() => fire(t.id)}
                />
              ))}
            </>
          )}

          {realTargets.length > 0 && (
            <>
              <div style={{ padding: "6px 12px 2px", fontSize: font.size.xs, color: "#5a4a30", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Real API Targets
              </div>
              {realTargets.map(t => (
                <PickerItem
                  key={t.id}
                  label={t.name}
                  sub={String(t.config.model ?? "openai")}
                  badge="real"
                  badgeColor="#3b82d4"
                  onClick={() => fire(t.id)}
                />
              ))}
            </>
          )}

          {targets.length === 0 && (
            <div style={{ padding: "10px 12px", fontSize: font.size.xs, color: colors.textMuted }}>
              Loading…
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PickerItem({ label, sub, badge, badgeColor, onClick }: {
  label: string; sub: string; badge: string; badgeColor: string; onClick: () => void;
}) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: "9px 12px", cursor: "pointer",
        background: hover ? "#261e14" : "transparent",
        display: "flex", alignItems: "center", gap: 10,
        transition: "background 0.1s",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: font.size.sm, color: colors.textPrimary, fontWeight: 500 }}>{label}</div>
        <div style={{ fontSize: font.size.xs, color: colors.textMuted, marginTop: 1 }}>{sub}</div>
      </div>
      <span style={{
        padding: "1px 7px", borderRadius: 3, fontSize: 10,
        fontFamily: font.mono, color: badgeColor,
        background: badgeColor + "18", border: `1px solid ${badgeColor}44`,
        flexShrink: 0,
      }}>
        {badge}
      </span>
    </div>
  );
}

// ─── Dashboard Page ───────────────────────────────────────────────────────────

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

  const runAll = async (targetId?: string) => {
    try {
      const run = await api.runs.create({
        run_name: "Quick Assessment",
        ...(targetId ? { target_id: targetId } : {}),
      });
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
        action={<RunButton onRun={runAll} />}
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
              By default, runs use the built-in mock target (deterministic simulator).
              To test a real AI application, add a target on the{" "}
              <span
                style={{ color: "#c8a028", cursor: "pointer", textDecoration: "underline" }}
                onClick={() => navigate("/targets")}
              >
                Targets page
              </span>{" "}
              and select it from the ▾ dropdown next to this button.
              Synthetic secrets in mock results are FAKE values — no real credentials are ever present.
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
