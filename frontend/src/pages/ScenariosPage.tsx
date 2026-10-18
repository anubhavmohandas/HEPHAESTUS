import React, { useEffect, useState } from "react";
import { api, Scenario } from "../api/client";
import { PageHeader } from "../components/Layout";
import {
  SeverityBadge, CategoryBadge, Card, Button, Input, Select,
  Spinner, ErrorBanner, EmptyState,
} from "../components/ui";
import { colors, font } from "../tokens";

const CATEGORIES = [
  "prompt_injection", "information_leakage", "unauthorized_tool",
  "policy_violation", "malformed_output", "instruction_override",
];
const SEVERITIES = ["critical", "high", "medium", "low", "info"];

export function ScenariosPage() {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [filtered, setFiltered] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [sevFilter, setSevFilter] = useState("");
  const [selected, setSelected] = useState<Scenario | null>(null);

  const load = () => {
    setLoading(true);
    api.scenarios.list()
      .then(data => { setScenarios(data); setFiltered(data); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    let out = scenarios;
    if (search) {
      const q = search.toLowerCase();
      out = out.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.scenario_id.toLowerCase().includes(q) ||
        s.description?.toLowerCase().includes(q)
      );
    }
    if (catFilter) out = out.filter(s => s.category === catFilter);
    if (sevFilter) out = out.filter(s => s.severity === sevFilter);
    setFiltered(out);
  }, [search, catFilter, sevFilter, scenarios]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <PageHeader
        title="Scenarios"
        subtitle={`${scenarios.length} adversarial test scenarios across ${CATEGORIES.length} categories`}
      />

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* List panel */}
        <div style={{
          width: selected ? 400 : "100%",
          borderRight: selected ? `1px solid #2a1e10` : "none",
          display: "flex", flexDirection: "column",
          transition: "width 0.2s",
          overflow: "hidden",
        }}>
          {/* Filters */}
          <div style={{
            padding: "14px 20px",
            borderBottom: "1px solid #2a1e10",
            display: "flex", gap: 8, flexWrap: "wrap",
          }}>
            <Input
              placeholder="Search scenarios…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ flex: 1, minWidth: 180 }}
            />
            <Select value={catFilter} onChange={e => setCatFilter(e.target.value)}>
              <option value="">All categories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c.replace(/_/g, " ")}</option>)}
            </Select>
            <Select value={sevFilter} onChange={e => setSevFilter(e.target.value)}>
              <option value="">All severities</option>
              {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
            </Select>
            {(search || catFilter || sevFilter) && (
              <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setCatFilter(""); setSevFilter(""); }}>
                Clear
              </Button>
            )}
          </div>

          {/* Results count */}
          <div style={{ padding: "8px 20px 4px", fontSize: font.size.xs, color: colors.textMuted }}>
            {filtered.length} of {scenarios.length} scenarios
          </div>

          {/* Scenario list */}
          <div style={{ flex: 1, overflowY: "auto", padding: "4px 12px 16px" }}>
            {loading && <div style={{ padding: 32, display: "flex", justifyContent: "center" }}><Spinner /></div>}
            {error && <ErrorBanner message={error} />}
            {!loading && filtered.length === 0 && (
              <EmptyState title="No scenarios match" message="Try adjusting filters" />
            )}
            {filtered.map(s => (
              <ScenarioRow
                key={s.id}
                scenario={s}
                isSelected={selected?.id === s.id}
                onClick={() => setSelected(selected?.id === s.id ? null : s)}
              />
            ))}
          </div>
        </div>

        {/* Detail panel */}
        {selected && (
          <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
            <ScenarioDetail scenario={selected} onClose={() => setSelected(null)} />
          </div>
        )}
      </div>
    </div>
  );
}

function ScenarioRow({
  scenario, isSelected, onClick,
}: { scenario: Scenario; isSelected: boolean; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        padding: "10px 10px",
        borderRadius: 5,
        cursor: "pointer",
        marginBottom: 2,
        background: isSelected ? "#221a0e" : "transparent",
        borderLeft: `2px solid ${isSelected ? "#c8a028" : "transparent"}`,
        transition: "background 0.1s",
      }}
      onMouseEnter={e => !isSelected && (e.currentTarget.style.background = "#1a1408")}
      onMouseLeave={e => !isSelected && (e.currentTarget.style.background = "transparent")}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, flexWrap: "wrap" }}>
          <span style={{
            fontFamily: font.mono, fontSize: font.size.xs,
            color: colors.amber, fontWeight: 600, flexShrink: 0,
          }}>
            {scenario.scenario_id}
          </span>
          <SeverityBadge severity={scenario.severity} />
          {!scenario.is_builtin && (
            <span style={{ fontSize: font.size.xs, color: "#7a5520", fontStyle: "italic" }}>custom</span>
          )}
        </div>
        <div style={{ fontSize: font.size.sm, color: colors.textPrimary, fontWeight: 500, marginBottom: 2 }}>
          {scenario.name}
        </div>
        <CategoryBadge category={scenario.category} />
      </div>
    </div>
  );
}

function ScenarioDetail({ scenario, onClose }: { scenario: Scenario; onClose: () => void }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontFamily: font.mono, fontSize: font.size.sm, color: colors.amber, fontWeight: 700 }}>
            {scenario.scenario_id}
          </span>
          <SeverityBadge severity={scenario.severity} />
          <CategoryBadge category={scenario.category} />
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>✕ Close</Button>
      </div>

      <h2 style={{ fontSize: font.size.xl, fontWeight: 700, color: colors.textSecondary, marginBottom: 16 }}>
        {scenario.name}
      </h2>

      {scenario.technique && (
        <DetailField label="Technique">
          <code style={{ fontFamily: font.mono, fontSize: font.size.xs, color: colors.copper }}>
            {scenario.technique}
          </code>
        </DetailField>
      )}

      {scenario.description && (
        <DetailField label="Description">
          <p style={{ color: colors.textPrimary, fontSize: font.size.sm, lineHeight: 1.7 }}>{scenario.description}</p>
        </DetailField>
      )}

      {scenario.expected_behavior && (
        <DetailField label="Expected Behavior (Secure System)">
          <p style={{ color: "#80c080", fontSize: font.size.sm, lineHeight: 1.7 }}>{scenario.expected_behavior}</p>
        </DetailField>
      )}

      {scenario.payload && (
        <DetailField label="Attack Payload">
          <pre style={{
            fontFamily: font.mono, fontSize: font.size.xs,
            color: "#e8a050",
            background: "#0f0e0c",
            border: "1px solid #2a1e10",
            borderRadius: 4,
            padding: "12px 14px",
            whiteSpace: "pre-wrap",
            wordBreak: "break-all",
            lineHeight: 1.6,
          }}>
            {scenario.payload}
          </pre>
        </DetailField>
      )}

      {scenario.tags && scenario.tags.length > 0 && (
        <DetailField label="Tags">
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {scenario.tags.map(t => (
              <span key={t} style={{
                padding: "2px 8px", borderRadius: 3,
                background: "#1a1408", border: "1px solid #3a2e18",
                color: "#9a8a60", fontSize: font.size.xs, fontFamily: font.mono,
              }}>{t}</span>
            ))}
          </div>
        </DetailField>
      )}
    </div>
  );
}

function DetailField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{
        fontSize: font.size.xs, color: colors.textMuted,
        textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6,
        fontWeight: 600,
      }}>
        {label}
      </div>
      {children}
    </div>
  );
}
