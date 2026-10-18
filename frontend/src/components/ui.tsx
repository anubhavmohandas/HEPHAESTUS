/**
 * Shared UI primitives — all styled with the forge palette.
 */
import React from "react";
import { colors, font, radius } from "../tokens";

// ─── Badge: severity ────────────────────────────────────────────────────────

type Severity = "critical" | "high" | "medium" | "low" | "info";
export function SeverityBadge({ severity }: { severity: string }) {
  const s = (severity?.toLowerCase() ?? "info") as Severity;
  const map = colors.severity;
  const tok = map[s] ?? map.info;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "2px 8px",
      borderRadius: radius.sm,
      background: tok.bg,
      border: `1px solid ${tok.border}`,
      color: tok.text,
      fontSize: font.size.xs,
      fontFamily: font.mono,
      fontWeight: 600,
      letterSpacing: "0.05em",
      textTransform: "uppercase",
    }}>
      <span style={{
        width: 5, height: 5, borderRadius: "50%",
        background: tok.dot, flexShrink: 0,
      }} />
      {s}
    </span>
  );
}

// ─── Badge: status ───────────────────────────────────────────────────────────

type Status = "passed" | "failed" | "error" | "skipped" | "pending" | "running";
export function StatusBadge({ status }: { status: string }) {
  const s = (status?.toLowerCase() ?? "pending") as Status;
  const map = colors.status;
  const tok = map[s] ?? map.pending;
  const labels: Record<Status, string> = {
    passed: "PASS", failed: "FAIL", error: "ERR",
    skipped: "SKIP", pending: "PENDING", running: "RUNNING",
  };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "2px 8px",
      borderRadius: radius.sm,
      background: tok.bg,
      border: `1px solid ${tok.border}`,
      color: tok.text,
      fontSize: font.size.xs,
      fontFamily: font.mono,
      fontWeight: 700,
      letterSpacing: "0.06em",
    }}>
      {s === "running" && (
        <span className="spinning" style={{ display: "inline-block", fontSize: 9 }}>◌</span>
      )}
      {s === "pending" && (
        <span className="pulsing" style={{ display: "inline-block", fontSize: 9 }}>◦</span>
      )}
      {s !== "running" && s !== "pending" && (
        <span style={{ width: 5, height: 5, borderRadius: "50%", background: tok.dot, flexShrink: 0 }} />
      )}
      {labels[s] ?? s.toUpperCase()}
    </span>
  );
}

// ─── Category badge ───────────────────────────────────────────────────────────

const categoryColors: Record<string, { bg: string; border: string; text: string }> = {
  prompt_injection:    { bg: "#1a0d0d", border: "#5a2020", text: "#d08080" },
  information_leakage: { bg: "#1a1408", border: "#5a4020", text: "#d0a060" },
  unauthorized_tool:   { bg: "#0d1a0d", border: "#205a20", text: "#80c080" },
  policy_violation:    { bg: "#100d18", border: "#302040", text: "#9080c0" },
  malformed_output:    { bg: "#0d1818", border: "#205050", text: "#60b0b0" },
  instruction_override:{ bg: "#1a0a0a", border: "#6a1010", text: "#e06060" },
};

export function CategoryBadge({ category }: { category: string }) {
  const tok = categoryColors[category] ?? { bg: "#141210", border: "#3a3530", text: "#909090" };
  const label = category?.replace(/_/g, " ") ?? "unknown";
  return (
    <span style={{
      padding: "2px 8px",
      borderRadius: radius.sm,
      background: tok.bg,
      border: `1px solid ${tok.border}`,
      color: tok.text,
      fontSize: font.size.xs,
      fontFamily: font.mono,
      letterSpacing: "0.04em",
      textTransform: "capitalize",
    }}>
      {label}
    </span>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

interface CardProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
  onClick?: () => void;
  hoverable?: boolean;
}

export function Card({ children, style, onClick, hoverable }: CardProps) {
  const [hovered, setHovered] = React.useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => hoverable && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? colors.bgHover : colors.bgCard,
        border: `1px solid ${hovered ? colors.borderLight : colors.border}`,
        borderRadius: radius.md,
        transition: "background 0.15s, border-color 0.15s",
        cursor: onClick ? "pointer" : "default",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────

export function SectionHeader({ title, subtitle, action }: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
      <div>
        <h2 style={{
          fontSize: font.size.lg,
          fontWeight: 700,
          color: colors.textSecondary,
          letterSpacing: "0.02em",
        }}>
          {title}
        </h2>
        {subtitle && (
          <p style={{ fontSize: font.size.sm, color: colors.textMuted, marginTop: 2 }}>
            {subtitle}
          </p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

// ─── Button ───────────────────────────────────────────────────────────────────

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: React.ReactNode;
}

export function Button({
  variant = "secondary",
  size = "md",
  loading,
  icon,
  children,
  disabled,
  style,
  ...props
}: ButtonProps) {
  const varStyles: Record<ButtonVariant, React.CSSProperties> = {
    primary: {
      background: "#c8a028",
      color: "#0d0a07",
      border: "1px solid #a88020",
      fontWeight: 700,
    },
    secondary: {
      background: "#1c1410",
      color: "#c8a96e",
      border: `1px solid #3a2e20`,
    },
    danger: {
      background: "#2a0d0d",
      color: "#e07070",
      border: "1px solid #6b2020",
    },
    ghost: {
      background: "transparent",
      color: "#c8a96e",
      border: "1px solid transparent",
    },
  };

  const sizeStyles: Record<string, React.CSSProperties> = {
    sm: { padding: "4px 10px", fontSize: font.size.sm },
    md: { padding: "7px 16px", fontSize: font.size.base },
    lg: { padding: "10px 22px", fontSize: font.size.md },
  };

  return (
    <button
      disabled={disabled || loading}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        borderRadius: radius.sm,
        cursor: disabled || loading ? "not-allowed" : "pointer",
        opacity: disabled || loading ? 0.55 : 1,
        transition: "opacity 0.15s, background 0.15s",
        fontFamily: "inherit",
        fontWeight: 500,
        lineHeight: 1,
        whiteSpace: "nowrap",
        ...varStyles[variant],
        ...sizeStyles[size],
        ...style,
      }}
      {...props}
    >
      {loading ? <span className="spinning">◌</span> : icon}
      {children}
    </button>
  );
}

// ─── Input ────────────────────────────────────────────────────────────────────

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      style={{
        width: "100%",
        padding: "8px 12px",
        background: "#120f08",
        border: `1px solid #3a2e20`,
        borderRadius: radius.sm,
        color: "#e8d5b0",
        fontSize: font.size.base,
        fontFamily: "inherit",
        outline: "none",
        transition: "border-color 0.15s",
        ...props.style,
      }}
      onFocus={e => { e.target.style.borderColor = "#c8a028"; }}
      onBlur={e => { e.target.style.borderColor = "#3a2e20"; }}
    />
  );
}

// ─── Select ───────────────────────────────────────────────────────────────────

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      style={{
        padding: "8px 12px",
        background: "#120f08",
        border: `1px solid #3a2e20`,
        borderRadius: radius.sm,
        color: "#e8d5b0",
        fontSize: font.size.base,
        fontFamily: "inherit",
        outline: "none",
        cursor: "pointer",
        ...props.style,
      }}
    />
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

export function StatCard({ label, value, sub, accent }: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  accent?: string;
}) {
  return (
    <Card style={{ padding: "20px 24px" }}>
      <div style={{ fontSize: 28, fontWeight: 700, color: accent ?? colors.textPrimary, lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: font.size.xs, color: colors.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 6 }}>
        {label}
      </div>
      {sub && <div style={{ fontSize: font.size.xs, color: colors.textDim, marginTop: 4 }}>{sub}</div>}
    </Card>
  );
}

// ─── Pass-rate gauge ─────────────────────────────────────────────────────────

export function PassRateGauge({ rate }: { rate: number }) {
  const color = rate >= 80 ? "#4a8a4a" : rate >= 50 ? "#c8a028" : "#c04040";
  const strokeW = 8;
  const r = 36;
  const circ = 2 * Math.PI * r;
  const fill = (rate / 100) * circ;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <svg width={96} height={96} viewBox="0 0 96 96">
        <circle cx={48} cy={48} r={r} fill="none" stroke="#2a1e10" strokeWidth={strokeW} />
        <circle
          cx={48} cy={48} r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeW}
          strokeDasharray={`${fill} ${circ - fill}`}
          strokeLinecap="round"
          transform="rotate(-90 48 48)"
          style={{ transition: "stroke-dasharray 0.6s ease" }}
        />
        <text x={48} y={48} textAnchor="middle" dominantBaseline="central"
          fill={color} fontSize={16} fontWeight={700} fontFamily="-apple-system, sans-serif">
          {rate}%
        </text>
      </svg>
      <span style={{ fontSize: font.size.xs, color: colors.textMuted, textTransform: "uppercase", letterSpacing: "0.08em" }}>
        Pass Rate
      </span>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

export function EmptyState({ icon = "⚒", title, message }: { icon?: string; title: string; message?: string }) {
  return (
    <div style={{ textAlign: "center", padding: "48px 24px", color: colors.textMuted }}>
      <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.4 }}>{icon}</div>
      <div style={{ fontSize: font.size.md, color: colors.textDim, fontWeight: 600, marginBottom: 6 }}>{title}</div>
      {message && <div style={{ fontSize: font.size.sm, color: colors.textDim }}>{message}</div>}
    </div>
  );
}

// ─── Loading spinner ─────────────────────────────────────────────────────────

export function Spinner({ size = 20 }: { size?: number }) {
  return (
    <div className="spinning" style={{
      width: size, height: size,
      border: `2px solid #3a2e20`,
      borderTopColor: "#c8a028",
      borderRadius: "50%",
      flexShrink: 0,
    }} />
  );
}

// ─── Error banner ─────────────────────────────────────────────────────────────

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div style={{
      background: "#1a0d0d",
      border: "1px solid #5a2020",
      borderRadius: radius.md,
      padding: "12px 16px",
      color: "#cf7f7f",
      fontSize: font.size.sm,
      display: "flex",
      gap: 8,
      alignItems: "flex-start",
    }}>
      <span>⚠</span> {message}
    </div>
  );
}

// ─── Toast (simple) ───────────────────────────────────────────────────────────

interface ToastProps { message: string; type?: "success" | "error" | "info" }
export function Toast({ message, type = "info" }: ToastProps) {
  const colors_ = {
    success: { bg: "#0d1a0d", border: "#2d5a2d", text: "#7fcf7f" },
    error:   { bg: "#1a0d0d", border: "#5a2d2d", text: "#cf7f7f" },
    info:    { bg: "#1a1408", border: "#5a4520", text: "#cfaf6f" },
  };
  const c = colors_[type];
  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24,
      background: c.bg, border: `1px solid ${c.border}`,
      color: c.text, borderRadius: radius.md,
      padding: "10px 18px", fontSize: font.size.sm,
      zIndex: 9999, maxWidth: 360,
      boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
    }}>
      {message}
    </div>
  );
}
