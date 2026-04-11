import React from "react";
import type {
  Branch,
  Student,
  StudentMockChartPoint,
  StudentPhysicalChartPoint,
} from "@/lib/dataService";
import { DashboardStats } from "@/components/DashboardStats";
import { StatsPanel } from "@/components/StatsPanel";
import { ChartPanel } from "@/components/ChartPanel";
import { StudentTable } from "@/components/StudentTable";
import { StudentDetailPanel } from "@/components/StudentDetailPanel";
import { StudentChartSection } from "@/components/StudentChartSection";
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
  branchOptions: string[];
  branchFilter: string;
  statusFilter: string;
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
  topStudents: Student[];
  subjectStats: Record<string, string>;
  selectedIndex: number;
  canManageStudents: boolean;
  isSuperAdmin: boolean;
  onSearchInputChange: (value: string) => void;
  onBranchFilterChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
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
  branchOptions,
  branchFilter,
  statusFilter,
  sortType,
  searchInput,
  summary,
  quickStats,
  topStudents,
  subjectStats,
  selectedIndex,
  canManageStudents,
  isSuperAdmin,
  onSearchInputChange,
  onBranchFilterChange,
  onStatusFilterChange,
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
  getStatusStyle,
  getGradeBadgeStyle,
  getBranchLabel,
  getScoreNumber,
  getBarWidth,
  s,
}: AdminDashboardProps) {
  const bannerStyle = feedback ? getFeedbackPalette(feedback.type) : null;

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
        topStudents={topStudents}
        subjectStats={subjectStats}
        getAverageNumber={getAverageNumber}
        s={s}
      />
      <ChartPanel branches={scopedBranches} students={scopedStudents} getAverageNumber={getAverageNumber} s={s} />

      <section
        style={{
          background: portalTheme.gradients.card,
          border: `1px solid ${portalTheme.colors.line}`,
          borderRadius: portalTheme.radius.md,
          borderLeft: `4px solid ${portalTheme.colors.primary}`,
          padding: "20px",
          boxShadow: portalTheme.shadows.card,
          display: "flex",
          flexDirection: "column",
          gap: "18px",
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "12px",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: "22px", fontWeight: 900, color: portalTheme.colors.textStrong }}>학생 관리</h2>
            <p style={{ margin: "6px 0 0 0", color: portalTheme.colors.textMuted, fontSize: "14px" }}>
              좌측 목록에서 학생을 선택하면 우측에서 상세, 수정, 차트를 바로 확인할 수 있습니다.
            </p>
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
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

          <select value={statusFilter} onChange={(event) => onStatusFilterChange(event.target.value)} style={selectStyle}>
            <option value="ALL">전체 상태</option>
            <option value="active">active</option>
            <option value="inactive">inactive</option>
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
        </div>

        <div
          style={{
            position: "sticky",
            top: "12px",
            zIndex: 10,
            background: "rgba(255, 255, 255, 0.94)",
            backdropFilter: "blur(14px)",
            border: `1px solid ${portalTheme.colors.line}`,
            borderRadius: portalTheme.radius.md,
            boxShadow: portalTheme.shadows.soft,
            padding: "14px 16px",
            display: "flex",
            flexWrap: "wrap",
            gap: "10px",
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
                padding: "8px 12px",
                borderRadius: portalTheme.radius.pill,
                background: selectedStudent ? portalTheme.colors.surfaceAccent : portalTheme.colors.surfacePanel,
                color: selectedStudent ? portalTheme.colors.primaryStrong : portalTheme.colors.textMuted,
                fontSize: "13px",
                fontWeight: 800,
                boxShadow: portalTheme.shadows.soft,
                border: `1px solid ${selectedStudent ? portalTheme.colors.dangerLine : portalTheme.colors.line}`,
              }}
            >
              선택 학생: {selectedStudent ? s(selectedStudent.name) : "학생을 선택하세요"}
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
            <button style={secondaryButtonStyle} onClick={onExportAllCsv}>
              CSV
            </button>
            <button style={secondaryButtonStyle} onClick={onExportBranchCsv}>
              지점 CSV
            </button>
            <button style={secondaryButtonStyle} onClick={onPrint}>
              목록 인쇄
            </button>
            <button style={secondaryButtonStyle} onClick={onPrintSelected} disabled={!selectedStudent}>
              학생 인쇄
            </button>
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "20px", alignItems: "flex-start" }}>
          <div style={{ flex: "1 1 480px", minWidth: "320px" }}>
            <div
              style={{
                background: portalTheme.gradients.cardTint,
                border: `1px solid ${portalTheme.colors.line}`,
                borderRadius: portalTheme.radius.md,
                padding: "16px",
                boxShadow: portalTheme.shadows.soft,
              }}
            >
              <StudentTable
                students={filteredStudents}
                selectedStudentId={selectedStudentId}
                loading={loading}
                onSelectStudent={onSelectStudent}
                onDoubleClick={onOpenDetail}
                getBranchLabel={getBranchLabel}
                getStatusStyle={getStatusStyle}
                getAverageNumber={getAverageNumber}
                s={s}
              />
            </div>
          </div>

          <div style={{ flex: "1 1 420px", minWidth: "320px", display: "flex", flexDirection: "column", gap: "16px" }}>
            {selectedStudent ? (
              <>
                <StudentChartSection
                  selectedStudent={selectedStudent}
                  getScoreNumber={getScoreNumber}
                  getBarWidth={getBarWidth}
                  s={s}
                />
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
              <EmptyState title="학생을 선택하세요" description="좌측 목록에서 학생을 선택하면 상세 정보와 차트가 여기에 표시됩니다." />
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

const fieldStyle: React.CSSProperties = {
  flex: "1 1 280px",
  minWidth: "220px",
  padding: "13px 14px",
  borderRadius: portalTheme.radius.sm,
  border: `1px solid ${portalTheme.colors.line}`,
  fontSize: "14px",
  background: portalTheme.colors.surfaceCardAlt,
  color: portalTheme.colors.textStrong,
  boxShadow: portalTheme.shadows.soft,
};

const selectStyle: React.CSSProperties = {
  ...fieldStyle,
  flex: "0 1 180px",
};

const secondaryButtonStyle: React.CSSProperties = {
  ...portalButtonStyles.secondary,
  padding: "11px 14px",
  fontSize: "13px",
  cursor: "pointer",
};

const primaryButtonStyle: React.CSSProperties = {
  ...portalButtonStyles.primary,
  padding: "11px 14px",
  fontSize: "13px",
  cursor: "pointer",
};

const dangerButtonStyle: React.CSSProperties = {
  ...portalButtonStyles.warning,
  padding: "11px 14px",
  fontSize: "13px",
  cursor: "pointer",
};