import React from "react";
import type { Student, Branch } from "@/lib/dataService";

interface ChartPanelProps {
  branches: Branch[];
  students: Student[];
  getAverageNumber: (student: Student) => number;
  s: (value: unknown) => string;
}

export function ChartPanel({
  branches,
  students,
  getAverageNumber,
  s,
}: ChartPanelProps) {
  const styles: { [key: string]: React.CSSProperties } = {
    chartGrid: {
      marginBottom: "20px",
    },
    chartPanel: {
      background: "#ffffff",
      borderRadius: "18px",
      padding: "18px 20px",
      boxShadow: "0 10px 24px rgba(15, 23, 42, 0.05)",
      border: "1px solid #eef2f7",
    },
    chartPanelTitle: {
      margin: "0 0 14px 0",
      fontSize: "18px",
      fontWeight: 900,
      color: "#0f172a",
    },
    branchChartRow: {
      marginBottom: "12px",
    },
    branchChartLabel: {
      display: "flex",
      justifyContent: "space-between",
      fontSize: "14px",
      color: "#334155",
      marginBottom: "6px",
    },
    branchChartTrack: {
      width: "100%",
      height: "14px",
      borderRadius: "999px",
      background: "#e2e8f0",
      overflow: "hidden",
    },
    branchChartBar: {
      height: "100%",
      borderRadius: "999px",
      background: "linear-gradient(90deg, #2563eb 0%, #60a5fa 100%)",
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
    <section style={styles.chartGrid}>
      <div style={styles.chartPanel}>
        <h3 style={styles.chartPanelTitle}>지점별 평균 차트</h3>
        {branchStats.length === 0 ? (
          <div style={styles.stateBox}>차트 데이터가 없습니다.</div>
        ) : (
          branchStats.map((item) => (
            <div key={item.branch_id} style={styles.branchChartRow}>
              <div style={styles.branchChartLabel}>
                <span>{item.branch_name}</span>
                <span>{item.avg}</span>
              </div>
              <div style={styles.branchChartTrack}>
                <div
                  style={{
                    ...styles.branchChartBar,
                    width: `${Math.max(0, Math.min(100, Number(item.avg)))}%`,
                  }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
