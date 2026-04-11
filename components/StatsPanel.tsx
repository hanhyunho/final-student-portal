import React from "react";
import type { Student, Branch } from "@/lib/dataService";
import { EmptyState } from "@/components/EmptyState";
import { portalTheme } from "@/lib/theme";

interface StatsPanelProps {
  branches: Branch[];
  students: Student[];
  topStudents: Student[];
  subjectStats: Record<string, string>;
  getAverageNumber: (student: Student) => number;
  s: (value: unknown) => string;
}

export function StatsPanel({
  branches,
  students,
  topStudents,
  subjectStats,
  getAverageNumber,
  s,
}: StatsPanelProps) {
  void branches;
  void students;

  const styles: { [key: string]: React.CSSProperties } = {
    statsSection: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
      gap: "16px",
      marginBottom: "20px",
    },
    statsCard: {
      background: portalTheme.gradients.card,
      borderRadius: portalTheme.radius.md,
      padding: "18px 20px",
      boxShadow: portalTheme.shadows.card,
      border: `1px solid ${portalTheme.colors.line}`,
      borderLeft: `4px solid ${portalTheme.colors.primary}`,
    },
    statsTitle: {
      margin: "0 0 14px 0",
      fontSize: "18px",
      fontWeight: 900,
      color: portalTheme.colors.textStrong,
    },
    statsRow: {
      display: "flex",
      justifyContent: "space-between",
      gap: "12px",
      padding: "10px 0",
      borderBottom: `1px solid ${portalTheme.colors.lineSoft}`,
      fontSize: "14px",
      color: portalTheme.colors.textPrimary,
    },
  };

  return (
    <section style={styles.statsSection}>
      <div style={styles.statsCard}>
        <h3 style={styles.statsTitle}>과목별 평균</h3>
        <div style={styles.statsRow}>
          <span>국어</span>
          <span>{subjectStats.korean}</span>
        </div>
        <div style={styles.statsRow}>
          <span>수학</span>
          <span>{subjectStats.math}</span>
        </div>
        <div style={styles.statsRow}>
          <span>영어</span>
          <span>{subjectStats.english}</span>
        </div>
        <div style={styles.statsRow}>
          <span>탐구1</span>
          <span>{subjectStats.inquiry1}</span>
        </div>
        <div style={styles.statsRow}>
          <span>탐구2</span>
          <span>{subjectStats.inquiry2}</span>
        </div>
        <div style={styles.statsRow}>
          <span>한국사</span>
          <span>{subjectStats.history}</span>
        </div>
      </div>

      <div style={styles.statsCard}>
        <h3 style={styles.statsTitle}>상위 평균 학생 TOP 5</h3>
        {topStudents.length === 0 ? (
          <EmptyState title="학생 데이터가 없습니다" description="평균을 계산할 학생 데이터가 없습니다." />
        ) : (
          topStudents.map((st, idx) => (
            <div key={s(st.student_id)} style={styles.statsRow}>
              <span>{idx + 1}. {s(st.name)}</span>
              <span>{getAverageNumber(st).toFixed(1)}</span>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
