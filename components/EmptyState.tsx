import React from "react";
import { portalTheme } from "@/lib/theme";

interface EmptyStateProps {
  title: string;
  description?: string;
  tone?: {
    background?: string;
    borderColor?: string;
    accentColor?: string;
  };
}

export function EmptyState({ title, description, tone }: EmptyStateProps) {
  return (
    <div
      style={{
        background: tone?.background || portalTheme.gradients.cardTint,
        border: `1px dashed ${tone?.borderColor || portalTheme.colors.lineStrong}`,
        borderLeft: `4px solid ${tone?.accentColor || portalTheme.colors.primary}`,
        borderRadius: portalTheme.radius.md,
        padding: "28px 24px",
        textAlign: "center",
        boxShadow: portalTheme.shadows.soft,
      }}
    >
      <h3
        style={{
          margin: 0,
          fontSize: "18px",
          fontWeight: 800,
          color: portalTheme.colors.textStrong,
        }}
      >
        {title}
      </h3>
      <p
        style={{
          margin: description ? "10px 0 0 0" : 0,
          color: portalTheme.colors.textMuted,
          fontSize: "14px",
          lineHeight: 1.6,
        }}
      >
        {description || "데이터가 없습니다."}
      </p>
    </div>
  );
}