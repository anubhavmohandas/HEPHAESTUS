import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, Target } from "../api/client";
import { PageHeader } from "../components/Layout";
import { Card, Button, Spinner, ErrorBanner, EmptyState, Toast } from "../components/ui";
import { colors, font } from "../tokens";

export function TargetsPage() {
  const [targets, setTargets] = useState<Target[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const navigate = useNavigate();

  const load = () => {
    setLoading(true);
    api.targets.list()
      .then(setTargets)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const runAgainstTarget = async (target: Target, suiteType: "full" | "critical") => {
    setRunning(target.id + suiteType);
    try {
      // Find the right suite
      const suites = await api.suites.list();
      const suiteName = suiteType === "full" ? "Full Security Assessment" : "Critical Severity Only";
      const suite = suites.find(s => s.name === suiteName);

      const run = await api.runs.create({
        target_id: target.id,
        suite_id: suite?.id,
        run_name: `${suiteName} — ${target.name} — ${new Date().toLocaleTimeString()}`,
      });
      showToast(`Run started`, "success");
      navigate(`/runs/${run.id}`);
    } catch (e: any) {
      showToast(e.message, "error");
    } finally {
      setRunning(null);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <PageHeader
        title="Targets"
        subtitle="AI application targets for security assessment"
      />

      {toast && <Toast message={toast.msg} type={toast.type} />}

      <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
        {error && <ErrorBanner message={error} />}
        {loading && <div style={{ display: "flex", justifyContent: "center", padding: 60 }}><Spinner size={32} /></div>}
        {!loading && targets.length === 0 && <EmptyState icon="⊛" title="No targets configured" />}

        {/* Comparison hint */}
        {targets.length >= 2 && (
          <div style={{
            padding: "12px 16px", marginBottom: 20,
            background: "#0f0d08", border: "1px solid #3a2a14",
            borderRadius: 6, fontSize: font.size.xs, color: "#7a6a40",
            lineHeight: 1.7,
          }}>
            <strong style={{ color: "#c8a028" }}>Baseline vs. Hardened comparison:</strong>{" "}
            Run the same suite against both targets to measure the security improvement from defensive controls.
            Higher pass rate on hardened = controls are working.
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(400px, 1fr))", gap: 16 }}>
          {targets.map(target => (
            <TargetCard
              key={target.id}
              target={target}
              running={running}
              onRunFull={() => runAgainstTarget(target, "full")}
              onRunCritical={() => runAgainstTarget(target, "critical")}
            />
          ))}
        </div>

        {/* Info section */}
        <div style={{ marginTop: 32, padding: "20px 24px", background: "#0f0c08", border: "1px solid #2a1e10", borderRadius: 6 }}>
          <div style={{ fontSize: font.size.xs, color: colors.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
            About the Mock Target
          </div>
          <div style={{ fontSize: font.size.sm, color: colors.textMuted, lineHeight: 1.8 }}>
            <p style={{ marginBottom: 8 }}>
              The <strong style={{ color: colors.amber }}>Mock Baseline</strong> target simulates
              a vulnerable AI application with no defensive controls. Most attacks succeed here —
              this is intentional, to demonstrate realistic vulnerability patterns.
            </p>
            <p style={{ marginBottom: 8 }}>
              The <strong style={{ color: "#4a8a4a" }}>Mock Hardened</strong> target simulates
              the same application with defensive controls applied. Most attacks are blocked,
              demonstrating effective security controls.
            </p>
            <p>
              <strong style={{ color: colors.crimsonLight }}>Important:</strong>{" "}
              Both targets are deterministic rule-based simulators. They do not use real AI APIs.
              All credentials visible in test results are <strong>SYNTHETIC fake values</strong> —
              not real credentials.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function TargetCard({
  target, running, onRunFull, onRunCritical,
}: {
  target: Target;
  running: string | null;
  onRunFull: () => void;
  onRunCritical: () => void;
}) {
  const isHardened = target.is_hardened;
  const accentColor = isHardened ? "#4a8a4a" : "#c8a028";
  const accentBorder = isHardened ? "#2d5a2d" : "#7a5520";
  const accentBg = isHardened ? "#0d1a0d" : "#1a1408";

  return (
    <div style={{
      background: "#1c1410",
      border: `1px solid ${accentBorder}`,
      borderTop: `3px solid ${accentColor}`,
      borderRadius: 6,
      padding: "20px 22px",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: font.size.md, fontWeight: 700, color: accentColor, marginBottom: 3 }}>
            {target.name}
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <span style={{
              padding: "1px 8px", borderRadius: 3, fontSize: font.size.xs,
              fontFamily: font.mono, color: accentColor,
              background: accentBg, border: `1px solid ${accentBorder}`,
            }}>
              {target.target_type}
            </span>
            <span style={{
              padding: "1px 8px", borderRadius: 3, fontSize: font.size.xs,
              fontFamily: font.mono,
              color: isHardened ? "#7fcf7f" : "#cfcf7f",
              background: isHardened ? "#0d1a0d" : "#1a1a0d",
              border: `1px solid ${isHardened ? "#2d5a2d" : "#5a5a2d"}`,
            }}>
              {isHardened ? "🛡 hardened" : "⚠ baseline"}
            </span>
          </div>
        </div>
      </div>

      {target.description && (
        <p style={{ fontSize: font.size.xs, color: colors.textMuted, lineHeight: 1.6, marginBottom: 16 }}>
          {target.description}
        </p>
      )}

      {/* Config preview */}
      <div style={{
        background: "#0f0e0c", border: "1px solid #2a1e10", borderRadius: 4,
        padding: "8px 12px", marginBottom: 16,
        fontFamily: font.mono, fontSize: font.size.xs, color: "#7a6a50",
      }}>
        {Object.entries(target.config).map(([k, v]) => (
          <div key={k}>
            <span style={{ color: colors.amber }}>{k}</span>
            <span style={{ color: "#4a3a28" }}>: </span>
            <span style={{ color: "#9a8a60" }}>{String(v)}</span>
          </div>
        ))}
        {Object.keys(target.config).length === 0 && (
          <span style={{ color: "#3a2e20" }}>// default configuration</span>
        )}
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <Button
          variant="primary" size="sm"
          onClick={onRunFull}
          loading={running === target.id + "full"}
          icon={<span>▶</span>}
          style={{ flex: 1, justifyContent: "center" }}
        >
          Full Assessment
        </Button>
        <Button
          variant="secondary" size="sm"
          onClick={onRunCritical}
          loading={running === target.id + "critical"}
          icon={<span>◈</span>}
        >
          Critical Only
        </Button>
      </div>
    </div>
  );
}
