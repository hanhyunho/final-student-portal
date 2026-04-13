import React from "react";
import { portalTheme } from "@/lib/theme";

interface StudentModeTabsProps {
  title: string;
  description: string;
  tabs: string[];
  value: string;
  onChange: (value: string) => void;
  accent: "blue" | "green";
}

const accentStyles = {
  blue: {
    border: "#2563eb",
    background: "rgba(37, 99, 235, 0.08)",
    text: "#1d4ed8",
  },
  green: {
    border: "#16a34a",
    background: "rgba(22, 163, 74, 0.08)",
    text: "#15803d",
  },
} as const;

export function StudentModeTabs({ title, description, tabs, value, onChange, accent }: StudentModeTabsProps) {
  const accentStyle = accentStyles[accent];

  return (
    <section
      style={{
        background: portalTheme.gradients.card,
        border: `1px solid ${portalTheme.colors.line}`,
        borderLeft: `4px solid ${accentStyle.border}`,
        borderRadius: portalTheme.radius.md,
        padding: "14px 16px",
        boxShadow: portalTheme.shadows.panel,
        display: "flex",
        flexDirection: "column",
        gap: "12px",
      }}
    >
      <div>
        <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 900, color: portalTheme.colors.textStrong }}>{title}</h3>
        <p style={{ margin: "4px 0 0 0", fontSize: "12px", lineHeight: 1.5, color: portalTheme.colors.textMuted }}>{description}</p>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
        {tabs.map((tab) => {
          const isActive = tab === value;

          return (
            <button
              key={tab}
              type="button"
              onClick={() => onChange(tab)}
              style={{
                padding: "9px 12px",
                borderRadius: "12px",
                border: `1px solid ${isActive ? accentStyle.border : portalTheme.colors.line}`,
                background: isActive ? accentStyle.background : portalTheme.colors.surfaceCard,
                color: isActive ? accentStyle.text : portalTheme.colors.textPrimary,
                fontSize: "13px",
                fontWeight: isActive ? 900 : 700,
                cursor: "pointer",
                boxShadow: "none",
                minWidth: "60px",
              }}
            >
              {tab}
            </button>
          );
        })}
      </div>
    </section>
  );
}
