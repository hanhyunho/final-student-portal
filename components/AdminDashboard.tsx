import React, { useMemo, useState } from "react";
import type {
  Branch,
  MockExam,
  MockScore,
  PhysicalRecord,
  PhysicalTest,
  Student,
  StudentMockChartPoint,
  StudentPhysicalChartPoint,
} from "@/lib/dataService";
import { DashboardStats } from "@/components/DashboardStats";
import { StatsPanel } from "@/components/StatsPanel";
import { ChartPanel } from "@/components/ChartPanel";
import { StudentTable } from "@/components/StudentTable";
import { StudentDetailPanel } from "@/components/StudentDetailPanel";
import { EmptyState } from "@/components/EmptyState";
import { getFeedbackPalette, portalButtonStyles, portalTheme } from "@/lib/theme";

type FeedbackMessage = {
  type: "success" | "error" | "info";
  message: string;
};

interface AdminDashboardProps {
  feedback: FeedbackMessage | null;
  loading: boolean;
  selectedStudent: Student | null;
  selectedStudentId: string | null;
  selectedStudentMockChartData: StudentMockChartPoint[];
  selectedStudentPhysicalChartData: StudentPhysicalChartPoint[];
  filteredStudents: Student[];
  scopedBranches: Branch[];
  scopedStudents: Student[];
  scopedMockScores: MockScore[];
  scopedPhysicalRecords: PhysicalRecord[];
  mockExams: MockExam[];
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
  onExportAllCsv: () => void;
  onExportBranchCsv: () => void;
  onPrint: () => void;
  onPrintSelected: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAdd: () => void;
  getAverageNumber: (student: Student) => number;
  getStudentLoginStatus: (student: Student) => string;
  getStatusStyle: (status: string | undefined) => React.CSSProperties;
  getGradeBadgeStyle: (grade: string | number | undefined) => React.CSSProperties;
  getBranchLabel: (branchId: string | undefined) => string;
  getScoreNumber: (value: string | number | undefined) => number;
  getBarWidth: (value: string | number | undefined) => string;
  s: (value: unknown) => string;
}

export function AdminDashboard({
  feedback,
  loading,
  selectedStudent,
  selectedStudentId,
  selectedStudentMockChartData,
  selectedStudentPhysicalChartData,
  filteredStudents,
  scopedBranches,
  scopedStudents,
  scopedMockScores,
  scopedPhysicalRecords,
  mockExams,
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
  onExportAllCsv,
  onExportBranchCsv,
  onPrint,
  onPrintSelected,
  onEdit,
  onDelete,
  onAdd,
  getAverageNumber,
  getStudentLoginStatus,
  getStatusStyle,
  getGradeBadgeStyle,
  getBranchLabel,
  getScoreNumber,
  getBarWidth,
  s,
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
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {feedback ? (
        <div
          style={{
            ...bannerStyle,
            border: "1px solid",
            borderRadius: "16px",
            padding: "14px 16px",
            fontSize: "14px",
            fontWeight: 700,
          }}
        >
          {feedback.message}
        </div>
      ) : null}

      <DashboardStats summary={summary} quickStats={quickStats} />
      <StatsPanel
        branches={scopedBranches}
        students={scopedStudents}
        mockExams={mockExams}
        mockScores={scopedMockScores}
        physicalTests={physicalTests}
        physicalRecords={scopedPhysicalRecords}
      />
      <ChartPanel branches={scopedBranches} students={scopedStudents} physicalTests={physicalTests} physicalRecords={scopedPhysicalRecords} />

      <section
        style={{
          background: portalTheme.gradients.card,
          border: `1px solid ${portalTheme.colors.line}`,
          borderRadius: portalTheme.radius.md,
          borderLeft: `5px solid ${portalTheme.colors.primaryStrong}`,
          padding: "clamp(16px, 3vw, 22px)",
          boxShadow: portalTheme.shadows.panel,
          display: "flex",
          flexDirection: "column",
          gap: "18px",
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "10px",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: "clamp(20px, 3vw, 24px)", fontWeight: 900, color: portalTheme.colors.textStrong, letterSpacing: "-0.03em" }}>학생 관리</h2>
            <p style={{ margin: "6px 0 0 0", color: portalTheme.colors.textMuted, fontSize: "14px", lineHeight: 1.6 }}>
              학생 목록에서 학생을 선택하면 아래 영역에서 핵심 정보와 추이 차트를 바로 확인할 수 있습니다.
            </p>
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          <input
            type="text"
            placeholder="이름 / 학교 / 학번 검색"
            value={searchInput}
            onChange={(event) => onSearchInputChange(event.target.value)}
            style={fieldStyle}
          />

          {isSuperAdmin ? (
            <select value={branchFilter} onChange={(event) => onBranchFilterChange(event.target.value)} style={selectStyle}>
              {branchOptions.map((branch) => (
                <option key={branch} value={branch}>
                  {branch === "ALL" ? "전체 지점" : getBranchLabel(branch)}
                </option>
              ))}
            </select>
          ) : null}

          <select value={loginFilter} onChange={(event) => onLoginFilterChange(event.target.value)} style={selectStyle}>
            <option value="ALL">전체 로그인여부</option>
            <option value="active">active</option>
            <option value="inactive">inactive</option>
          </select>

          <select value={studentStatusFilter} onChange={(event) => onStudentStatusFilterChange(event.target.value)} style={selectStyle}>
            <option value="ALL">전체 상태</option>
            <option value="등록">등록</option>
            <option value="휴원">휴원</option>
            <option value="졸업">졸업</option>
            <option value="퇴원">퇴원</option>
          </select>

          <select value={sortType} onChange={(event) => onSortTypeChange(event.target.value)} style={selectStyle}>
            <option value="default">기본순</option>
            <option value="name">이름순</option>
            <option value="studentNo">학번순</option>
            <option value="avgDesc">평균 높은순</option>
            <option value="koreanDesc">국어 높은순</option>
            <option value="mathDesc">수학 높은순</option>
            <option value="englishDesc">영어 높은순</option>
          </select>

          <select value={visibleCount} onChange={(event) => setVisibleCount(event.target.value)} style={{ ...selectStyle, flex: "0 1 120px" }}>
            <option value="10">10명</option>
            <option value="20">20명</option>
            <option value="30">30명</option>
          </select>
        </div>

        <div
          style={{
            position: "sticky",
            top: "12px",
            zIndex: 10,
            background: portalTheme.colors.surfaceCard,
            border: `1px solid ${portalTheme.colors.line}`,
            borderRadius: portalTheme.radius.md,
            boxShadow: portalTheme.shadows.soft,
            padding: "10px 12px",
            display: "flex",
            flexWrap: "wrap",
            gap: "8px",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "7px 11px",
                borderRadius: portalTheme.radius.pill,
                background: selectedStudent ? portalTheme.colors.surfaceAccent : portalTheme.colors.surfacePanel,
                color: selectedStudent ? portalTheme.colors.textStrong : portalTheme.colors.textMuted,
                fontSize: "12px",
                fontWeight: 800,
                boxShadow: "none",
                border: `1px solid ${selectedStudent ? portalTheme.colors.primaryTint : portalTheme.colors.line}`,
              }}
            >
              선택 학생: {selectedStudent ? s(selectedStudent.name) : "학생을 선택하세요"}
            </span>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "7px 11px",
                borderRadius: portalTheme.radius.pill,
                background: portalTheme.colors.surfacePanel,
                color: portalTheme.colors.textMuted,
                fontSize: "12px",
                fontWeight: 800,
                border: `1px solid ${portalTheme.colors.line}`,
              }}
            >
              목록 {visibleStudents.length} / 전체 {filteredStudents.length}
            </span>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
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
            <button
              style={secondaryButtonStyle}
              onClick={() => selectedStudentId && onOpenDetail(selectedStudentId)}
              disabled={!selectedStudentId}
            >
              상세보기
            </button>
            {canManageStudents ? (
              <button style={primaryButtonStyle} onClick={onEdit} disabled={!selectedStudent}>
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
            <button style={secondaryButtonStyle} onClick={onPrintSelected} disabled={!selectedStudent}>
              학생 인쇄
            </button>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          <div
            style={{
              background: portalTheme.colors.surfaceCardAlt,
              border: `1px solid ${portalTheme.colors.line}`,
              borderRadius: portalTheme.radius.md,
              padding: "clamp(12px, 2.6vw, 16px)",
              boxShadow: portalTheme.shadows.soft,
            }}
          >
            <StudentTable
              students={visibleStudents}
              selectedStudentId={selectedStudentId}
              loading={loading}
              onSelectStudent={onSelectStudent}
              onDoubleClick={onOpenDetail}
              getBranchLabel={getBranchLabel}
              getStudentLoginStatus={getStudentLoginStatus}
              getStatusStyle={getStatusStyle}
              getAverageNumber={getAverageNumber}
              s={s}
            />
          </div>

          {selectedStudent ? (
            <>
              <StudentDetailPanel
                student={selectedStudent}
                mockChartData={selectedStudentMockChartData}
                physicalChartData={selectedStudentPhysicalChartData}
                canManage={canManageStudents}
                sticky={false}
                onEdit={onEdit}
                onDelete={onDelete}
                onShowDetail={() => selectedStudentId && onOpenDetail(selectedStudentId)}
                getAverageNumber={getAverageNumber}
                getGradeBadgeStyle={getGradeBadgeStyle}
                getBranchLabel={getBranchLabel}
                s={s}
              />
            </>
          ) : (
            <EmptyState title="학생을 선택하세요" description="학생을 선택하면 아래 영역에 모의고사 요약과 상세 정보가 표시됩니다." />
          )}
        </div>
      </section>
    </div>
  );
}

const fieldStyle: React.CSSProperties = {
  flex: "1 1 280px",
  minWidth: "min(100%, 220px)",
  padding: "clamp(10px, 2.4vw, 13px) clamp(12px, 2.8vw, 14px)",
  borderRadius: portalTheme.radius.sm,
  border: `1px solid ${portalTheme.colors.line}`,
  fontSize: "clamp(13px, 1.9vw, 14px)",
  background: portalTheme.colors.surfaceCardAlt,
  color: portalTheme.colors.textStrong,
  boxShadow: "none",
};

const selectStyle: React.CSSProperties = {
  ...fieldStyle,
  flex: "0 1 180px",
};

const secondaryButtonStyle: React.CSSProperties = {
  ...portalButtonStyles.secondary,
  padding: "clamp(8px, 2vw, 11px) clamp(11px, 2.6vw, 14px)",
  fontSize: "clamp(12px, 1.8vw, 13px)",
  cursor: "pointer",
};

const primaryButtonStyle: React.CSSProperties = {
  ...portalButtonStyles.primary,
  padding: "clamp(8px, 2vw, 11px) clamp(11px, 2.6vw, 14px)",
  fontSize: "clamp(12px, 1.8vw, 13px)",
  cursor: "pointer",
};

const dangerButtonStyle: React.CSSProperties = {
  ...portalButtonStyles.warning,
  padding: "clamp(8px, 2vw, 11px) clamp(11px, 2.6vw, 14px)",
  fontSize: "clamp(12px, 1.8vw, 13px)",
  cursor: "pointer",
};