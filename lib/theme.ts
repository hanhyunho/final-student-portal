import type React from "react";

export const portalTheme = {
  colors: {
    textStrong: "#0b1220",
    textPrimary: "#162033",
    textMuted: "#52607a",
    textSoft: "#7b879c",
    textInverse: "#ffffff",
    primary: "#d92d20",
    primaryStrong: "#9f1d18",
    primarySoft: "rgba(217, 45, 32, 0.08)",
    primaryTint: "rgba(217, 45, 32, 0.16)",
    blue: "#2563eb",
    blueSoft: "rgba(37, 99, 235, 0.12)",
    greenSoft: "rgba(34, 197, 94, 0.12)",
    violetSoft: "rgba(139, 92, 246, 0.12)",
    redSoft: "rgba(217, 45, 32, 0.12)",
    cyan: "#2563eb",
    mint: "#22c55e",
    green: "#22c55e",
    sky: "#38bdf8",
    violet: "#8b5cf6",
    orange: "#f59e0b",
    coral: "#ef4444",
    surfaceCanvas: "#eef2f6",
    surfaceCanvasAlt: "#e3e8ef",
    surfaceCard: "#ffffff",
    surfaceCardAlt: "#fbfcfe",
    surfacePanel: "#f6f8fb",
    surfacePanelStrong: "#f1f5f9",
    surfaceAccent: "#fff7f6",
    line: "#d7dee7",
    lineStrong: "#b4c0d0",
    lineSoft: "#e9eef5",
    lineTable: "#e6ebf2",
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
    page: "linear-gradient(180deg, #f7f9fc 0%, #edf2f7 100%)",
    pageOverlay: "linear-gradient(180deg, rgba(255,255,255,0.86) 0%, rgba(255,255,255,0.4) 100%)",
    card: "linear-gradient(180deg, #ffffff 0%, #fafbfd 100%)",
    cardTint: "linear-gradient(180deg, #ffffff 0%, #f5f7fb 100%)",
    header: "linear-gradient(90deg, #111827 0%, #172033 50%, #1f2937 100%)",
    primaryButton: "linear-gradient(135deg, #ef4444 0%, #b42318 100%)",
    successButton: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
    warningButton: "linear-gradient(135deg, #dc2626 0%, #9f1d18 100%)",
    navyPanel: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
  },
  shadows: {
    card: "0 10px 26px rgba(15, 23, 42, 0.07)",
    cardStrong: "0 18px 44px rgba(15, 23, 42, 0.12)",
    soft: "0 6px 18px rgba(15, 23, 42, 0.06)",
    panel: "0 1px 2px rgba(15, 23, 42, 0.04), 0 14px 34px rgba(15, 23, 42, 0.06)",
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
  panelAccents: {
    score: "#2563eb",
    physical: "#16a34a",
    branch: "#7c3aed",
  },
  panelTints: {
    score: "linear-gradient(180deg, rgba(37, 99, 235, 0.06) 0%, #ffffff 34%)",
    physical: "linear-gradient(180deg, rgba(22, 163, 74, 0.06) 0%, #ffffff 34%)",
    branch: "linear-gradient(180deg, rgba(124, 58, 237, 0.07) 0%, #ffffff 34%)",
  },
  kpiCards: [
    {
      background: "linear-gradient(180deg, rgba(217,45,32,0.12) 0%, rgba(255,255,255,0.96) 58%)",
      border: "rgba(217,45,32,0.16)",
      accent: "#d92d20",
    },
    {
      background: "linear-gradient(180deg, rgba(37,99,235,0.12) 0%, rgba(255,255,255,0.96) 58%)",
      border: "rgba(37,99,235,0.16)",
      accent: "#2563eb",
    },
    {
      background: "linear-gradient(180deg, rgba(34,197,94,0.12) 0%, rgba(255,255,255,0.96) 58%)",
      border: "rgba(34,197,94,0.16)",
      accent: "#16a34a",
    },
    {
      background: "linear-gradient(180deg, rgba(139,92,246,0.13) 0%, rgba(255,255,255,0.96) 58%)",
      border: "rgba(139,92,246,0.18)",
      accent: "#7c3aed",
    },
  ],
} as const;

export const portalLayout = {
  containerMaxWidth: "1360px",
  pagePadding: "0 20px 40px",
  pagePaddingWide: "0 20px 40px",
  containerPaddingTop: "16px",
  sectionGap: "20px",
  cardPadding: "clamp(18px, 3vw, 28px)",
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
    border: "1px solid rgba(127, 29, 29, 0.18)",
    background: portalTheme.gradients.primaryButton,
    color: portalTheme.colors.textInverse,
    borderRadius: portalTheme.radius.sm,
    fontWeight: 800,
    boxShadow: portalTheme.shadows.soft,
    transition: "filter 0.16s ease, transform 0.16s ease, box-shadow 0.16s ease",
  } satisfies React.CSSProperties,
  secondary: {
    border: `1px solid ${portalTheme.colors.lineStrong}`,
    background: "rgba(255, 255, 255, 0.98)",
    color: portalTheme.colors.textStrong,
    borderRadius: portalTheme.radius.sm,
    fontWeight: 800,
    boxShadow: portalTheme.shadows.soft,
    transition: "background 0.16s ease, border-color 0.16s ease, box-shadow 0.16s ease",
  } satisfies React.CSSProperties,
  success: {
    border: "1px solid rgba(29, 78, 216, 0.12)",
    background: portalTheme.gradients.successButton,
    color: portalTheme.colors.textInverse,
    borderRadius: portalTheme.radius.sm,
    fontWeight: 800,
    boxShadow: portalTheme.shadows.soft,
    transition: "filter 0.16s ease, transform 0.16s ease, box-shadow 0.16s ease",
  } satisfies React.CSSProperties,
  warning: {
    border: "1px solid rgba(159, 29, 24, 0.12)",
    background: portalTheme.gradients.warningButton,
    color: portalTheme.colors.textInverse,
    borderRadius: portalTheme.radius.sm,
    fontWeight: 800,
    boxShadow: portalTheme.shadows.soft,
    transition: "filter 0.16s ease, transform 0.16s ease, box-shadow 0.16s ease",
  } satisfies React.CSSProperties,
};