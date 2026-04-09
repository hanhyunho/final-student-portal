import React from "react";
import type { Student, Branch } from "@/lib/dataService";

interface StatsPanelProps {
  branches: Branch[];
  students: Student[];
  topStudents: Student[];
  subjectStats: Record<string, string>;
  getAverageNumber: (student: Student) => number;
  getBranchLabel: (branchId: string | undefined) => string;
  s: (value: unknown) => string;
}

export function StatsPanel({
  branches,
  students,
  topStudents,
  subjectStats,
  getAverageNumber,
  getBranchLabel,
  s,
}: StatsPanelProps) {
  const styles: { [key: string]: React.CSSProperties } = {
    statsSection: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
      gap: "16px",
      marginBottom: "20px",
    },
    statsCard: {
      background: "#ffffff",
      borderRadius: "18px",
      padding: "18px 20px",
      boxShadow: "0 10px 24px rgba(15, 23, 42, 0.05)",
      border: "1px solid #eef2f7",
    },
    statsTitle: {
      margin: "0 0 14px 0",
      fontSize: "18px",
      fontWeight: 900,
      color: "#0f172a",
    },
    statsRow: {
      display: "flex",
      justifyContent: "space-between",
      gap: "12px",
      padding: "8px 0",
      borderBottom: "1px solid #f1f5f9",
      fontSize: "14px",
      color: "#334155",
    },
    stateBox: {
      background: "#f8fafc",
      borderRadius: "14px",
      padding: "24px",
      fontSize: "14px",
      color: "#64748b",
      textAlign: "center",
    },
  };

  // Calculate branch stats
  const branchStats = branches.map((branch) => {
    const studentsInBranch = students.filter((st) => s(st.branch_id) === s(branch.branch_id));
    const count = studentsInBranch.length;
    const avg =
      count === 0
        ? 0
        : studentsInBranch.reduce((acc, cur) => acc + getAverageNumber(cur), 0) / count;
    return {
      branch_id: s(branch.branch_id),
      branch_name: s(branch.branch_name),
      count,
      avg: avg.toFixed(1),
    };
  });

  return (
    <section style={styles.statsSection}>
      <div style={styles.statsCard}>
        <h3 style={styles.statsTitle}>지점별 현황</h3>
        {branchStats.length === 0 ? (
          <div style={styles.stateBox}>지점 데이터가 없습니다.</div>
        ) : (
          branchStats.map((item) => (
            <div key={item.branch_id} style={styles.statsRow}>
              <span>{item.branch_name}</span>
              <span>{item.count}명 / 평균 {item.avg}</span>
            </div>
          ))
        )}
      </div>

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
          <div style={styles.stateBox}>학생 데이터가 없습니다.</div>
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
