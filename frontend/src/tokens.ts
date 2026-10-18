/**
 * HEPHAESTUS design tokens — forge palette.
 *
 * Inspired by the smithy: charcoal black, molten amber, aged copper,
 * deep crimson, and weathered iron. No blues, no teals, no generic AI purple.
 */

export const colors = {
  // ── Backgrounds ──────────────────────────────────────────────────────────
  bg: "#0d0a07",          // forge black — deepest background
  bgSurface: "#141009",   // slightly lighter surface
  bgCard: "#1c1410",      // card / panel background
  bgHover: "#221a10",     // hover state background
  bgInput: "#120f08",     // input field background

  // ── Borders ───────────────────────────────────────────────────────────────
  border: "#3a2e20",      // iron border — warm dark brown
  borderLight: "#4a3a28", // lighter border for hover
  borderAccent: "#7a5520",// amber-tinted border

  // ── Text ──────────────────────────────────────────────────────────────────
  textPrimary: "#e8d5b0",  // aged parchment — primary text
  textSecondary: "#c8a96e",// amber copper — headings, labels
  textMuted: "#7a6a50",    // muted iron — secondary text
  textDim: "#5a4a30",      // very muted — placeholders, disabled

  // ── Accent — molten amber ─────────────────────────────────────────────────
  amber: "#c8a028",        // molten amber — primary accent
  amberLight: "#e8c050",   // bright amber — highlights
  amberDark: "#8a6c18",    // dark amber — pressed states
  amberBg: "#1a1408",      // amber-tinted background

  // ── Copper ────────────────────────────────────────────────────────────────
  copper: "#b87333",       // aged copper — secondary accent
  copperLight: "#d4924a",  // light copper
  copperDark: "#8a5520",   // dark copper

  // ── Crimson — danger / failures ───────────────────────────────────────────
  crimson: "#8b2020",      // deep crimson — failures, critical
  crimsonLight: "#c04040", // light crimson — alerts
  crimsonMuted: "#5a1818", // muted crimson — backgrounds
  crimsonBg: "#1a0d0d",    // crimson-tinted background

  // ── Iron green — passes / success ────────────────────────────────────────
  ironGreen: "#2d5a2d",    // weathered iron green — success
  ironGreenLight: "#4a8a4a",
  ironGreenBg: "#0d1a0d",

  // ── Rust orange — warnings / medium severity ─────────────────────────────
  rust: "#8b4513",         // rust — warnings, medium
  rustLight: "#c06030",
  rustBg: "#1a0f08",

  // ── Ash — skipped / neutral ───────────────────────────────────────────────
  ash: "#3a3530",          // ash gray — neutral/skipped
  ashLight: "#5a5550",
  ashBg: "#141210",

  // ── Severity map ─────────────────────────────────────────────────────────
  severity: {
    critical: { bg: "#2a0a0a", border: "#6b2020", text: "#e07070", dot: "#c03030" },
    high:     { bg: "#1e1208", border: "#6b4020", text: "#d09060", dot: "#c07030" },
    medium:   { bg: "#1a1a08", border: "#5a5a20", text: "#c8c860", dot: "#b0b030" },
    low:      { bg: "#081a18", border: "#205a50", text: "#60c8b8", dot: "#30a898" },
    info:     { bg: "#141210", border: "#3a3530", text: "#909090", dot: "#606060" },
  },

  // ── Status map ────────────────────────────────────────────────────────────
  status: {
    passed:  { bg: "#0d1a0d", border: "#2d5a2d", text: "#7fcf7f", dot: "#4aaf4a" },
    failed:  { bg: "#1a0d0d", border: "#5a2d2d", text: "#cf7f7f", dot: "#af4a4a" },
    error:   { bg: "#1a1408", border: "#5a4520", text: "#cfaf6f", dot: "#af8f40" },
    skipped: { bg: "#141210", border: "#3a3530", text: "#808080", dot: "#505050" },
    pending: { bg: "#141008", border: "#4a3a20", text: "#c0a060", dot: "#907030" },
    running: { bg: "#100d18", border: "#3a2a50", text: "#9080c0", dot: "#6050a0" },
  },
} as const;

export const spacing = {
  xs: "4px",
  sm: "8px",
  md: "16px",
  lg: "24px",
  xl: "32px",
  xxl: "48px",
} as const;

export const radius = {
  sm: "4px",
  md: "6px",
  lg: "10px",
} as const;

export const font = {
  sans: '-apple-system, "Segoe UI", system-ui, sans-serif',
  mono: '"JetBrains Mono", "Fira Code", "Cascadia Code", Menlo, monospace',
  size: {
    xs: "11px",
    sm: "12px",
    base: "13px",
    md: "14px",
    lg: "16px",
    xl: "20px",
    xxl: "28px",
  },
} as const;
