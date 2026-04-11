import type React from "react";

export const portalTheme = {
  colors: {
    textStrong: "#111827",
    textPrimary: "#1f2937",
    textMuted: "#6b7280",
    textSoft: "#9ca3af",
    textInverse: "#ffffff",
    primary: "#e11d48",
    primaryStrong: "#be123c",
    primarySoft: "rgba(225, 29, 72, 0.1)",
    cyan: "#2563eb",
    mint: "#22c55e",
    green: "#22c55e",
    sky: "#38bdf8",
    violet: "#8b5cf6",
    orange: "#f59e0b",
    coral: "#ef4444",
    surfaceCanvas: "#f5f7fa",
    surfaceCanvasAlt: "#eef2f7",
    surfaceCard: "#ffffff",
    surfaceCardAlt: "#ffffff",
    surfacePanel: "#f8fafc",
    surfaceAccent: "#fff5f7",
    line: "#e5e7eb",
    lineStrong: "#d1d5db",
    lineSoft: "#eef2f7",
    lineTable: "#e5e7eb",
    successBg: "rgba(34, 197, 94, 0.12)",
    successText: "#15803d",
    successLine: "rgba(34, 197, 94, 0.24)",
    warningBg: "rgba(245, 158, 11, 0.12)",
    warningText: "#b45309",
    warningLine: "rgba(245, 158, 11, 0.24)",
    dangerBg: "rgba(225, 29, 72, 0.1)",
    dangerText: "#be123c",
    dangerLine: "rgba(225, 29, 72, 0.22)",
  },
  gradients: {
    page: "radial-gradient(circle at top left, rgba(225,29,72,0.08) 0%, rgba(225,29,72,0) 28%), radial-gradient(circle at top right, rgba(37,99,235,0.06) 0%, rgba(37,99,235,0) 26%), linear-gradient(180deg, #f5f7fa 0%, #eef2f7 100%)",
    pageOverlay: "linear-gradient(180deg, rgba(255,255,255,0.82) 0%, rgba(255,255,255,0.24) 100%)",
    card: "linear-gradient(180deg, #ffffff 0%, #fcfcfd 100%)",
    cardTint: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
    header: "linear-gradient(135deg, #111827 0%, #1f2937 50%, #374151 100%)",
    primaryButton: "linear-gradient(135deg, #ef4444 0%, #e11d48 100%)",
    successButton: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
    warningButton: "linear-gradient(135deg, #e11d48 0%, #be123c 100%)",
    navyPanel: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
  },
  shadows: {
    card: "0 8px 24px rgba(0, 0, 0, 0.06)",
    cardStrong: "0 18px 40px rgba(17, 24, 39, 0.12)",
    soft: "0 10px 20px rgba(15, 23, 42, 0.06)",
    inset: "inset 0 1px 0 rgba(255,255,255,0.8)",
    modal: "0 32px 72px rgba(17, 24, 39, 0.18)",
  },
  radius: {
    sm: "12px",
    md: "16px",
    lg: "20px",
    xl: "24px",
    pill: "999px",
  },
  chart: ["#ef4444", "#2563eb", "#22c55e", "#f59e0b", "#8b5cf6", "#dc2626"],
} as const;

export function getFeedbackPalette(type: "success" | "error" | "info"): React.CSSProperties {
  if (type === "success") {
    return {
      background: portalTheme.colors.successBg,
      borderColor: portalTheme.colors.successLine,
      color: portalTheme.colors.successText,
    };
  }

  if (type === "error") {
    return {
      background: portalTheme.colors.dangerBg,
      borderColor: portalTheme.colors.dangerLine,
      color: portalTheme.colors.dangerText,
    };
  }

  return {
    background: "rgba(37, 99, 235, 0.1)",
    borderColor: "rgba(37, 99, 235, 0.22)",
    color: "#1d4ed8",
  };
}

export const portalButtonStyles = {
  primary: {
    border: "none",
    background: portalTheme.gradients.primaryButton,
    color: portalTheme.colors.textInverse,
    borderRadius: portalTheme.radius.sm,
    fontWeight: 800,
    boxShadow: portalTheme.shadows.soft,
    transition: "filter 0.16s ease, transform 0.16s ease, box-shadow 0.16s ease",
  } satisfies React.CSSProperties,
  secondary: {
    border: `1px solid ${portalTheme.colors.line}`,
    background: portalTheme.colors.surfaceCard,
    color: portalTheme.colors.textPrimary,
    borderRadius: portalTheme.radius.sm,
    fontWeight: 700,
    boxShadow: portalTheme.shadows.soft,
    transition: "background 0.16s ease, border-color 0.16s ease, box-shadow 0.16s ease",
  } satisfies React.CSSProperties,
  success: {
    border: "none",
    background: portalTheme.gradients.successButton,
    color: portalTheme.colors.textInverse,
    borderRadius: portalTheme.radius.sm,
    fontWeight: 800,
    boxShadow: portalTheme.shadows.soft,
    transition: "filter 0.16s ease, transform 0.16s ease, box-shadow 0.16s ease",
  } satisfies React.CSSProperties,
  warning: {
    border: "none",
    background: portalTheme.gradients.warningButton,
    color: portalTheme.colors.textInverse,
    borderRadius: portalTheme.radius.sm,
    fontWeight: 800,
    boxShadow: portalTheme.shadows.soft,
    transition: "filter 0.16s ease, transform 0.16s ease, box-shadow 0.16s ease",
  } satisfies React.CSSProperties,
};