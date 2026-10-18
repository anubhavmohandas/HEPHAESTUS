import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import type { Target } from "../api/client";
import { PageHeader } from "../components/Layout";
import { Button, Spinner, ErrorBanner, EmptyState, Toast } from "../components/ui";
import { colors, font } from "../tokens";

// ─── Mode toggle: which target to actually run against ────────────────────────
// "mock"  → always use the Mock Baseline / Hardened targets
// "real"  → use a real OpenAI-compatible target (must be configured first)

type RunMode = "mock" | "real";

// ─── Add Real Target Form ─────────────────────────────────────────────────────

type AddTargetFormState = {
  name: string;
  description: string;
  api_key: string;
  model: string;
  base_url: string;
  system_prompt: string;
  max_tokens: string;
  temperature: string;
};

const INITIAL_FORM: AddTargetFormState = {
  name: "",
  description: "",
  api_key: "",
  model: "gpt-4o-mini",
  base_url: "https://api.openai.com/v1",
  system_prompt: "",
  max_tokens: "512",
  temperature: "0.0",
};

function AddTargetModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState<AddTargetFormState>(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const set = (field: keyof AddTargetFormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [field]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setFormError("Name is required."); return; }
    if (!form.api_key.trim()) { setFormError("API key is required."); return; }
    if (!form.model.trim()) { setFormError("Model name is required."); return; }
    setFormError(null);
    setSaving(true);
    try {
      await api.targets.create({
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        target_type: "openai",
        is_hardened: false,
        config: {
          api_key: form.api_key.trim(),
          model: form.model.trim(),
          base_url: form.base_url.trim() || "https://api.openai.com/v1",
          ...(form.system_prompt.trim() ? { system_prompt: form.system_prompt.trim() } : {}),
          max_tokens: parseInt(form.max_tokens) || 512,
          temperature: parseFloat(form.temperature) || 0.0,
        },
      });
      onCreated();
      onClose();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    width: "100%",
    background: "#0f0e0c",
    border: "1px solid #3a2e1e",
    borderRadius: 4,
    padding: "7px 10px",
    color: colors.text,
    fontSize: font.size.sm,
    fontFamily: font.mono,
    outline: "none",
    boxSizing: "border-box" as const,
  };
  const labelStyle = {
    display: "block",
    fontSize: font.size.xs,
    color: colors.textMuted,
    marginBottom: 5,
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
  };
  const fieldStyle = { marginBottom: 14 };

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(0,0,0,0.75)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: "#1c1410", border: "1px solid #4a3020",
        borderTop: "3px solid #3b82d4",
        borderRadius: 8, padding: "28px 30px",
        width: "100%", maxWidth: 520,
        maxHeight: "90vh", overflowY: "auto",
      }}>
        <div style={{ fontSize: font.size.md, fontWeight: 700, color: "#3b82d4", marginBottom: 4 }}>
          Add Real AI Target
        </div>
        <div style={{ fontSize: font.size.xs, color: colors.textMuted, marginBottom: 20 }}>
          OpenAI, Azure OpenAI, Ollama, LM Studio — any compatible endpoint.
        </div>

        <form onSubmit={submit}>
          <div style={fieldStyle}>
            <label style={labelStyle}>Name *</label>
            <input style={inputStyle} value={form.name} onChange={set("name")} placeholder="My GPT-4o Target" />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Description</label>
            <input style={inputStyle} value={form.description} onChange={set("description")} placeholder="Optional description" />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>API Key *</label>
            <input
              style={inputStyle} type="password"
              value={form.api_key} onChange={set("api_key")}
              placeholder="sk-..."
              autoComplete="off"
            />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Model *</label>
            <input style={inputStyle} value={form.model} onChange={set("model")} placeholder="gpt-4o-mini" />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Base URL</label>
            <input style={inputStyle} value={form.base_url} onChange={set("base_url")} placeholder="https://api.openai.com/v1" />
            <div style={{ fontSize: font.size.xs, color: "#5a5040", marginTop: 4 }}>
              Change for Azure, Ollama (<code>http://localhost:11434/v1</code>), or LM Studio.
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
            <div>
              <label style={labelStyle}>Max Tokens</label>
              <input style={inputStyle} value={form.max_tokens} onChange={set("max_tokens")} placeholder="512" />
            </div>
            <div>
              <label style={labelStyle}>Temperature</label>
              <input style={inputStyle} value={form.temperature} onChange={set("temperature")} placeholder="0.0" />
            </div>
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>System Prompt (optional)</label>
            <textarea
              style={{ ...inputStyle, height: 80, resize: "vertical" }}
              value={form.system_prompt}
              onChange={set("system_prompt")}
              placeholder="Leave blank to test default model behavior with no system prompt."
            />
          </div>

          {formError && (
            <div style={{ fontSize: font.size.sm, color: "#e05050", marginBottom: 12 }}>
              {formError}
            </div>
          )}

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Button variant="secondary" size="sm" onClick={onClose} type="button">
              Cancel
            </Button>
            <Button variant="primary" size="sm" loading={saving} type="submit">
              Add Target
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Mode Toggle pill ─────────────────────────────────────────────────────────

function ModeToggle({
  mode,
  onChange,
  hasReal,
}: {
  mode: RunMode;
  onChange: (m: RunMode) => void;
  hasReal: boolean;
}) {
  const pill = (m: RunMode, label: string, activeColor: string, disabled?: boolean) => (
    <button
      key={m}
      disabled={disabled}
      onClick={() => !disabled && onChange(m)}
      title={disabled ? 'No real API target configured yet — click "Add Real Target" above.' : undefined}
      style={{
        padding: "4px 14px",
        borderRadius: 3,
        border: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        fontFamily: font.mono,
        fontSize: font.size.xs,
        fontWeight: 600,
        letterSpacing: "0.04em",
        transition: "background 0.1s, color 0.1s",
        background: mode === m ? activeColor : "transparent",
        color: mode === m ? "#fff" : disabled ? "#3a3028" : "#7a6a50",
        opacity: disabled ? 0.45 : 1,
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{
      display: "inline-flex",
      background: "#12100c",
      border: "1px solid #3a2e1e",
      borderRadius: 5,
      padding: 2,
      gap: 0,
    }}>
      {pill("mock", "⚙ Mock", "#7a5520")}
      {pill("real", "🌐 Real API", "#1a4a8a", !hasReal)}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function TargetsPage() {
  const [targets, setTargets] = useState<Target[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  // Global run-mode toggle: mock or real
  const [runMode, setRunMode] = useState<RunMode>("mock");
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

  // Derived: split targets by type
  const mockTargets = targets.filter(t => t.target_type === "mock");
  const realTargets = targets.filter(t => t.target_type === "openai");
  const hasReal = realTargets.length > 0;

  // Active targets depend on mode
  const activeTargets = runMode === "mock" ? mockTargets : realTargets;

  const runAgainstTarget = async (target: Target, suiteType: "full" | "critical") => {
    setRunning(target.id + suiteType);
    try {
      const suites = await api.suites.list();
      const suiteName = suiteType === "full" ? "Full Security Assessment" : "Critical Severity Only";
      const suite = suites.find(s => s.name === suiteName);

      const modeLabel = runMode === "real" ? "Real API" : "Mock";
      const run = await api.runs.create({
        target_id: target.id,
        suite_id: suite?.id,
        run_name: `[${modeLabel}] ${suiteName} — ${target.name} — ${new Date().toLocaleTimeString()}`,
      });
      showToast(`Run started (${modeLabel})`, "success");
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
        action={
          <Button variant="primary" size="sm" icon={<span>+</span>} onClick={() => setShowAddForm(true)}>
            Add Real Target
          </Button>
        }
      />

      {toast && <Toast message={toast.msg} type={toast.type} />}
      {showAddForm && (
        <AddTargetModal
          onClose={() => setShowAddForm(false)}
          onCreated={() => { load(); showToast("Target added!", "success"); }}
        />
      )}

      <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
        {error && <ErrorBanner message={error} />}
        {loading && <div style={{ display: "flex", justifyContent: "center", padding: 60 }}><Spinner size={32} /></div>}
        {!loading && targets.length === 0 && <EmptyState icon="⊛" title="No targets configured" />}

        {!loading && targets.length > 0 && (
          <>
            {/* ── Mode toggle bar ── */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              padding: "12px 16px",
              marginBottom: 20,
              background: "#0f0d08",
              border: "1px solid #3a2a14",
              borderRadius: 6,
            }}>
              <span style={{ fontSize: font.size.xs, color: colors.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", flexShrink: 0 }}>
                Run against:
              </span>

              <ModeToggle mode={runMode} onChange={m => setRunMode(m)} hasReal={hasReal} />

              <span style={{ fontSize: font.size.xs, color: "#5a4a30", lineHeight: 1.5 }}>
                {runMode === "mock"
                  ? "Using built-in deterministic mock simulator — no external API calls, instant results."
                  : `Using real API targets (${realTargets.length} configured) — actual LLM responses, may take longer.`
                }
              </span>

              {runMode === "real" && !hasReal && (
                <span style={{ fontSize: font.size.xs, color: "#c05050", marginLeft: "auto", flexShrink: 0 }}>
                  ⚠ No real targets yet
                </span>
              )}
            </div>

            {/* ── Target grid ── */}
            {activeTargets.length === 0 ? (
              <div style={{
                padding: "32px 24px", textAlign: "center",
                border: "1px dashed #3a2a14", borderRadius: 6,
                color: colors.textMuted, fontSize: font.size.sm,
              }}>
                {runMode === "real"
                  ? <>No real API targets configured yet. Click <strong style={{ color: "#3b82d4" }}>Add Real Target</strong> to add one.</>
                  : "No mock targets found."
                }
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(400px, 1fr))", gap: 16 }}>
                {activeTargets.map(target => (
                  <TargetCard
                    key={target.id}
                    target={target}
                    runMode={runMode}
                    running={running}
                    onRunFull={() => runAgainstTarget(target, "full")}
                    onRunCritical={() => runAgainstTarget(target, "critical")}
                  />
                ))}
              </div>
            )}

            {/* Comparison hint — only in mock mode with 2+ targets */}
            {runMode === "mock" && mockTargets.length >= 2 && (
              <div style={{
                padding: "12px 16px", marginTop: 16,
                background: "#0f0d08", border: "1px solid #3a2a14",
                borderRadius: 6, fontSize: font.size.xs, color: "#7a6a40",
                lineHeight: 1.7,
              }}>
                <strong style={{ color: "#c8a028" }}>Baseline vs. Hardened comparison:</strong>{" "}
                Run the same suite against both targets to measure the security improvement from defensive controls.
                Higher pass rate on hardened = controls are working.
              </div>
            )}
          </>
        )}

        {/* Info section */}
        <div style={{ marginTop: 32, padding: "20px 24px", background: "#0f0c08", border: "1px solid #2a1e10", borderRadius: 6 }}>
          <div style={{ fontSize: font.size.xs, color: colors.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
            About Targets &amp; Modes
          </div>
          <div style={{ fontSize: font.size.sm, color: colors.textMuted, lineHeight: 1.8 }}>
            <p style={{ marginBottom: 8 }}>
              <strong style={{ color: colors.amber }}>⚙ Mock Mode</strong> uses the built-in deterministic
              simulator — no API keys, no cost, instant. Great for understanding attack patterns and
              verifying the tool itself works.
            </p>
            <p style={{ marginBottom: 8 }}>
              <strong style={{ color: "#3b82d4" }}>🌐 Real API Mode</strong> sends actual attack payloads
              to a real LLM (OpenAI, Ollama, etc.). Results reflect the true behavior of that model.
              Switch to this mode to assess your own AI application.
            </p>
            <p>
              <strong style={{ color: colors.crimsonLight }}>Note:</strong>{" "}
              Synthetic secrets visible in mock test results are <strong>FAKE values</strong> —
              not real credentials. Real API keys are masked in all reports.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Target Card ──────────────────────────────────────────────────────────────

function TargetCard({
  target, runMode, running, onRunFull, onRunCritical,
}: {
  target: Target;
  runMode: RunMode;
  running: string | null;
  onRunFull: () => void;
  onRunCritical: () => void;
}) {
  const isHardened = target.is_hardened;
  const isReal = target.target_type === "openai";

  const accentColor = isReal ? "#3b82d4" : isHardened ? "#4a8a4a" : "#c8a028";
  const accentBorder = isReal ? "#1a3a6a" : isHardened ? "#2d5a2d" : "#7a5520";
  const accentBg    = isReal ? "#0d1220" : isHardened ? "#0d1a0d" : "#1a1408";

  // Mask api_key in config display
  const displayConfig: Record<string, string> = {};
  for (const [k, v] of Object.entries(target.config)) {
    if (k === "api_key") {
      const s = String(v);
      displayConfig[k] = s.length > 6
        ? `${s.slice(0, 6)}${"*".repeat(Math.max(0, s.length - 6))}`
        : "***";
    } else {
      displayConfig[k] = String(v);
    }
  }

  const modeLabel = runMode === "real" ? "Real API" : "Mock";

  return (
    <div style={{
      background: "#1c1410",
      border: `1px solid ${accentBorder}`,
      borderTop: `3px solid ${accentColor}`,
      borderRadius: 6,
      padding: "20px 22px",
    }}>
      {/* Header */}
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
              color: isReal ? "#7fa8cf" : isHardened ? "#7fcf7f" : "#cfcf7f",
              background: isReal ? "#0d1220" : isHardened ? "#0d1a0d" : "#1a1a0d",
              border: `1px solid ${isReal ? "#1a3a6a" : isHardened ? "#2d5a2d" : "#5a5a2d"}`,
            }}>
              {isReal ? "🌐 real api" : isHardened ? "🛡 hardened" : "⚠ baseline"}
            </span>
            {/* Current run-mode indicator */}
            <span style={{
              padding: "1px 8px", borderRadius: 3, fontSize: font.size.xs,
              fontFamily: font.mono,
              color: runMode === "real" ? "#3b82d4" : "#c8a028",
              background: runMode === "real" ? "#0d1220" : "#1a1408",
              border: `1px solid ${runMode === "real" ? "#1a3a6a" : "#5a3a10"}`,
            }}>
              {runMode === "real" ? "🌐 live" : "⚙ sim"}
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
        {Object.entries(displayConfig).map(([k, v]) => (
          <div key={k}>
            <span style={{ color: accentColor }}>{k}</span>
            <span style={{ color: "#4a3a28" }}>: </span>
            <span style={{ color: "#9a8a60" }}>{v}</span>
          </div>
        ))}
        {Object.keys(displayConfig).length === 0 && (
          <span style={{ color: "#3a2e20" }}>// default configuration</span>
        )}
      </div>

      {/* Run buttons — show which mode */}
      <div style={{ display: "flex", gap: 8 }}>
        <Button
          variant="primary" size="sm"
          onClick={onRunFull}
          loading={running === target.id + "full"}
          icon={<span>▶</span>}
          style={{ flex: 1, justifyContent: "center" }}
        >
          Full [{modeLabel}]
        </Button>
        <Button
          variant="secondary" size="sm"
          onClick={onRunCritical}
          loading={running === target.id + "critical"}
          icon={<span>◈</span>}
        >
          Critical [{modeLabel}]
        </Button>
      </div>
    </div>
  );
}
