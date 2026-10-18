import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { colors, font } from "../tokens";

const NAV = [
  { to: "/",          label: "Dashboard",   icon: "⊞" },
  { to: "/scenarios", label: "Scenarios",   icon: "◈" },
  { to: "/suites",    label: "Test Suites", icon: "◉" },
  { to: "/runs",      label: "Test Runs",   icon: "▶" },
  { to: "/targets",   label: "Targets",     icon: "⊛" },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <Sidebar />
      <main style={{
        flex: 1,
        overflowY: "auto",
        background: colors.bg,
        display: "flex",
        flexDirection: "column",
      }}>
        {children}
      </main>
    </div>
  );
}

function Sidebar() {
  return (
    <aside style={{
      width: 220,
      background: "#0f0c08",
      borderRight: `1px solid #2a1e10`,
      display: "flex",
      flexDirection: "column",
      flexShrink: 0,
      overflowY: "auto",
    }}>
      {/* Logo */}
      <div style={{
        padding: "20px 18px 16px",
        borderBottom: "1px solid #2a1e10",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            fontSize: 22,
            filter: "sepia(1) saturate(2) hue-rotate(-10deg)",
          }}>⚒</span>
          <div>
            <div style={{
              fontSize: 15,
              fontWeight: 800,
              color: "#e8c88a",
              letterSpacing: "0.1em",
              lineHeight: 1.1,
            }}>
              HEPHAESTUS
            </div>
            <div style={{
              fontSize: 9,
              color: "#5a4a30",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              marginTop: 2,
            }}>
              AI Security Lab
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ padding: "12px 8px", flex: 1 }}>
        <div style={{
          fontSize: 9,
          fontWeight: 600,
          color: "#4a3a28",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          padding: "4px 10px 8px",
        }}>
          Navigation
        </div>
        {NAV.map(({ to, label, icon }) => (
          <NavItem key={to} to={to} label={label} icon={icon} />
        ))}
      </nav>

      {/* Footer note */}
      <div style={{
        padding: "12px 14px",
        borderTop: "1px solid #1e1408",
        fontSize: 9,
        color: "#3a2e1e",
        letterSpacing: "0.06em",
        lineHeight: 1.5,
      }}>
        LOCAL-FIRST · NO EXTERNAL APIs<br />
        SYNTHETIC DATA ONLY
      </div>
    </aside>
  );
}

function NavItem({ to, label, icon }: { to: string; label: string; icon: string }) {
  const location = useLocation();
  const isActive = to === "/" ? location.pathname === "/" : location.pathname.startsWith(to);

  return (
    <NavLink
      to={to}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 9,
        padding: "8px 10px",
        borderRadius: 5,
        marginBottom: 2,
        textDecoration: "none",
        fontSize: font.size.sm,
        fontWeight: isActive ? 600 : 400,
        color: isActive ? "#e8c88a" : "#7a6a50",
        background: isActive ? "#221a0e" : "transparent",
        borderLeft: isActive ? "2px solid #c8a028" : "2px solid transparent",
        transition: "all 0.12s",
      }}
    >
      <span style={{ fontSize: 13, opacity: isActive ? 1 : 0.7 }}>{icon}</span>
      {label}
    </NavLink>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
  breadcrumb,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  breadcrumb?: string;
}) {
  return (
    <div style={{
      padding: "24px 32px 20px",
      borderBottom: "1px solid #2a1e10",
      background: "#0f0c08",
      flexShrink: 0,
    }}>
      {breadcrumb && (
        <div style={{
          fontSize: 10,
          color: "#4a3a28",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          marginBottom: 4,
        }}>
          {breadcrumb}
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{
            fontSize: 20,
            fontWeight: 700,
            color: "#e8c88a",
            letterSpacing: "0.02em",
            lineHeight: 1.2,
          }}>
            {title}
          </h1>
          {subtitle && (
            <p style={{ fontSize: font.size.sm, color: "#7a6a50", marginTop: 4 }}>
              {subtitle}
            </p>
          )}
        </div>
        {action && <div>{action}</div>}
      </div>
    </div>
  );
}
