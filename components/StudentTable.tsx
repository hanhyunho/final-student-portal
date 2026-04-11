import React, { memo, useMemo } from "react";
import { normalizeStudentId, type Student } from "@/lib/dataService";
import { EmptyState } from "@/components/EmptyState";
import { portalTheme } from "@/lib/theme";

type StudentListItem = Student & {
  id?: string | number;
  account_id?: string | number;
};

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

function StudentTableComponent({
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
  const styles: Record<string, React.CSSProperties> = {
    tableWrap: {
      overflowX: "auto",
    },
    table: {
      width: "100%",
      borderCollapse: "collapse",
    },
    th: {
      padding: "14px 12px",
      borderBottom: `1px solid ${portalTheme.colors.lineStrong}`,
      background: portalTheme.gradients.header,
      textAlign: "left",
      fontSize: "14px",
      color: portalTheme.colors.textInverse,
      whiteSpace: "nowrap",
      fontWeight: 800,
      letterSpacing: "0.01em",
    },
    td: {
      padding: "14px 12px",
      borderBottom: `1px solid ${portalTheme.colors.lineTable}`,
      fontSize: "14px",
      color: portalTheme.colors.textPrimary,
      whiteSpace: "nowrap",
    },
    tdStrong: {
      padding: "14px 12px",
      borderBottom: `1px solid ${portalTheme.colors.lineTable}`,
      fontSize: "14px",
      fontWeight: 800,
      color: portalTheme.colors.textStrong,
      whiteSpace: "nowrap",
    },
    tdNumber: {
      padding: "14px 12px",
      borderBottom: `1px solid ${portalTheme.colors.lineTable}`,
      fontSize: "14px",
      fontWeight: 800,
      color: portalTheme.colors.textStrong,
      whiteSpace: "nowrap",
      textAlign: "right",
      fontVariantNumeric: "tabular-nums",
    },
    row: {
      cursor: "pointer",
      transition: "background 0.15s ease, box-shadow 0.15s ease",
    },
    selectedRow: {
      background: "rgba(225, 29, 72, 0.08)",
      boxShadow: `inset 4px 0 0 ${portalTheme.colors.primary}`,
    },
    gradeBadge: {
      display: "inline-block",
      width: "fit-content",
      padding: "5px 9px",
      borderRadius: portalTheme.radius.pill,
      fontSize: "12px",
      fontWeight: 700,
    },
  };

  const visibleStudents = useMemo(
    () => students.filter((student) => s(student.student_id).trim() && s(student.name).trim()),
    [students, s]
  );

  const getSelectionId = (student: Student) => {
    const candidate = student as StudentListItem;
    const rawValue = candidate.student_id ?? candidate.id ?? candidate.account_id ?? "";

    if (typeof rawValue !== "string" && typeof rawValue !== "number") {
      return "";
    }

    try {
      return normalizeStudentId(rawValue);
    } catch {
      return "";
    }
  };

  const getRowKey = (student: Student, index: number) => {
    return `${String(student.student_id ?? "nostudent")}-${String(student.student_no ?? "nostudentno")}-${index}`;
  };

  const isSelectedStudent = (student: Student) => {
    let normalizedSelectedId = "";

    try {
      normalizedSelectedId = normalizeStudentId(selectedStudentId);
    } catch {
      normalizedSelectedId = "";
    }

    if (!normalizedSelectedId) {
      return false;
    }

    return getSelectionId(student) === normalizedSelectedId;
  };

  const studentRows = visibleStudents.map((st, index) => {
    const isSelected = isSelectedStudent(st);
    const selectionId = getSelectionId(st);
    const rowKey = getRowKey(st, index);

    return (
      <tr
        key={rowKey}
        onClick={() => selectionId && onSelectStudent(selectionId)}
        onDoubleClick={() => selectionId && onDoubleClick(selectionId)}
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
        <td style={styles.tdNumber}>{getAverageNumber(st).toFixed(1)}</td>
      </tr>
    );
  });

  return (
    <div style={styles.tableWrap}>
      {loading ? (
        <EmptyState title="불러오는 중입니다" description="학생 목록을 불러오고 있습니다." />
      ) : visibleStudents.length === 0 ? (
        <EmptyState title="검색 결과가 없습니다" description="검색어 또는 필터 조건을 확인하세요." />
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
              <th style={{ ...styles.th, textAlign: "right" }}>평균</th>
            </tr>
          </thead>
          <tbody>{studentRows}</tbody>
        </table>
      )}
    </div>
  );
}

export const StudentTable = memo(StudentTableComponent);
