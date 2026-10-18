import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, Suite, SuiteDetail, Target } from "../api/client";
import { PageHeader } from "../components/Layout";
import {
  Card, Button, Spinner, ErrorBanner, EmptyState, SeverityBadge, CategoryBadge, Toast,
} from "../components/ui";
import { colors, font } from "../tokens";

export function SuitesPage() {
  const [suites, setSuites] = useState<Suite[]>([]);
  const [selected, setSelected] = useState<SuiteDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [targets, setTargets] = useState<Target[]>([]);
  const [runningFor, setRunningFor] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" | "info" } | null>(null);
  const navigate = useNavigate();

  const load = () => {
    setLoading(true);
    Promise.all([api.suites.list(), api.targets.list()])
      .then(([s, t]) => { setSuites(s); setTargets(t); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const showToast = (msg: string, type: "success" | "error" | "info" = "info") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const selectSuite = (s: Suite) => {
    setDetailLoading(true);
    api.suites.get(s.id)
      .then(setSelected)
      .catch(e => setError(e.message))
      .finally(() => setDetailLoading(false));
  };

  const runSuite = async (suite: Suite, targetId?: string) => {
    setRunningFor(suite.id);
    try {
      const run = await api.runs.create({
        suite_id: suite.id,
        target_id: targetId,
        run_name: `${suite.name} — ${new Date().toLocaleTimeString()}`,
      });
      showToast(`Run started: ${run.id.slice(0, 8)}…`, "success");
      navigate(`/runs/${run.id}`);
    } catch (e: any) {
      showToast(e.message, "error");
    } finally {
      setRunningFor(null);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <PageHeader
        title="Test Suites"
        subtitle="Grouped scenario collections for targeted security assessments"
      />

      {toast && <Toast message={toast.msg} type={toast.type} />}

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Suite list */}
        <div style={{
          width: selected ? 340 : "100%",
          borderRight: selected ? "1px solid #2a1e10" : "none",
          overflowY: "auto",
          padding: "16px 12px",
          transition: "width 0.2s",
        }}>
          {loading && <div style={{ display: "flex", justifyContent: "center", padding: 32 }}><Spinner /></div>}
          {error && <ErrorBanner message={error} />}
          {!loading && suites.length === 0 && <EmptyState title="No suites found" />}

          {suites.map(suite => (
            <SuiteCard
              key={suite.id}
              suite={suite}
              isSelected={selected?.id === suite.id}
              onClick={() => selectSuite(suite)}
              onRun={(targetId) => runSuite(suite, targetId)}
              targets={targets}
              running={runningFor === suite.id}
            />
          ))}
        </div>

        {/* Detail panel */}
        {selected && (
          <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
            {detailLoading ? (
              <div style={{ display: "flex", justifyContent: "center", padding: 60 }}><Spinner /></div>
            ) : (
              <SuiteDetailPanel
                detail={selected}
                onClose={() => setSelected(null)}
                onRun={(targetId) => runSuite(selected, targetId)}
                targets={targets}
                running={runningFor === selected.id}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SuiteCard({
  suite, isSelected, onClick, onRun, targets, running,
}: {
  suite: Suite;
  isSelected: boolean;
  onClick: () => void;
  onRun: (targetId?: string) => void;
  targets: Target[];
  running: boolean;
}) {
  const [targetId, setTargetId] = useState(targets[0]?.id ?? "");

  return (
    <div
      onClick={onClick}
      style={{
        padding: "14px",
        borderRadius: 6,
        marginBottom: 6,
        cursor: "pointer",
        background: isSelected ? "#221a0e" : "#1c1410",
        border: `1px solid ${isSelected ? "#7a5520" : "#3a2e20"}`,
        borderLeft: `3px solid ${isSelected ? "#c8a028" : "#3a2e20"}`,
        transition: "all 0.12s",
      }}
      onMouseEnter={e => !isSelected && (e.currentTarget.style.borderColor = "#4a3a28")}
      onMouseLeave={e => !isSelected && (e.currentTarget.style.borderColor = "#3a2e20")}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
        <div style={{ fontSize: font.size.md, fontWeight: 600, color: colors.textSecondary }}>
          {suite.name}
        </div>
        {suite.is_builtin && (
          <span style={{ fontSize: font.size.xs, color: "#5a4a30", fontStyle: "italic" }}>built-in</span>
        )}
      </div>

      {suite.description && (
        <div style={{ fontSize: font.size.xs, color: colors.textMuted, marginBottom: 10, lineHeight: 1.5 }}>
          {suite.description}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "space-between" }}>
        <span style={{
          fontSize: font.size.xs, color: colors.amber,
          background: "#1a1408", border: "1px solid #3a2a10",
          borderRadius: 3, padding: "1px 7px",
          fontFamily: font.mono,
        }}>
          {suite.scenario_count} scenarios
        </span>

        <div style={{ display: "flex", gap: 6 }} onClick={e => e.stopPropagation()}>
          <select
            value={targetId}
            onChange={e => setTargetId(e.target.value)}
            style={{
              padding: "3px 6px", background: "#120f08", border: "1px solid #3a2e20",
              borderRadius: 3, color: "#a09070", fontSize: font.size.xs, fontFamily: "inherit",
            }}
          >
            {targets.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <Button
            variant="primary" size="sm"
            onClick={() => onRun(targetId)}
            loading={running}
            icon={<span>▶</span>}
          >
            Run
          </Button>
        </div>
      </div>
    </div>
  );
}

function SuiteDetailPanel({
  detail, onClose, onRun, targets, running,
}: {
  detail: SuiteDetail;
  onClose: () => void;
  onRun: (targetId?: string) => void;
  targets: Target[];
  running: boolean;
}) {
  const [targetId, setTargetId] = useState(targets[0]?.id ?? "");

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ fontSize: font.size.xl, fontWeight: 700, color: colors.textSecondary }}>{detail.name}</h2>
        <Button variant="ghost" size="sm" onClick={onClose}>✕ Close</Button>
      </div>

      {detail.description && (
        <p style={{ fontSize: font.size.sm, color: colors.textMuted, marginBottom: 20, lineHeight: 1.6 }}>
          {detail.description}
        </p>
      )}

      <div style={{ display: "flex", gap: 8, marginBottom: 24, alignItems: "center" }}>
        <select
          value={targetId}
          onChange={e => setTargetId(e.target.value)}
          style={{
            padding: "7px 10px", background: "#120f08", border: "1px solid #3a2e20",
            borderRadius: 4, color: "#c8a96e", fontSize: font.size.sm, fontFamily: "inherit",
          }}
        >
          {targets.map(t => (
            <option key={t.id} value={t.id}>{t.name} {t.is_hardened ? "(hardened)" : "(baseline)"}</option>
          ))}
        </select>
        <Button variant="primary" onClick={() => onRun(targetId)} loading={running} icon={<span>▶</span>}>
          Run Suite
        </Button>
      </div>

      <div style={{ fontSize: font.size.xs, color: colors.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
        {detail.scenarios.length} Scenarios
      </div>

      <div>
        {detail.scenarios.map(s => (
          <div key={s.id} style={{
            display: "flex", gap: 10, alignItems: "flex-start",
            padding: "10px 12px", marginBottom: 4,
            background: "#1c1410", border: "1px solid #3a2e20", borderRadius: 5,
          }}>
            <span style={{ fontFamily: font.mono, fontSize: font.size.xs, color: colors.amber, fontWeight: 600, minWidth: 60, flexShrink: 0 }}>
              {s.scenario_id}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: font.size.sm, color: colors.textPrimary, fontWeight: 500, marginBottom: 3 }}>{s.name}</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <SeverityBadge severity={s.severity} />
                <CategoryBadge category={s.category} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
