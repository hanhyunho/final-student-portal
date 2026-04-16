import React, { useMemo, useState } from "react";
import type { Branch, MockExam, MockScore, PhysicalRecord, PhysicalTest, Student } from "@/lib/dataService";
import type { ConsultType } from "@/lib/consult-data";
import { DashboardStats } from "@/components/DashboardStats";
import { StatsPanel } from "@/components/StatsPanel";
import { ChartPanel } from "@/components/ChartPanel";
import { StudentTable } from "@/components/StudentTable";
import { EmptyState } from "@/components/EmptyState";
import { getFeedbackPalette, portalButtonStyles, portalTheme } from "@/lib/theme";

type FeedbackMessage = {
  type: "success" | "error" | "info";
  message: string;
};

type DashboardView = "branch-analysis" | "student-management";

interface AdminDashboardProps {
  feedback: FeedbackMessage | null;
  loading: boolean;
  activeView: DashboardView;
  selectedStudent: Student | null;
  selectedStudentId: string | null;
  mockExams: MockExam[];
  filteredStudents: Student[];
  scopedBranches: Branch[];
  scopedStudents: Student[];
  scopedMockScores: MockScore[];
  scopedPhysicalRecords: PhysicalRecord[];
  physicalTests: PhysicalTest[];
  branchOptions: string[];
  branchFilter: string;
  loginFilter: string;
  studentStatusFilter: string;
  sortType: string;
  searchInput: string;
  summary: {
    count: number;
    avgScore: string;
    topAvg: string;
    activeCount: number;
  };
  quickStats: {
    avg80: number;
    koreanTop: number;
    mathTop: number;
    active: number;
  };
  selectedIndex: number;
  canManageStudents: boolean;
  isSuperAdmin: boolean;
  onSearchInputChange: (value: string) => void;
  onBranchFilterChange: (value: string) => void;
  onLoginFilterChange: (value: string) => void;
  onStudentStatusFilterChange: (value: string) => void;
  onSortTypeChange: (value: string) => void;
  onSelectStudent: (studentId: string) => void;
  onOpenDetail: (studentId?: string) => void;
  onMoveSelection: (direction: "prev" | "next") => void;
  onPrint: () => void;
  onAdd: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onQuickStatusChange?: (student: Student, updates: { loginStatus?: string; status?: string }) => Promise<void>;
  getAverageNumber: (student: Student) => number;
  getStudentLoginStatus: (student: Student) => string;
  getStatusStyle: (status: string | undefined) => React.CSSProperties;
  getBranchLabel: (branchId: string | undefined) => string;
  s: (value: unknown) => string;
  onOpenExamEditor?: (studentId: string, examId: string) => void;
  onOpenConsultPanel?: (studentId: string, consultType: string, studentInfo: { name: string; branch: string; school: string; grade: string }) => void;
  consultFilledMap?: Record<string, ConsultType[]>;
}

export function AdminDashboard({
  feedback,
  loading,
  activeView,
  selectedStudent,
  selectedStudentId,
  mockExams,
  filteredStudents,
  scopedBranches,
  scopedStudents,
  scopedMockScores,
  scopedPhysicalRecords,
  physicalTests,
  branchOptions,
  branchFilter,
  loginFilter,
  studentStatusFilter,
  sortType,
  searchInput,
  summary,
  quickStats,
  selectedIndex,
  canManageStudents,
  isSuperAdmin,
  onSearchInputChange,
  onBranchFilterChange,
  onLoginFilterChange,
  onStudentStatusFilterChange,
  onSortTypeChange,
  onSelectStudent,
  onOpenDetail,
  onMoveSelection,
  onPrint,
  onAdd,
  onEdit,
  onDelete,
  onQuickStatusChange,
  getAverageNumber,
  getStudentLoginStatus,
  getStatusStyle,
  getBranchLabel,
  s,
  onOpenExamEditor,
  onOpenConsultPanel,
  consultFilledMap,
}: AdminDashboardProps) {
  const bannerStyle = feedback ? getFeedbackPalette(feedback.type) : null;
  const [visibleCount, setVisibleCount] = useState("10");

  const visibleStudents = useMemo(() => {
    const limit = Number(visibleCount);

    if (!Number.isFinite(limit) || limit <= 0) {
      return filteredStudents;
    }

    return filteredStudents.slice(0, limit);
  }, [filteredStudents, visibleCount]);

  return (
    <div style={pageStackStyle}>
      {feedback ? (
        <div
          style={{
            ...bannerStyle,
            borderStyle: "solid",
            borderWidth: "1px",
            borderRadius: "16px",
            padding: "14px 16px",
            fontSize: "14px",
            fontWeight: 700,
          }}
        >
          {feedback.message}
        </div>
      ) : null}

      {activeView === "branch-analysis" ? (
        <>
          <section style={analysisIntroStyle}>
            <div>
              <h2 style={heroTitleStyle}>지점별 비교 분석</h2>
              <div style={heroAccentStyle} />
              <p style={heroDescriptionStyle}>
                지점별 TOP 분석, 평균 비교 차트, 요약 카드만 한눈에 보이도록 비교 화면을 정리했습니다.
              </p>
            </div>
          </section>

          <DashboardStats summary={summary} quickStats={quickStats} />
          <StatsPanel
            branches={scopedBranches}
            students={scopedStudents}
            mockExams={mockExams}
            mockScores={scopedMockScores}
            physicalTests={physicalTests}
            physicalRecords={scopedPhysicalRecords}
          />
          <ChartPanel
            branches={scopedBranches}
            students={scopedStudents}
            physicalTests={physicalTests}
            physicalRecords={scopedPhysicalRecords}
          />
        </>
      ) : (
        <>
          <section style={managementIntroStyle}>
            <div>
              <h2 style={heroTitleStyle}>지점 학생 관리</h2>
              <div style={heroAccentStyle} />
              <p style={heroDescriptionStyle}>
                학생 목록과 필터 중심으로 관리하고, 학생 상세는 학생별 상세보기에서 크게 확인할 수 있습니다.
              </p>
            </div>
          </section>

          <section style={managementSectionStyle}>
            <div style={filterRowStyle}>
              <input
                type="text"
                placeholder="이름 / 학교 / 학번 검색"
                value={searchInput}
                onChange={(event) => onSearchInputChange(event.target.value)}
                style={searchFieldStyle}
              />

              {isSuperAdmin ? (
                <select value={branchFilter} onChange={(event) => onBranchFilterChange(event.target.value)} style={compactSelectStyle}>
                  {branchOptions.map((branch) => (
                    <option key={branch} value={branch}>
                      {branch === "ALL" ? "전체 지점" : getBranchLabel(branch)}
                    </option>
                  ))}
                </select>
              ) : null}

              <select value={loginFilter} onChange={(event) => onLoginFilterChange(event.target.value)} style={compactSelectStyle}>
                <option value="ALL">전체 로그인여부</option>
                <option value="active">active</option>
                <option value="inactive">inactive</option>
              </select>

              <select value={studentStatusFilter} onChange={(event) => onStudentStatusFilterChange(event.target.value)} style={compactSelectStyle}>
                <option value="ALL">전체 상태</option>
                <option value="등록">등록</option>
                <option value="휴원">휴원</option>
                <option value="졸업">졸업</option>
                <option value="퇴원">퇴원</option>
              </select>

              <select value={sortType} onChange={(event) => onSortTypeChange(event.target.value)} style={compactSelectStyle}>
                <option value="default">기본순</option>
                <option value="name">이름순</option>
                <option value="studentNo">학번순</option>
                <option value="avgDesc">평균 높은순</option>
                <option value="koreanDesc">국어 높은순</option>
                <option value="mathDesc">수학 높은순</option>
                <option value="englishDesc">영어 높은순</option>
              </select>

              <select value={visibleCount} onChange={(event) => setVisibleCount(event.target.value)} style={countSelectStyle}>
                <option value="10">10명</option>
                <option value="20">20명</option>
                <option value="30">30명</option>
              </select>
            </div>

            <div style={toolbarStyle}>
              <div style={toolbarInfoStyle}>
                <span
                  style={{
                    ...toolbarPillStyle,
                    background: selectedStudent ? portalTheme.colors.surfaceAccent : portalTheme.colors.surfacePanel,
                    color: selectedStudent ? portalTheme.colors.textStrong : portalTheme.colors.textMuted,
                    border: `1px solid ${selectedStudent ? portalTheme.colors.primaryTint : portalTheme.colors.line}`,
                  }}
                >
                  선택 학생: {selectedStudent ? s(selectedStudent.name) : "학생을 선택하세요"}
                </span>
                <span style={toolbarPillStyle}>목록 {visibleStudents.length} / 전체 {filteredStudents.length}</span>
              </div>

              <div style={toolbarButtonsStyle}>
                <button style={secondaryButtonStyle} onClick={() => onMoveSelection("prev")} disabled={filteredStudents.length === 0 || selectedIndex <= 0}>
                  이전
                </button>
                <button
                  style={secondaryButtonStyle}
                  onClick={() => onMoveSelection("next")}
                  disabled={filteredStudents.length === 0 || selectedIndex === -1 || selectedIndex >= filteredStudents.length - 1}
                >
                  다음
                </button>
                {canManageStudents ? (
                  <button style={secondaryButtonStyle} onClick={onEdit} disabled={!selectedStudent}>
                    수정
                  </button>
                ) : null}
                {canManageStudents ? (
                  <button style={dangerButtonStyle} onClick={onDelete} disabled={!selectedStudent}>
                    삭제
                  </button>
                ) : null}
                {canManageStudents ? (
                  <button style={primaryButtonStyle} onClick={onAdd}>
                    + 학생 추가
                  </button>
                ) : null}
                <button style={secondaryButtonStyle} onClick={onPrint}>
                  목록 인쇄
                </button>
              </div>
            </div>

            <div style={tableSurfaceStyle}>
              <StudentTable
                students={visibleStudents}
                selectedStudentId={selectedStudentId}
                loading={loading}
                canManageStudents={canManageStudents}
                onSelectStudent={onSelectStudent}
                onDoubleClick={onOpenDetail}
                onOpenDetail={onOpenDetail}
                onQuickStatusChange={onQuickStatusChange}
                getBranchLabel={getBranchLabel}
                getStudentLoginStatus={getStudentLoginStatus}
                getStatusStyle={getStatusStyle}
                getAverageNumber={getAverageNumber}
                s={s}
                onOpenExamEditor={onOpenExamEditor}
                onOpenConsultPanel={onOpenConsultPanel}
                consultFilledMap={consultFilledMap}
              />
            </div>

            {!selectedStudent ? (
              <EmptyState title="학생을 선택하세요" description="목록에서 학생을 선택하거나 상세보기 버튼으로 학생 상세 화면을 열 수 있습니다." />
            ) : null}
          </section>
        </>
      )}
    </div>
  );
}

const pageStackStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "20px",
};

const heroTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "clamp(34px, 5vw, 58px)",
  fontWeight: 900,
  color: portalTheme.colors.textStrong,
  letterSpacing: "-0.05em",
  lineHeight: 1.02,
};

const heroAccentStyle: React.CSSProperties = {
  width: "96px",
  height: "3px",
  borderRadius: "999px",
  marginTop: "10px",
  background: "linear-gradient(90deg, #2563eb 0%, #d92d20 100%)",
};

const heroDescriptionStyle: React.CSSProperties = {
  margin: "10px 0 0",
  color: portalTheme.colors.textPrimary,
  fontSize: "15px",
  lineHeight: 1.7,
  fontWeight: 600,
  maxWidth: "760px",
};

const analysisIntroStyle: React.CSSProperties = {
  background: portalTheme.gradients.card,
  border: `1px solid ${portalTheme.colors.line}`,
  borderRadius: "22px",
  borderLeft: "5px solid #7c3aed",
  padding: "18px 18px 16px",
  boxShadow: portalTheme.shadows.panel,
};

const managementIntroStyle: React.CSSProperties = {
  background: portalTheme.gradients.card,
  border: `1px solid ${portalTheme.colors.line}`,
  borderRadius: "22px",
  borderLeft: `5px solid ${portalTheme.colors.primaryStrong}`,
  padding: "18px 18px 16px",
  boxShadow: portalTheme.shadows.panel,
};

const managementSectionStyle: React.CSSProperties = {
  background: portalTheme.gradients.card,
  border: `1px solid ${portalTheme.colors.line}`,
  borderRadius: "22px",
  padding: "14px",
  boxShadow: portalTheme.shadows.panel,
  display: "flex",
  flexDirection: "column",
  gap: "18px",
};

const filterRowStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "10px",
  alignItems: "center",
};

const toolbarStyle: React.CSSProperties = {
  background: portalTheme.colors.surfaceCard,
  border: `1px solid ${portalTheme.colors.line}`,
  borderRadius: "18px",
  boxShadow: portalTheme.shadows.soft,
  padding: "10px 12px",
  display: "flex",
  flexWrap: "wrap",
  gap: "12px",
  justifyContent: "space-between",
  alignItems: "center",
};

const toolbarInfoStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  flexWrap: "wrap",
};

const toolbarButtonsStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
};

const toolbarPillStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "9px 14px",
  borderRadius: portalTheme.radius.pill,
  background: portalTheme.colors.surfacePanel,
  color: portalTheme.colors.textMuted,
  fontSize: "13px",
  fontWeight: 800,
  border: `1px solid ${portalTheme.colors.line}`,
};

const fieldStyle: React.CSSProperties = {
  minWidth: 0,
  padding: "0 14px",
  borderRadius: "14px",
  border: `1px solid ${portalTheme.colors.line}`,
  fontSize: "14px",
  background: portalTheme.colors.surfaceCardAlt,
  color: portalTheme.colors.textStrong,
  boxShadow: "none",
  textAlign: "left",
  minHeight: "48px",
};

const searchFieldStyle: React.CSSProperties = {
  ...fieldStyle,
  flex: "1 1 360px",
  minWidth: "260px",
};

const compactSelectStyle: React.CSSProperties = {
  ...fieldStyle,
  flex: "0 1 150px",
  minWidth: "150px",
};

const countSelectStyle: React.CSSProperties = {
  ...compactSelectStyle,
  flex: "0 0 108px",
  minWidth: "108px",
};

const secondaryButtonStyle: React.CSSProperties = {
  ...portalButtonStyles.secondary,
  padding: "10px 14px",
  fontSize: "14px",
  cursor: "pointer",
};

const dangerButtonStyle: React.CSSProperties = {
  ...portalButtonStyles.warning,
  padding: '10px 14px',
  fontSize: '14px',
  cursor: 'pointer',
};

const primaryButtonStyle: React.CSSProperties = {
  ...portalButtonStyles.primary,
  padding: "10px 16px",
  fontSize: "14px",
  cursor: "pointer",
};

const tableSurfaceStyle: React.CSSProperties = {
  background: portalTheme.colors.surfaceCardAlt,
  border: `1px solid ${portalTheme.colors.line}`,
  borderRadius: "20px",
  padding: "14px 16px",
  boxShadow: portalTheme.shadows.soft,
};
