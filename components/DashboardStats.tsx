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
      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
      gap: "16px",
      marginBottom: "20px",
    },
    summaryCard: {
      background: portalTheme.gradients.card,
      borderRadius: portalTheme.radius.md,
      padding: "18px 20px",
      boxShadow: portalTheme.shadows.card,
      border: `1px solid ${portalTheme.colors.line}`,
      borderLeft: `4px solid ${portalTheme.colors.primary}`,
    },
    summaryLabel: {
      display: "block",
      fontSize: "13px",
      color: portalTheme.colors.textMuted,
      marginBottom: "10px",
    },
    summaryValue: {
      fontSize: "30px",
      fontWeight: 900,
      color: portalTheme.colors.textStrong,
    },
  };

  return (
    <section style={styles.summaryGrid}>
      <div style={styles.summaryCard}>
        <span style={styles.summaryLabel}>표시 학생 수</span>
        <strong style={styles.summaryValue}>{summary.count}명</strong>
      </div>
      <div style={styles.summaryCard}>
        <span style={styles.summaryLabel}>활성 학생 수</span>
        <strong style={styles.summaryValue}>{summary.activeCount}명</strong>
      </div>
      <div style={styles.summaryCard}>
        <span style={styles.summaryLabel}>전체 평균</span>
        <strong style={styles.summaryValue}>{summary.avgScore}</strong>
      </div>
      <div style={styles.summaryCard}>
        <span style={styles.summaryLabel}>최고 평균</span>
        <strong style={styles.summaryValue}>{summary.topAvg}</strong>
      </div>
    </section>
  );
}
