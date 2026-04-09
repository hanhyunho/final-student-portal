import React from "react";

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
  const styles: { [key: string]: React.CSSProperties } = {
    summaryGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
      gap: "16px",
      marginBottom: "20px",
    },
    summaryCard: {
      background: "#ffffff",
      borderRadius: "18px",
      padding: "18px 20px",
      boxShadow: "0 10px 24px rgba(15, 23, 42, 0.05)",
      border: "1px solid #eef2f7",
    },
    summaryLabel: {
      display: "block",
      fontSize: "13px",
      color: "#64748b",
      marginBottom: "10px",
    },
    summaryValue: {
      fontSize: "30px",
      fontWeight: 900,
      color: "#0f172a",
    },
    quickStatsWrap: {
      display: "flex",
      gap: "10px",
      flexWrap: "wrap",
      marginBottom: "20px",
    },
    quickChip: {
      background: "#ffffff",
      border: "1px solid #e2e8f0",
      boxShadow: "0 8px 20px rgba(15,23,42,0.04)",
      color: "#0f172a",
      borderRadius: "999px",
      padding: "10px 14px",
      fontSize: "13px",
      fontWeight: 800,
    },
  };

  return (
    <>
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

      <section style={styles.quickStatsWrap}>
        <div style={styles.quickChip}>평균 80↑ {quickStats.avg80}명</div>
        <div style={styles.quickChip}>국어 1~2등급 {quickStats.koreanTop}명</div>
        <div style={styles.quickChip}>수학 1~2등급 {quickStats.mathTop}명</div>
        <div style={styles.quickChip}>활성 학생 {quickStats.active}명</div>
      </section>
    </>
  );
}
