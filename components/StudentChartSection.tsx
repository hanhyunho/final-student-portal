import React from "react";
import type { Student } from "@/lib/dataService";

interface StudentChartSectionProps {
  selectedStudent: Student | null;
  getScoreNumber: (value: string | number | undefined) => number;
  getBarWidth: (value: string | number | undefined) => string;
  s: (value: unknown) => string;
}

export function StudentChartSection({
  selectedStudent,
  getScoreNumber,
  getBarWidth,
  s,
}: StudentChartSectionProps) {
  const styles: { [key: string]: React.CSSProperties } = {
    chartSection: {
      background: "#ffffff",
      borderRadius: "20px",
      padding: "20px",
      boxShadow: "0 10px 24px rgba(15, 23, 42, 0.05)",
      marginBottom: "20px",
    },
    chartHeader: {
      marginBottom: "16px",
    },
    chartTitle: {
      margin: "0 0 6px 0",
      fontSize: "20px",
      fontWeight: 900,
      color: "#0f172a",
    },
    chartDesc: {
      margin: 0,
      color: "#64748b",
      fontSize: "13px",
    },
    chartCard: {
      display: "flex",
      flexDirection: "column",
      gap: "18px",
    },
    chartRow: {
      display: "flex",
      alignItems: "center",
      gap: "16px",
    },
    chartLabelWrap: {
      width: "90px",
      flexShrink: 0,
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      fontSize: "14px",
      fontWeight: 700,
      color: "#334155",
    },
    chartLabel: {
      color: "#334155",
    },
    chartValue: {
      color: "#0f172a",
      fontWeight: 800,
    },
    chartTrack: {
      flex: 1,
      height: "18px",
      background: "#e2e8f0",
      borderRadius: "999px",
      overflow: "hidden",
    },
    chartBar: {
      height: "100%",
      borderRadius: "999px",
    },
    koreanBar: {
      background: "linear-gradient(90deg, #3b82f6 0%, #60a5fa 100%)",
    },
    mathBar: {
      background: "linear-gradient(90deg, #22c55e 0%, #4ade80 100%)",
    },
    englishBar: {
      background: "linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%)",
    },
  };

  if (!selectedStudent) {
    return null;
  }

  return (
    <section style={styles.chartSection}>
      <div style={styles.chartHeader}>
        <h3 style={styles.chartTitle}>선택 학생 성적 그래프</h3>
        <p style={styles.chartDesc}>{s(selectedStudent.name)} 학생의 주요 과목 점수</p>
      </div>

      <div style={styles.chartCard}>
        {[
          ["국어", selectedStudent.korean_raw, styles.koreanBar],
          ["수학", selectedStudent.math_raw, styles.mathBar],
          ["영어", selectedStudent.english_raw, styles.englishBar],
          ["탐구1", selectedStudent.inquiry1_raw, styles.koreanBar],
          ["탐구2", selectedStudent.inquiry2_raw, styles.mathBar],
        ].map(([label, value, barStyle]) => (
          <div key={String(label)} style={styles.chartRow}>
            <div style={styles.chartLabelWrap}>
              <span style={styles.chartLabel}>{String(label)}</span>
              <span style={styles.chartValue}>{s(value) || "-"}</span>
            </div>
            <div style={styles.chartTrack}>
              <div
                style={{
                  ...styles.chartBar,
                  ...(barStyle as React.CSSProperties),
                  width: getBarWidth(value as string | number | undefined),
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
