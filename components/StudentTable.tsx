import React from "react";
import type { Student } from "@/lib/dataService";

interface StudentTableProps {
  students: Student[];
  selectedStudentId: string | null;
  loading: boolean;
  onSelectStudent: (id: string) => void;
  onDoubleClick: (id: string) => void;
  getBranchLabel: (branchId: string | undefined) => string;
  getStatusStyle: (status: string | undefined) => React.CSSProperties;
  getAverageNumber: (student: Student) => number;
  s: (value: unknown) => string;
}

export function StudentTable({
  students,
  selectedStudentId,
  loading,
  onSelectStudent,
  onDoubleClick,
  getBranchLabel,
  getStatusStyle,
  getAverageNumber,
  s,
}: StudentTableProps) {
  const styles: { [key: string]: React.CSSProperties } = {
    tableWrap: {
      overflowX: "auto",
    },
    table: {
      width: "100%",
      borderCollapse: "collapse",
    },
    th: {
      padding: "14px 12px",
      borderBottom: "2px solid #e2e8f0",
      background: "#f8fafc",
      textAlign: "left",
      fontSize: "14px",
      color: "#334155",
      whiteSpace: "nowrap",
      fontWeight: 700,
    },
    td: {
      padding: "14px 12px",
      borderBottom: "1px solid #edf2f7",
      fontSize: "14px",
      color: "#334155",
      whiteSpace: "nowrap",
    },
    tdStrong: {
      padding: "14px 12px",
      borderBottom: "1px solid #edf2f7",
      fontSize: "14px",
      fontWeight: 800,
      color: "#0f172a",
      whiteSpace: "nowrap",
    },
    row: {
      cursor: "pointer",
      transition: "background 0.15s ease",
    },
    selectedRow: {
      background: "#eaf2ff",
      boxShadow: "inset 4px 0 0 #2563eb",
    },
    stateBox: {
      background: "#f8fafc",
      borderRadius: "14px",
      padding: "24px",
      fontSize: "14px",
      color: "#64748b",
      textAlign: "center",
    },
    gradeBadge: {
      display: "inline-block",
      width: "fit-content",
      padding: "5px 9px",
      borderRadius: "999px",
      fontSize: "12px",
      fontWeight: 700,
    },
  };

  return (
    <div style={styles.tableWrap}>
      {loading ? (
        <div style={styles.stateBox}>데이터를 불러오는 중입니다...</div>
      ) : students.length === 0 ? (
        <div style={styles.stateBox}>검색 결과가 없습니다.</div>
      ) : (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>이름</th>
              <th style={styles.th}>학번</th>
              <th style={styles.th}>지점</th>
              <th style={styles.th}>학교</th>
              <th style={styles.th}>학년</th>
              <th style={styles.th}>상태</th>
              <th style={styles.th}>평균</th>
            </tr>
          </thead>
          <tbody>
            {students.map((st) => {
              const isSelected = s(selectedStudentId) === s(st.student_id);

              return (
                <tr
                  key={s(st.student_id)}
                  onClick={() => onSelectStudent(s(st.student_id))}
                  onDoubleClick={() => onDoubleClick(s(st.student_id))}
                  style={{ ...styles.row, ...(isSelected ? styles.selectedRow : {}) }}
                >
                  <td style={styles.tdStrong}>{s(st.name)}</td>
                  <td style={styles.td}>{s(st.student_no) || "-"}</td>
                  <td style={styles.td}>{getBranchLabel(s(st.branch_id))}</td>
                  <td style={styles.td}>{s(st.school_name)}</td>
                  <td style={styles.td}>{s(st.grade)}</td>
                  <td style={styles.td}>
                    <span style={{ ...styles.gradeBadge, ...getStatusStyle(s(st.status)) }}>
                      {s(st.status) || "-"}
                    </span>
                  </td>
                  <td style={styles.td}>{getAverageNumber(st).toFixed(1)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
