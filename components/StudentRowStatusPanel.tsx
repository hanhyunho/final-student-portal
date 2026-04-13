import React, { useState } from "react";
import { portalTheme } from "@/lib/theme";

interface StudentRowStatusPanelProps {
  tabs?: string[];
  tint: "blue" | "green";
  initialValue?: string;
}

export function StudentRowStatusPanel({
  tabs = ["3모", "6모", "9모", "수능"],
  tint,
  initialValue,
}: StudentRowStatusPanelProps) {
  const [selectedTab, setSelectedTab] = useState(initialValue || tabs[0] || "");

  const renderButton = (tab: string) => {
    const isActive = tab === selectedTab;
    const activeStyle =
      tint === "blue"
        ? {
            border: "rgba(37, 99, 235, 0.22)",
            background: "linear-gradient(180deg, rgba(37, 99, 235, 0.16) 0%, rgba(255,255,255,0.96) 100%)",
            color: "#1d4ed8",
            boxShadow: "0 6px 14px rgba(37, 99, 235, 0.10), inset 0 1px 0 rgba(255,255,255,0.75)",
          }
        : {
            border: "rgba(22, 163, 74, 0.22)",
            background: "linear-gradient(180deg, rgba(22, 163, 74, 0.15) 0%, rgba(255,255,255,0.96) 100%)",
            color: "#15803d",
            boxShadow: "0 6px 14px rgba(22, 163, 74, 0.08), inset 0 1px 0 rgba(255,255,255,0.75)",
          };

    return (
      <button
        key={`${tint}-${tab}`}
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setSelectedTab(tab);
        }}
        style={{
          padding: "6px 10px",
          minWidth: "42px",
          borderRadius: "999px",
          border: `1px solid ${isActive ? activeStyle.border : portalTheme.colors.line}`,
          background: isActive ? activeStyle.background : "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(244,247,251,0.98) 100%)",
          color: isActive ? activeStyle.color : "#52607a",
          fontSize: "11px",
          fontWeight: isActive ? 900 : 700,
          lineHeight: 1.1,
          cursor: "pointer",
          boxShadow: isActive ? activeStyle.boxShadow : "inset 0 1px 0 rgba(255,255,255,0.72)",
          whiteSpace: "nowrap",
          letterSpacing: "0.01em",
          transition: "border-color 0.16s ease, background 0.16s ease, color 0.16s ease, box-shadow 0.16s ease",
        }}
      >
        {tab}
      </button>
    );
  };

  return (
    <div
      style={{
        width: "max-content",
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-start",
        gap: "8px",
        whiteSpace: "nowrap",
      }}
    >
      {tabs.map((tab) => renderButton(tab))}
    </div>
  );
}