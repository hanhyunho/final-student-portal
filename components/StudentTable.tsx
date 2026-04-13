import React, { memo, useMemo } from "react";
import { normalizeStudentId, type Student } from "@/lib/dataService";
import { EmptyState } from "@/components/EmptyState";
import { StudentRowStatusPanel } from "@/components/StudentRowStatusPanel";
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
  getStudentLoginStatus: (student: Student) => string;
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
  getStudentLoginStatus,
  getStatusStyle,
  getAverageNumber,
  s,
}: StudentTableProps) {
  void getStatusStyle;
  void getAverageNumber;

  const styles: Record<string, React.CSSProperties> = {
    tableWrap: {
      overflowX: "auto",
      overflowY: "hidden",
    },
    table: {
      width: "max-content",
      minWidth: "100%",
      borderCollapse: "collapse",
    },
    th: {
      padding: "7px 12px",
      borderBottom: `1px solid ${portalTheme.colors.lineStrong}`,
      background: "#f7fafc",
      textAlign: "left",
      fontSize: "13px",
      color: portalTheme.colors.textPrimary,
      whiteSpace: "nowrap",
      fontWeight: 800,
      letterSpacing: "0.01em",
    },
    thExtension: {
      padding: "7px 12px 7px 10px",
      borderBottom: `1px solid ${portalTheme.colors.lineStrong}`,
      background: "#f7fafc",
      width: "224px",
      minWidth: "224px",
      textAlign: "left",
      fontSize: "13px",
      color: portalTheme.colors.textPrimary,
      whiteSpace: "nowrap",
      fontWeight: 800,
      letterSpacing: "0.01em",
    },
    thConsult: {
      padding: "7px 12px 7px 10px",
      borderBottom: `1px solid ${portalTheme.colors.lineStrong}`,
      background: "#f7fafc",
      width: "284px",
      minWidth: "284px",
      textAlign: "left",
      fontSize: "13px",
      color: portalTheme.colors.textPrimary,
      whiteSpace: "nowrap",
      fontWeight: 800,
      letterSpacing: "0.01em",
    },
    td: {
      padding: "9px 12px",
      borderBottom: `1px solid ${portalTheme.colors.lineTable}`,
      fontSize: "13px",
      color: portalTheme.colors.textPrimary,
      whiteSpace: "nowrap",
    },
    tdStrong: {
      padding: "9px 12px",
      borderBottom: `1px solid ${portalTheme.colors.lineTable}`,
      fontSize: "13px",
      fontWeight: 800,
      color: portalTheme.colors.textStrong,
      whiteSpace: "nowrap",
    },
    row: {
      cursor: "pointer",
      transition: "background 0.16s ease, box-shadow 0.16s ease, transform 0.16s ease",
    },
    selectedRow: {
      background: "linear-gradient(90deg, rgba(217, 45, 32, 0.08) 0%, rgba(255,255,255,0.9) 28%)",
      boxShadow: `inset 4px 0 0 ${portalTheme.colors.primary}`,
    },
    phoneText: {
      color: portalTheme.colors.textMuted,
      fontVariantNumeric: "tabular-nums",
    },
    statusCell: {
      padding: "9px 12px",
      borderBottom: `1px solid ${portalTheme.colors.lineTable}`,
      whiteSpace: "nowrap",
      width: "108px",
      minWidth: "108px",
    },
    loginBadge: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      minWidth: "78px",
      padding: "6px 11px",
      borderRadius: portalTheme.radius.pill,
      fontSize: "11px",
      fontWeight: 800,
      border: `1px solid ${portalTheme.colors.line}`,
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.68)",
      letterSpacing: "0.01em",
    },
    loginBadgeActive: {
      color: "#166534",
      background: "linear-gradient(180deg, rgba(34, 197, 94, 0.16) 0%, rgba(255,255,255,0.92) 100%)",
      border: "1px solid rgba(34, 197, 94, 0.2)",
    },
    loginBadgeInactive: {
      color: "#5b6576",
      background: "linear-gradient(180deg, rgba(226,232,240,0.84) 0%, rgba(255,255,255,0.96) 100%)",
      border: "1px solid rgba(180, 192, 208, 0.24)",
    },
    tdExtension: {
      padding: "9px 12px 9px 8px",
      borderBottom: `1px solid ${portalTheme.colors.lineTable}`,
      width: "224px",
      minWidth: "224px",
      whiteSpace: "nowrap",
    },
    tdConsult: {
      padding: "9px 12px 9px 8px",
      borderBottom: `1px solid ${portalTheme.colors.lineTable}`,
      width: "284px",
      minWidth: "284px",
      whiteSpace: "nowrap",
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
    const loginStatus = getStudentLoginStatus(st);
    const normalizedStudentStatus = s(st.status).trim() || "등록";
    const loginBadgeStyle =
      loginStatus === "active"
        ? { ...styles.loginBadge, ...styles.loginBadgeActive }
        : { ...styles.loginBadge, ...styles.loginBadgeInactive };
    const statusBadgeStyle = {
      ...styles.loginBadge,
      ...getStatusStyle(normalizedStudentStatus),
    };

    return (
      <tr
        key={rowKey}
        onClick={() => selectionId && onSelectStudent(selectionId)}
        onDoubleClick={() => selectionId && onDoubleClick(selectionId)}
        style={{ ...styles.row, ...(isSelected ? styles.selectedRow : {}) }}
      >
        <td style={styles.tdStrong}>{s(st.name)}</td>
        <td style={styles.td}>{getBranchLabel(s(st.branch_id))}</td>
        <td style={styles.td}>{s(st.school_name)}</td>
        <td style={styles.td}>{s(st.grade)}</td>
        <td style={{ ...styles.td, ...styles.phoneText }}>{s((st as Student & { phone?: string }).phone) || "-"}</td>
        <td style={styles.statusCell}>
          <span style={loginBadgeStyle}>{loginStatus}</span>
        </td>
        <td style={styles.statusCell}>
          <span style={statusBadgeStyle}>{normalizedStudentStatus}</span>
        </td>
        <td style={styles.tdExtension}>
          <StudentRowStatusPanel tabs={["3모", "6모", "9모", "수능"]} tint="blue" initialValue="3모" />
        </td>
        <td style={styles.tdConsult}>
          <StudentRowStatusPanel tabs={["기본", "3모", "6모", "9모", "수능"]} tint="green" initialValue="기본" />
        </td>
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
              <th style={styles.th}>지점</th>
              <th style={styles.th}>학교</th>
              <th style={styles.th}>학년</th>
              <th style={styles.th}>핸드폰번호</th>
              <th style={styles.th}>로그인여부</th>
              <th style={styles.th}>상태</th>
              <th style={styles.thExtension}>성적</th>
              <th style={styles.thConsult}>상담</th>
            </tr>
          </thead>
          <tbody>{studentRows}</tbody>
        </table>
      )}
    </div>
  );
}

export const StudentTable = memo(StudentTableComponent);
