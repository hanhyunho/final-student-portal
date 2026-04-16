import React from "react";
import type { MockExam, MockScore, Student, StudentMockChartPoint, StudentPhysicalChartPoint } from "@/lib/dataService";
import { EmptyState } from "@/components/EmptyState";
import { StudentDetailPanel } from "@/components/StudentDetailPanel";
import { getFeedbackPalette, portalLayout, portalTheme } from "@/lib/theme";

type FeedbackMessage = {
  type: "success" | "error" | "info";
  message: string;
};

interface StudentDashboardProps {
  feedback: FeedbackMessage | null;
  loading: boolean;
  student: Student | null;
  mockScores: MockScore[];
  mockExams: MockExam[];
  mockChartData: StudentMockChartPoint[];
  physicalChartData: StudentPhysicalChartPoint[];
  getAverageNumber: (student: Student) => number;
  getGradeBadgeStyle: (grade: string | number | undefined) => React.CSSProperties;
  getBranchLabel: (branchId: string | undefined) => string;
  s: (value: unknown) => string;
}

export function StudentDashboard({
  feedback,
  loading,
  student,
  mockScores,
  mockExams,
  mockChartData,
  physicalChartData,
  getAverageNumber,
  getGradeBadgeStyle,
  getBranchLabel,
  s,
}: StudentDashboardProps) {
  const bannerStyle = feedback ? getFeedbackPalette(feedback.type) : null;

  if (loading) {
    return <EmptyState title="불러오는 중입니다" description="학생 데이터를 안전하게 불러오고 있습니다." />;
  }

  if (!student) {
    return <EmptyState title="학생 정보를 찾을 수 없습니다" description="연결된 학생 데이터가 없거나 접근 권한이 없습니다." />;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: portalLayout.sectionGap, maxWidth: portalLayout.containerMaxWidth, margin: "0 auto" }}>
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

      <section style={cardStyle}>
        <div style={sectionHeaderStyle}>
          <div>
            <p style={badgeStyle}>학생 전용 화면</p>
            <h2 style={sectionTitleStyle}>내 성적 및 실기 현황</h2>
            <p style={sectionDescStyle}>본인 정보, 모의고사 추이, 실기 추이를 최신 화면 구성으로 정리했습니다.</p>
          </div>
        </div>
        <StudentDetailPanel
          student={student}
          mockScores={mockScores}
          mockExams={mockExams}
          mockChartData={mockChartData}
          physicalChartData={physicalChartData}
          canManage={false}
          sticky={false}
          showActions={false}
          badgeLabel="내 정보"
          onEdit={() => {}}
          onDelete={() => {}}
          onShowDetail={() => {}}
          getAverageNumber={getAverageNumber}
          getGradeBadgeStyle={getGradeBadgeStyle}
          getBranchLabel={getBranchLabel}
          s={s}
        />
      </section>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: portalTheme.gradients.card,
  border: `1px solid ${portalTheme.colors.line}`,
  borderLeft: `4px solid ${portalTheme.colors.primary}`,
  borderRadius: portalTheme.radius.md,
  padding: "22px",
  boxShadow: portalTheme.shadows.card,
};

const badgeStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "7px 12px",
  borderRadius: "999px",
  background: portalTheme.colors.primarySoft,
  color: portalTheme.colors.primary,
  fontSize: "12px",
  fontWeight: 700,
};

const sectionHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "16px",
  marginBottom: "16px",
};

const sectionTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "22px",
  fontWeight: 900,
  color: portalTheme.colors.textStrong,
};

const sectionDescStyle: React.CSSProperties = {
  margin: "6px 0 0 0",
  color: portalTheme.colors.textMuted,
  fontSize: "14px",
};
