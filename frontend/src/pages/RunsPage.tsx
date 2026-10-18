import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import type { TestRun, RunDetail, TestResult } from "../api/client";
import { PageHeader } from "../components/Layout";
import {
  StatusBadge, SeverityBadge, CategoryBadge, Card, Button,
  PassRateGauge, Spinner, ErrorBanner, EmptyState,
} from "../components/ui";
import { colors, font } from "../tokens";

// ─── Runs List Page ───────────────────────────────────────────────────────────

export function RunsPage() {
  const [runs, setRuns] = useState<TestRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const load = () => {
    setLoading(true);
    api.runs.list()
      .then(setRuns)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const deleteRun = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this run and all its results?")) return;
    try {
      await api.runs.delete(id);
      setRuns(prev => prev.filter(r => r.id !== id));
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <PageHeader
        title="Test Runs"
        subtitle="History of all security assessment executions"
        action={
          <Button variant="secondary" size="sm" onClick={load}>⟳ Refresh</Button>
        }
      />

      <div style={{ flex: 1, overflowY: "auto", padding: "20px 28px" }}>
        {error && <ErrorBanner message={error} />}
        {loading && <div style={{ display: "flex", justifyContent: "center", padding: 60 }}><Spinner size={32} /></div>}
        {!loading && runs.length === 0 && (
          <EmptyState icon="▶" title="No runs yet" message="Start a run from the Dashboard, Suites, or Targets page." />
        )}

        {runs.map(run => (
          <RunListItem
            key={run.id}
            run={run}
            onClick={() => navigate(`/runs/${run.id}`)}
            onDelete={(e) => deleteRun(run.id, e)}
          />
        ))}
      </div>
    </div>
  );
}

function RunListItem({
  run, onClick, onDelete,
}: { run: TestRun; onClick: () => void; onDelete: (e: React.MouseEvent) => void }) {
  const passRate = run.status === "completed" && run.total_scenarios > 0
    ? Math.round(run.passed / Math.max(run.total_scenarios - run.skipped - run.errors, 1) * 100)
    : null;

  const durationStr = run.duration_ms != null
    ? run.duration_ms < 1000
      ? `${run.duration_ms}ms`
      : `${(run.duration_ms / 1000).toFixed(1)}s`
    : null;

  return (
    <div
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "14px 16px",
        marginBottom: 6,
        background: "#1c1410",
        border: "1px solid #3a2e20",
        borderRadius: 6,
        cursor: "pointer",
        transition: "border-color 0.12s, background 0.12s",
      }}
      onMouseEnter={e => { e.currentTarget.style.background = "#221a10"; e.currentTarget.style.borderColor = "#4a3a28"; }}
      onMouseLeave={e => { e.currentTarget.style.background = "#1c1410"; e.currentTarget.style.borderColor = "#3a2e20"; }}
    >
      <StatusBadge status={run.status} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: font.size.sm, fontWeight: 600, color: colors.textPrimary, marginBottom: 2 }}>
          {run.run_name ?? `Run ${run.id.slice(0, 8)}`}
        </div>
        <div style={{ fontSize: font.size.xs, color: colors.textMuted }}>
          {[
            run.suite_name && `Suite: ${run.suite_name}`,
            run.target_name && `Target: ${run.target_name}`,
            run.created_at && new Date(run.created_at).toLocaleString(),
          ].filter(Boolean).join(" · ")}
        </div>
      </div>

      {/* Result counters */}
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        {run.status === "completed" && (
          <>
            <Pill color="#4a8a4a" border="#2d5a2d">{run.passed} PASS</Pill>
            {run.failed > 0 && <Pill color="#c04040" border="#5a2020">{run.failed} FAIL</Pill>}
            {run.errors > 0 && <Pill color="#a08030" border="#5a4a20">{run.errors} ERR</Pill>}
          </>
        )}
        {passRate !== null && (
          <span style={{
            fontSize: font.size.sm, fontWeight: 700,
            color: passRate >= 80 ? "#4a8a4a" : passRate >= 50 ? "#c8a028" : "#c04040",
            minWidth: 42, textAlign: "right",
          }}>
            {passRate}%
          </span>
        )}
        {durationStr && (
          <span style={{ fontSize: font.size.xs, color: colors.textDim }}>{durationStr}</span>
        )}
        <Button
          variant="ghost" size="sm"
          onClick={onDelete}
          style={{ color: "#5a3030", fontSize: 12 }}
        >
          ✕
        </Button>
      </div>
    </div>
  );
}

function Pill({ children, color, border }: { children: React.ReactNode; color: string; border: string }) {
  return (
    <span style={{
      padding: "1px 7px", borderRadius: 3, fontSize: font.size.xs,
      fontFamily: font.mono, fontWeight: 600,
      color, border: `1px solid ${border}`,
      background: `${border}33`,
    }}>
      {children}
    </span>
  );
}

// ─── Run Detail Page ──────────────────────────────────────────────────────────

export function RunDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [run, setRun] = useState<RunDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "passed" | "failed" | "error">("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const navigate = useNavigate();

  const load = () => {
    if (!id) return;
    api.runs.get(id)
      .then(data => {
        setRun(data);
        // Stop polling once complete
        if (["completed", "failed", "cancelled"].includes(data.status)) {
          if (pollRef.current) clearInterval(pollRef.current);
        }
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // Poll for in-progress runs
    pollRef.current = setInterval(() => {
      if (run && ["completed", "failed"].includes(run.status)) {
        if (pollRef.current) clearInterval(pollRef.current);
        return;
      }
      load();
    }, 2000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [id]);


  const downloadJson = () => {
    if (!id) return;
    window.open(api.reports.jsonUrl(id), "_blank");
  };

  const downloadHtml = () => {
    if (!id) return;
    window.open(api.reports.htmlUrl(id), "_blank");
  };

  const filtered = run?.results.filter(r => filter === "all" || r.status === filter) ?? [];

  const passRate = run && run.total_scenarios > 0
    ? Math.round(run.passed / Math.max(run.total_scenarios - run.skipped - run.errors, 1) * 100)
    : 0;

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", padding: 80 }}><Spinner size={36} /></div>
  );
  if (error) return (
    <div style={{ padding: 32 }}><ErrorBanner message={error} /></div>
  );
  if (!run) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <PageHeader
        breadcrumb="Test Runs"
        title={run.run_name ?? `Run ${run.id.slice(0, 12)}`}
        subtitle={[
          run.suite_name && `Suite: ${run.suite_name}`,
          run.target_name && `Target: ${run.target_name}`,
          run.started_at && `Started: ${new Date(run.started_at).toLocaleString()}`,
        ].filter(Boolean).join(" · ")}
        action={
          <div style={{ display: "flex", gap: 8 }}>
            <Button variant="ghost" size="sm" onClick={() => navigate("/runs")}>← Back</Button>
            {run.status === "completed" && (
              <>
                <Button variant="secondary" size="sm" onClick={downloadJson} icon={<span>↓</span>}>JSON</Button>
                <Button variant="secondary" size="sm" onClick={downloadHtml} icon={<span>↓</span>}>HTML</Button>
              </>
            )}
          </div>
        }
      />

      <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
        {/* Summary row */}
        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 16, marginBottom: 24 }}>
          <Card style={{ padding: "20px 28px", display: "flex", alignItems: "center" }}>
            <PassRateGauge rate={passRate} />
          </Card>

          <Card style={{ padding: "20px 24px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
              {[
                { label: "Total", value: run.total_scenarios, color: colors.textPrimary },
                { label: "Passed", value: run.passed, color: "#4a8a4a" },
                { label: "Failed", value: run.failed, color: "#c04040" },
                { label: "Errors", value: run.errors, color: "#a08030" },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color }}>{value}</div>
                  <div style={{ fontSize: font.size.xs, color: colors.textMuted, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
                </div>
              ))}
            </div>

            {run.status !== "completed" && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: colors.textMuted, fontSize: font.size.sm }}>
                <Spinner size={14} />
                <span>Run is {run.status}… refreshing automatically</span>
              </div>
            )}

            {run.duration_ms != null && (
              <div style={{ fontSize: font.size.xs, color: colors.textDim }}>
                Duration: {run.duration_ms < 1000 ? `${run.duration_ms}ms` : `${(run.duration_ms / 1000).toFixed(1)}s`}
              </div>
            )}
          </Card>
        </div>

        {/* Filter tabs */}
        <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
          {(["all", "failed", "passed", "error"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: "5px 14px",
                borderRadius: 4,
                border: `1px solid ${filter === f ? "#c8a028" : "#3a2e20"}`,
                background: filter === f ? "#1a1408" : "transparent",
                color: filter === f ? "#e8c050" : "#7a6a50",
                fontSize: font.size.xs,
                fontFamily: "inherit",
                fontWeight: filter === f ? 600 : 400,
                cursor: "pointer",
                textTransform: "capitalize",
                letterSpacing: "0.06em",
              }}
            >
              {f === "all" ? `All (${run.results.length})` : `${f} (${run.results.filter(r => r.status === f).length})`}
            </button>
          ))}
        </div>

        {/* Results list */}
        {filtered.length === 0 && (
          <EmptyState title="No results" message="Run may still be executing or no results match the filter." />
        )}

        {filtered.map(result => (
          <ResultRow
            key={result.id}
            result={result}
            isExpanded={expanded === result.id}
            onToggle={() => setExpanded(expanded === result.id ? null : result.id)}
          />
        ))}
      </div>
    </div>
  );
}

function ResultRow({
  result, isExpanded, onToggle,
}: { result: TestResult; isExpanded: boolean; onToggle: () => void }) {
  const policyViolations = (result.evidence as any)?.policy_inspection?.violations ?? [];

  return (
    <div style={{
      marginBottom: 6,
      background: "#1c1410",
      border: `1px solid ${isExpanded ? "#5a4020" : "#3a2e20"}`,
      borderRadius: 6,
      overflow: "hidden",
    }}>
      {/* Row header */}
      <div
        onClick={onToggle}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "11px 14px",
          cursor: "pointer",
          background: isExpanded ? "#221a10" : "transparent",
          transition: "background 0.1s",
        }}
      >
        <StatusBadge status={result.status} />
        {result.severity && <SeverityBadge severity={result.severity} />}
        <span style={{
          fontFamily: font.mono, fontSize: font.size.xs,
          color: colors.amber, fontWeight: 600, minWidth: 60, flexShrink: 0,
        }}>
          {result.scenario_id}
        </span>
        <span style={{ fontSize: font.size.sm, color: colors.textPrimary, fontWeight: 500, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {result.scenario_name}
        </span>
        {result.category && <CategoryBadge category={result.category} />}
        {policyViolations.length > 0 && (
          <span style={{
            fontSize: font.size.xs, color: "#e07070",
            background: "#2a0d0d", border: "1px solid #5a2020",
            borderRadius: 3, padding: "1px 6px", fontFamily: font.mono,
          }}>
            {policyViolations.length} policy
          </span>
        )}
        <span style={{ fontSize: font.size.xs, color: colors.textDim, marginLeft: 4 }}>
          {isExpanded ? "▲" : "▼"}
        </span>
      </div>

      {/* Expanded detail */}
      {isExpanded && (
        <div style={{ padding: "16px 16px 20px", borderTop: "1px solid #2a1e10" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 14 }}>
            <EvidenceField label="Expected Behavior">
              <p style={{ color: "#80c080", fontSize: font.size.xs, lineHeight: 1.7 }}>
                {result.expected_behavior ?? "—"}
              </p>
            </EvidenceField>
            <EvidenceField label="Observed Behavior">
              <p style={{ color: result.status === "passed" ? "#80c080" : "#cf7f7f", fontSize: font.size.xs, lineHeight: 1.7 }}>
                {result.observed_behavior ?? "—"}
              </p>
            </EvidenceField>
          </div>

          {result.payload && (
            <EvidenceField label="Attack Payload">
              <pre style={{ fontFamily: font.mono, fontSize: font.size.xs, color: "#e8a050", background: "#0f0e0c", border: "1px solid #2a1e10", borderRadius: 4, padding: "10px 12px", whiteSpace: "pre-wrap", wordBreak: "break-all", lineHeight: 1.6, maxHeight: 200, overflow: "auto" }}>
                {result.payload}
              </pre>
            </EvidenceField>
          )}

          {result.response_text && (
            <EvidenceField label="AI Response">
              <pre style={{ fontFamily: font.mono, fontSize: font.size.xs, color: "#d4c4a0", background: "#0f0e0c", border: "1px solid #2a1e10", borderRadius: 4, padding: "10px 12px", whiteSpace: "pre-wrap", wordBreak: "break-all", lineHeight: 1.6, maxHeight: 200, overflow: "auto" }}>
                {result.response_text}
              </pre>
            </EvidenceField>
          )}

          {result.error_message && (
            <EvidenceField label="Execution Error">
              <p style={{ color: "#cfaf6f", fontSize: font.size.xs, fontFamily: font.mono }}>{result.error_message}</p>
            </EvidenceField>
          )}

          {policyViolations.length > 0 && (
            <EvidenceField label={`Policy Violations (${policyViolations.length})`}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {policyViolations.map((v: any, i: number) => (
                  <div key={i} style={{ display: "flex", gap: 8, alignItems: "baseline", fontSize: font.size.xs }}>
                    <span style={{ fontFamily: font.mono, color: colors.amber }}>{v.policy_id}</span>
                    <span style={{ color: colors.textMuted }}>{v.policy_name}</span>
                    <span style={{ color: v.severity === "critical" ? "#c04040" : v.severity === "high" ? "#c07030" : "#b0b030" }}>
                      [{v.severity}]
                    </span>
                  </div>
                ))}
              </div>
            </EvidenceField>
          )}

          <EvidenceField label="Evidence (Raw JSON)">
            <pre style={{ fontFamily: font.mono, fontSize: 10, color: "#7a6a50", background: "#0a0908", border: "1px solid #1e1810", borderRadius: 4, padding: "10px 12px", whiteSpace: "pre-wrap", wordBreak: "break-all", lineHeight: 1.5, maxHeight: 240, overflow: "auto" }}>
              {JSON.stringify(result.evidence, null, 2)}
            </pre>
          </EvidenceField>

          {result.duration_ms != null && (
            <div style={{ marginTop: 10, fontSize: font.size.xs, color: colors.textDim }}>
              Executed in {result.duration_ms}ms
              {result.executed_at && ` · ${new Date(result.executed_at).toLocaleString()}`}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EvidenceField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{
        fontSize: font.size.xs, color: colors.textMuted,
        textTransform: "uppercase", letterSpacing: "0.08em",
        fontWeight: 600, marginBottom: 5,
      }}>
        {label}
      </div>
      {children}
    </div>
  );
}
