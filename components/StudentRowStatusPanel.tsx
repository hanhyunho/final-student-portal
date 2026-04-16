import React, { useState } from "react";
import classes from "./StudentRowStatusPanel.module.css";

interface StudentRowStatusPanelProps {
  tabs?: string[];
  tint: "blue" | "green";
  initialValue?: string;
  activeTab?: string;
  filledTabs?: string[];
  onTabClick?: (tab: string) => void;
  savedStyle?: "tint" | "success";
  persistClickState?: boolean;
}

export function StudentRowStatusPanel({
  tabs = ["3모", "6모", "9모", "수능"],
  tint,
  initialValue,
  activeTab,
  filledTabs = [],
  onTabClick,
  savedStyle = "tint",
  persistClickState = tint === "blue",
}: StudentRowStatusPanelProps) {
  const [selectedTab, setSelectedTab] = useState(initialValue || tabs[0] || "");
  const resolvedSelectedTab = activeTab ?? (persistClickState ? selectedTab : "");
  const effectiveTint = savedStyle === "success" ? "green" : tint;

  const renderButton = (tab: string) => {
    const isActive = tab === resolvedSelectedTab;
    const isFilled = filledTabs.includes(tab);
    const stateClassName = isFilled
      ? effectiveTint === "blue"
        ? isActive
          ? classes.filledBlueActive
          : classes.filledBlue
        : isActive
        ? classes.filledGreenActive
        : classes.filledGreen
      : isActive
      ? effectiveTint === "blue"
        ? classes.activeBlue
        : classes.activeGreen
      : "";

    return (
      <button
        key={`${tint}-${tab}`}
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          if (persistClickState) {
            setSelectedTab(tab);
          }
          onTabClick?.(tab);
        }}
        className={`${classes.button} ${stateClassName}`}
      >
        {tab}
      </button>
    );
  };

  return (
    <div className={classes.panel}>
      {tabs.map((tab) => renderButton(tab))}
    </div>
  );
}
