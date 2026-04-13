import React from "react";
import { portalTheme } from "@/lib/theme";

interface Summary {
  count: number;
  avgScore: string;
  topAvg: string;
  activeCount: number;
}

interface QuickStats {
  avg80: number;
  koreanTop: number;
  mathTop: number;
  active: number;
}

interface DashboardStatsProps {
  summary: Summary;
  quickStats: QuickStats;
}

export function DashboardStats({ summary, quickStats }: DashboardStatsProps) {
  void quickStats;

  const styles: { [key: string]: React.CSSProperties } = {
    summaryGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
      gap: "14px",
      marginBottom: "22px",
    },
    summaryCard: {
      borderRadius: portalTheme.radius.md,
      padding: "clamp(14px, 2.6vw, 20px) clamp(14px, 3vw, 22px)",
      boxShadow: portalTheme.shadows.panel,
      border: `1px solid ${portalTheme.colors.line}`,
      display: "flex",
      flexDirection: "column",
      gap: "8px",
      position: "relative",
      overflow: "hidden",
    },
    summaryLabel: {
      display: "block",
      fontSize: "12px",
      color: portalTheme.colors.textMuted,
      fontWeight: 800,
      letterSpacing: "0.02em",
    },
    summaryValue: {
      fontSize: "clamp(24px, 4vw, 34px)",
      fontWeight: 900,
      color: portalTheme.colors.textStrong,
      letterSpacing: "-0.03em",
      lineHeight: 1,
    },
    summaryHint: {
      fontSize: "12px",
      color: portalTheme.colors.textSoft,
    },
    summaryAccent: {
      position: "absolute",
      top: "14px",
      right: "14px",
      width: "42px",
      height: "42px",
      borderRadius: "14px",
      opacity: 0.18,
    },
  };

  return (
    <section style={styles.summaryGrid}>
      <div
        style={{
          ...styles.summaryCard,
          background: "#fff1f2",
          borderColor: "#fecdd3",
        }}
      >
        <span style={{ ...styles.summaryAccent, background: "#ef4444" }} />
        <span style={styles.summaryLabel}>표시 학생 수</span>
        <strong style={{ ...styles.summaryValue, color: "#dc2626" }}>{summary.count}명</strong>
        <span style={styles.summaryHint}>현재 필터 기준</span>
      </div>
      <div
        style={{
          ...styles.summaryCard,
          background: "#eff6ff",
          borderColor: "#bfdbfe",
        }}
      >
        <span style={{ ...styles.summaryAccent, background: "#2563eb" }} />
        <span style={styles.summaryLabel}>활성 학생 수</span>
        <strong style={{ ...styles.summaryValue, color: "#2563eb" }}>{summary.activeCount}명</strong>
        <span style={styles.summaryHint}>재원 상태 active</span>
      </div>
      <div
        style={{
          ...styles.summaryCard,
          background: "#ecfdf5",
          borderColor: "#bbf7d0",
        }}
      >
        <span style={{ ...styles.summaryAccent, background: "#16a34a" }} />
        <span style={styles.summaryLabel}>전체 원점수합산 평균</span>
        <strong style={{ ...styles.summaryValue, color: "#16a34a" }}>{summary.avgScore}</strong>
        <span style={styles.summaryHint}>국영수탐 원점수합산 기준</span>
      </div>
      <div
        style={{
          ...styles.summaryCard,
          background: "#f5f3ff",
          borderColor: "#ddd6fe",
        }}
      >
        <span style={{ ...styles.summaryAccent, background: "#7c3aed" }} />
        <span style={styles.summaryLabel}>실기기록 평균</span>
        <strong style={{ ...styles.summaryValue, color: "#7c3aed" }}>{summary.topAvg}</strong>
        <span style={styles.summaryHint}>실기총점 기준 상위 30% 평균</span>
      </div>
    </section>
  );
}
