import React, { memo, useEffect, useMemo, useRef, useState } from "react";
import { normalizeStudentId, type Student } from "@/lib/dataService";
import { EmptyState } from "@/components/EmptyState";
import { StudentRowStatusPanel } from "@/components/StudentRowStatusPanel";
import {
  EXAM_LABELS,
  EXAM_SAVE_GROUPS,
  getCanonicalExamId,
  hasExamSaved,
  resolveExamSaveGroup,
  type ExamSaveGroup,
} from "@/lib/examSaveState";
import { CONSULT_TYPE_SHORT, type ConsultType } from "@/lib/consult-data";
import { portalTheme } from "@/lib/theme";

type StudentListItem = Student & {
  id?: string | number;
  account_id?: string | number;
};

interface StudentTableProps {
  students: Student[];
  selectedStudentId: string | null;
  loading: boolean;
  canManageStudents?: boolean;
  onSelectStudent: (id: string) => void;
  onDoubleClick: (id: string) => void;
  onOpenDetail: (id: string) => void;
  onQuickStatusChange?: (student: Student, updates: { loginStatus?: string; status?: string }) => Promise<void>;
  getBranchLabel: (branchId: string | undefined) => string;
  getStudentLoginStatus: (student: Student) => string;
  getStatusStyle: (status: string | undefined) => React.CSSProperties;
  getAverageNumber: (student: Student) => number;
  s: (value: unknown) => string;
  onOpenExamEditor?: (studentId: string, examId: string) => void;
  onOpenConsultPanel?: (studentId: string, consultType: string, studentInfo: { name: string; branch: string; school: string; grade: string }) => void;
  consultFilledMap?: Record<string, ConsultType[]>;
}

function StudentTableComponent({
  students,
  selectedStudentId,
  loading,
  canManageStudents = false,
  onSelectStudent,
  onDoubleClick,
  onOpenDetail,
  onQuickStatusChange,
  getBranchLabel,
  getStudentLoginStatus,
  getStatusStyle,
  getAverageNumber,
  s,
  onOpenExamEditor,
  onOpenConsultPanel,
  consultFilledMap,
}: StudentTableProps) {
  void getStatusStyle;
  void getAverageNumber;

  const styles: Record<string, React.CSSProperties> = {
    tableWrap: {
      overflowX: "auto",
      overflowY: "visible",
      borderRadius: "18px",
    },
    table: {
      width: "max-content",
      minWidth: "100%",
      borderCollapse: "separate",
      borderSpacing: 0,
    },
    thLeft: {
      padding: "14px 12px",
      borderBottom: `1px solid ${portalTheme.colors.lineStrong}`,
      background: "#f3f6fa",
      textAlign: "left",
      fontSize: "13px",
      color: portalTheme.colors.textPrimary,
      whiteSpace: "nowrap",
      fontWeight: 900,
      verticalAlign: "middle",
    },
    thCenter: {
      padding: "14px 12px",
      borderBottom: `1px solid ${portalTheme.colors.lineStrong}`,
      background: "#f3f6fa",
      textAlign: "center",
      fontSize: "13px",
      color: portalTheme.colors.textPrimary,
      whiteSpace: "nowrap",
      fontWeight: 900,
      verticalAlign: "middle",
    },
    thExtension: {
      width: "224px",
      minWidth: "224px",
    },
    thConsult: {
      width: "284px",
      minWidth: "284px",
    },
    tdLeft: {
      padding: "14px 12px",
      borderBottom: `1px solid ${portalTheme.colors.lineTable}`,
      fontSize: "14px",
      color: portalTheme.colors.textPrimary,
      whiteSpace: "nowrap",
      textAlign: "left",
      verticalAlign: "middle",
      background: "transparent",
    },
    tdStrong: {
      padding: "14px 12px",
      borderBottom: `1px solid ${portalTheme.colors.lineTable}`,
      fontSize: "15px",
      fontWeight: 900,
      color: portalTheme.colors.textStrong,
      whiteSpace: "nowrap",
      textAlign: "left",
      verticalAlign: "middle",
      background: "transparent",
    },
    tdCenter: {
      padding: "14px 12px",
      borderBottom: `1px solid ${portalTheme.colors.lineTable}`,
      fontSize: "14px",
      color: portalTheme.colors.textPrimary,
      whiteSpace: "nowrap",
      textAlign: "center",
      verticalAlign: "middle",
      background: "transparent",
    },
    row: {
      cursor: "pointer",
      transition: "background-color 0.16s ease, box-shadow 0.16s ease",
    },
    selectedRow: {
      backgroundColor: "transparent",
      boxShadow: "none",
    },
    hoveredRow: {
      backgroundColor: "rgba(217, 45, 32, 0.05)",
      boxShadow: "inset 4px 0 0 rgba(217, 45, 32, 0.56)",
    },
    phoneText: {
      color: portalTheme.colors.textMuted,
      fontVariantNumeric: "tabular-nums",
      display: "inline-block",
      width: "100%",
      textAlign: "left",
    },
    detailButton: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      border: `1px solid ${portalTheme.colors.primaryTint}`,
      borderRadius: portalTheme.radius.pill,
      background: portalTheme.colors.primarySoft,
      color: portalTheme.colors.primaryStrong,
      fontSize: "12px",
      fontWeight: 900,
      minHeight: "34px",
      padding: "7px 14px",
      cursor: "pointer",
      whiteSpace: "nowrap",
      flexShrink: 0,
    },
    statusCell: {
      padding: "14px 12px",
      borderBottom: `1px solid ${portalTheme.colors.lineTable}`,
      whiteSpace: "nowrap",
      width: "108px",
      minWidth: "108px",
      textAlign: "center",
      verticalAlign: "middle",
      background: "transparent",
    },
    loginBadge: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      minWidth: "78px",
      padding: "6px 11px",
      borderRadius: portalTheme.radius.pill,
      fontSize: "11px",
      fontWeight: 900,
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
      padding: "14px 12px 14px 8px",
      borderBottom: `1px solid ${portalTheme.colors.lineTable}`,
      width: "224px",
      minWidth: "224px",
      whiteSpace: "nowrap",
      textAlign: "center",
      verticalAlign: "middle",
      background: "transparent",
    },
    tdConsult: {
      padding: "14px 12px 14px 8px",
      borderBottom: `1px solid ${portalTheme.colors.lineTable}`,
      width: "284px",
      minWidth: "284px",
      whiteSpace: "nowrap",
      textAlign: "center",
      verticalAlign: "middle",
      background: "transparent",
    },
    shortcutCell: {
      padding: "14px 12px",
      borderBottom: `1px solid ${portalTheme.colors.lineTable}`,
      width: "112px",
      minWidth: "112px",
      textAlign: "center",
      verticalAlign: "middle",
      background: "transparent",
    },
    panelCellInner: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: "100%",
    },
    badgeButton: {
      appearance: "none",
      background: "transparent",
      border: "none",
      padding: 0,
      margin: 0,
      cursor: canManageStudents ? "pointer" : "default",
    },
    badgeButtonDisabled: {
      cursor: "default",
    },
    inlineEditorWrap: {
      position: "relative",
      display: "inline-flex",
      justifyContent: "center",
    },
    inlineMenu: {
      position: "absolute",
      top: "calc(100% + 10px)",
      left: "50%",
      transform: "translateX(-50%)",
      minWidth: "132px",
      padding: "8px",
      borderRadius: "16px",
      border: `1px solid ${portalTheme.colors.line}`,
      background: "rgba(255,255,255,0.98)",
      boxShadow: portalTheme.shadows.cardStrong,
      display: "flex",
      flexDirection: "column",
      gap: "6px",
      zIndex: 30,
      backdropFilter: "blur(12px)",
    },
    inlineMenuOption: {
      border: `1px solid ${portalTheme.colors.line}`,
      background: portalTheme.colors.surfaceCard,
      color: portalTheme.colors.textPrimary,
      borderRadius: "12px",
      padding: "8px 10px",
      fontSize: "12px",
      fontWeight: 800,
      cursor: "pointer",
      whiteSpace: "nowrap",
      transition: "background 0.16s ease, border-color 0.16s ease, transform 0.16s ease",
    },
    inlineMenuOptionActive: {
      background: portalTheme.colors.primarySoft,
      border: `1px solid ${portalTheme.colors.primaryTint}`,
      color: portalTheme.colors.primaryStrong,
    },
    inlineMenuHint: {
      fontSize: "11px",
      color: portalTheme.colors.textMuted,
      padding: "2px 4px 0",
      textAlign: "center",
      whiteSpace: "nowrap",
    },
    savingBadge: {
      opacity: 0.7,
      filter: "saturate(0.88)",
    },
  };

  const [hoveredStudentId, setHoveredStudentId] = useState<string | null>(null);
  const [openEditorKey, setOpenEditorKey] = useState<string | null>(null);
  const [savingEditorKey, setSavingEditorKey] = useState<string | null>(null);
  const editorWrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!openEditorKey) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (editorWrapRef.current && event.target instanceof Node && !editorWrapRef.current.contains(event.target)) {
        setOpenEditorKey(null);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenEditorKey(null);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [openEditorKey]);

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
    const examScores = (st as Student & { exam_scores?: Record<string, Partial<Student>> }).exam_scores || {};
    const scoreTabs = EXAM_SAVE_GROUPS.map((group: ExamSaveGroup) => ({
      label: EXAM_LABELS[group],
      examId: getCanonicalExamId(group),
      group,
    }));
    const filledScoreTabs = scoreTabs
      .filter(({ group }) => {
        const saved = hasExamSaved({ exam_scores: examScores }, group);
        if (process.env.NODE_ENV !== "production") {
          console.info("[StudentTable] saved-state", {
            student_id: selectionId,
            group,
            saved,
            examScores,
          });
        }
        return saved;
      })
      .map(({ label }) => label);
    const activeScoreTab =
      scoreTabs.find(({ examId }) => {
        const examGroup = resolveExamSaveGroup(s(st.exam_id).trim());
        return (examGroup ? getCanonicalExamId(examGroup) : s(st.exam_id).trim()) === examId;
      })?.label || "";
    const isHovered = Boolean(selectionId) && hoveredStudentId === selectionId;
    const loginEditorKey = `${selectionId}:login`;
    const statusEditorKey = `${selectionId}:status`;
    const loginSaving = savingEditorKey === loginEditorKey;
    const statusSaving = savingEditorKey === statusEditorKey;

    return (
      <tr
        key={rowKey}
        onClick={() => selectionId && onSelectStudent(selectionId)}
        onDoubleClick={() => selectionId && onDoubleClick(selectionId)}
        onMouseEnter={() => setHoveredStudentId(selectionId || null)}
        onMouseLeave={() => setHoveredStudentId((prev) => (prev === selectionId ? null : prev))}
        style={{
          ...styles.row,
          ...(isSelected ? styles.selectedRow : {}),
          ...(isHovered ? styles.hoveredRow : {}),
        }}
      >
        <td style={styles.tdStrong}>{s(st.name)}</td>
        <td style={styles.tdLeft}>{getBranchLabel(s(st.branch_id))}</td>
        <td style={styles.tdLeft}>{s(st.school_name)}</td>
        <td style={styles.tdCenter}>{s(st.grade)}</td>
        <td style={styles.tdLeft}>
          <span style={styles.phoneText}>{s((st as Student & { phone?: string }).phone) || "-"}</span>
        </td>
        <td style={styles.shortcutCell}>
          <button
            type="button"
            style={styles.detailButton}
            onClick={(event) => {
              event.stopPropagation();

              if (selectionId) {
                onOpenDetail(selectionId);
              }
            }}
            onDoubleClick={(event) => event.stopPropagation()}
          >
            상세보기
          </button>
        </td>
        <td style={styles.statusCell}>
          <div
            ref={openEditorKey === loginEditorKey ? editorWrapRef : null}
            style={styles.inlineEditorWrap}
          >
            <button
              type="button"
              style={{
                ...styles.badgeButton,
                ...(!canManageStudents || !onQuickStatusChange ? styles.badgeButtonDisabled : null),
              }}
              disabled={!canManageStudents || !onQuickStatusChange || loginSaving}
              onClick={(event) => {
                event.stopPropagation();

                if (!canManageStudents || !onQuickStatusChange) {
                  return;
                }

                setOpenEditorKey((prev) => (prev === loginEditorKey ? null : loginEditorKey));
              }}
            >
              <span style={{ ...loginBadgeStyle, ...(loginSaving ? styles.savingBadge : null) }}>{loginStatus}</span>
            </button>
            {openEditorKey === loginEditorKey && canManageStudents && onQuickStatusChange ? (
              <div style={styles.inlineMenu} onClick={(event) => event.stopPropagation()}>
                {["active", "inactive"].map((option) => (
                  <button
                    key={option}
                    type="button"
                    style={{
                      ...styles.inlineMenuOption,
                      ...(loginStatus === option ? styles.inlineMenuOptionActive : null),
                    }}
                    disabled={loginSaving}
                    onClick={async (event) => {
                      event.stopPropagation();

                      if (loginStatus === option) {
                        setOpenEditorKey(null);
                        return;
                      }

                      try {
                        setOpenEditorKey(null);
                        setSavingEditorKey(loginEditorKey);
                        await onQuickStatusChange(st, { loginStatus: option });
                      } finally {
                        setSavingEditorKey((prev) => (prev === loginEditorKey ? null : prev));
                      }
                    }}
                  >
                    {option}
                  </button>
                ))}
                <div style={styles.inlineMenuHint}>클릭하면 바로 저장됩니다</div>
              </div>
            ) : null}
          </div>
        </td>
        <td style={styles.statusCell}>
          <div
            ref={openEditorKey === statusEditorKey ? editorWrapRef : null}
            style={styles.inlineEditorWrap}
          >
            <button
              type="button"
              style={{
                ...styles.badgeButton,
                ...(!canManageStudents || !onQuickStatusChange ? styles.badgeButtonDisabled : null),
              }}
              disabled={!canManageStudents || !onQuickStatusChange || statusSaving}
              onClick={(event) => {
                event.stopPropagation();

                if (!canManageStudents || !onQuickStatusChange) {
                  return;
                }

                setOpenEditorKey((prev) => (prev === statusEditorKey ? null : statusEditorKey));
              }}
            >
              <span style={{ ...statusBadgeStyle, ...(statusSaving ? styles.savingBadge : null) }}>{normalizedStudentStatus}</span>
            </button>
            {openEditorKey === statusEditorKey && canManageStudents && onQuickStatusChange ? (
              <div style={styles.inlineMenu} onClick={(event) => event.stopPropagation()}>
                {["등록", "휴원", "졸업", "퇴원"].map((option) => (
                  <button
                    key={option}
                    type="button"
                    style={{
                      ...styles.inlineMenuOption,
                      ...(normalizedStudentStatus === option ? styles.inlineMenuOptionActive : null),
                    }}
                    disabled={statusSaving}
                    onClick={async (event) => {
                      event.stopPropagation();

                      if (normalizedStudentStatus === option) {
                        setOpenEditorKey(null);
                        return;
                      }

                      try {
                        setOpenEditorKey(null);
                        setSavingEditorKey(statusEditorKey);
                        await onQuickStatusChange(st, { status: option });
                      } finally {
                        setSavingEditorKey((prev) => (prev === statusEditorKey ? null : prev));
                      }
                    }}
                  >
                    {option}
                  </button>
                ))}
                <div style={styles.inlineMenuHint}>클릭하면 바로 저장됩니다</div>
              </div>
            ) : null}
          </div>
        </td>
        <td style={styles.tdExtension}>
          <div style={styles.panelCellInner}>
            <StudentRowStatusPanel
              tabs={["3모", "6모", "9모", "수능"]}
              tint="blue"
              activeTab={activeScoreTab}
              filledTabs={filledScoreTabs}
              savedStyle="success"
              initialValue="3모"
              onTabClick={(tab) => {
                if (!selectionId || !onOpenExamEditor) {
                  return;
                }

                const matchedExam = scoreTabs.find((item) => item.label === tab);
                if (!matchedExam) {
                  return;
                }

                onOpenExamEditor(selectionId, matchedExam.examId);
              }}
            />
          </div>
        </td>
        <td style={styles.tdConsult}>
          <div style={styles.panelCellInner}>
            <StudentRowStatusPanel
              tabs={["기본", "3모", "6모", "9모", "수능"]}
              tint="green"
              initialValue="기본"
              filledTabs={(consultFilledMap?.[selectionId] ?? []).map(
                (t) => CONSULT_TYPE_SHORT[t]
              )}
              onTabClick={(tab) => {
                if (!selectionId || !onOpenConsultPanel) return;
                onOpenConsultPanel(selectionId, tab, {
                  name: s(st.name),
                  branch: getBranchLabel(s(st.branch_id)),
                  school: s(st.school_name),
                  grade: s(st.grade),
                });
              }}
            />
          </div>
        </td>
      </tr>
    );
  });

  return (
    <div style={styles.tableWrap}>
      {loading ? (
        <EmptyState title="불러오는 중입니다" description="학생 목록을 불러오고 있습니다." />
      ) : visibleStudents.length === 0 ? (
        <EmptyState title="검색 결과가 없습니다" description="검색어 또는 필터 조건을 확인해 주세요." />
      ) : (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.thLeft}>이름</th>
              <th style={styles.thLeft}>지점</th>
              <th style={styles.thLeft}>학교</th>
              <th style={styles.thCenter}>학년</th>
              <th style={styles.thLeft}>핸드폰번호</th>
              <th style={styles.thCenter}>바로가기</th>
              <th style={styles.thCenter}>로그인여부</th>
              <th style={styles.thCenter}>상태</th>
              <th style={{ ...styles.thCenter, ...styles.thExtension }}>성적</th>
              <th style={{ ...styles.thCenter, ...styles.thConsult }}>상담</th>
            </tr>
          </thead>
          <tbody>{studentRows}</tbody>
        </table>
      )}
    </div>
  );
}

export const StudentTable = memo(StudentTableComponent);
