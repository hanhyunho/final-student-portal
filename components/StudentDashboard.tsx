import React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Student, StudentMockChartPoint, StudentPhysicalChartPoint } from "@/lib/dataService";
import { EmptyState } from "@/components/EmptyState";
import { getFeedbackPalette, portalTheme } from "@/lib/theme";

type FeedbackMessage = {
  type: "success" | "error" | "info";
  message: string;
};

interface StudentDashboardProps {
  feedback: FeedbackMessage | null;
  loading: boolean;
  student: Student | null;
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

  const toNumber = (value: string | number | undefined) => {
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const rawScoreChart = [
    { label: "국어", value: toNumber(student.korean_raw), displayValue: s(student.korean_raw) || "-", fill: portalTheme.chart[0] },
    { label: "수학", value: toNumber(student.math_raw), displayValue: s(student.math_raw) || "-", fill: portalTheme.chart[1] },
    { label: "영어", value: toNumber(student.english_raw), displayValue: s(student.english_raw) || "-", fill: portalTheme.chart[3] },
    { label: "탐구1", value: toNumber(student.inquiry1_raw), displayValue: s(student.inquiry1_raw) || "-", fill: portalTheme.chart[2] },
    { label: "탐구2", value: toNumber(student.inquiry2_raw), displayValue: s(student.inquiry2_raw) || "-", fill: portalTheme.chart[4] },
  ];

  const stdScoreChart = [
    { label: "국어", value: toNumber(student.korean_std), displayValue: s(student.korean_std) || "-", fill: portalTheme.chart[0] },
    { label: "수학", value: toNumber(student.math_std), displayValue: s(student.math_std) || "-", fill: portalTheme.chart[1] },
    { label: "탐구1", value: toNumber(student.inquiry1_std), displayValue: s(student.inquiry1_std) || "-", fill: portalTheme.chart[2] },
    { label: "탐구2", value: toNumber(student.inquiry2_std), displayValue: s(student.inquiry2_std) || "-", fill: portalTheme.chart[3] },
  ];

  const pctScoreChart = [
    { label: "국어", value: toNumber(student.korean_pct), displayValue: s(student.korean_pct) || "-", fill: portalTheme.chart[0] },
    { label: "수학", value: toNumber(student.math_pct), displayValue: s(student.math_pct) || "-", fill: portalTheme.chart[1] },
    { label: "탐구1", value: toNumber(student.inquiry1_pct), displayValue: s(student.inquiry1_pct) || "-", fill: portalTheme.chart[2] },
    { label: "탐구2", value: toNumber(student.inquiry2_pct), displayValue: s(student.inquiry2_pct) || "-", fill: portalTheme.chart[3] },
  ];

  const infoRows = [
    ["지점", getBranchLabel(s(student.branch_id))],
    ["학교", s(student.school_name) || "-"],
    ["학년", s(student.grade) ? `${s(student.grade)}학년` : "-"],
    ["반", s(student.class_name) || "-"],
    ["연락처", s(student.phone) || "-"],
    ["학부모 연락처", s(student.parent_phone) || "-"],
    ["상태", s(student.status) || "-"],
  ];

  const subjectRows = [
    ["국어", s(student.korean_raw) || "-", s(student.korean_grade)],
    ["수학", s(student.math_raw) || "-", s(student.math_grade)],
    ["영어", s(student.english_raw) || "-", s(student.english_grade)],
    ["탐구1", s(student.inquiry1_raw) || "-", s(student.inquiry1_grade)],
    ["탐구2", s(student.inquiry2_raw) || "-", s(student.inquiry2_grade)],
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px", maxWidth: "1080px", margin: "0 auto" }}>
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

      <section style={cardStyle}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "18px", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <p style={badgeStyle}>학생 기본 정보</p>
            <h2 style={{ margin: "10px 0 8px 0", fontSize: "32px", fontWeight: 900, color: portalTheme.colors.textStrong }}>{s(student.name)}</h2>
            <p style={{ margin: 0, color: portalTheme.colors.textMuted, fontSize: "14px" }}>
              {s(student.student_no) || "학번 없음"} · {s(student.birth_date) || "생년월일 없음"}
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <div style={summaryChipStyle}>
              <span style={summaryChipLabelStyle}>평균</span>
              <strong style={summaryChipValueStyle}>{getAverageNumber(student).toFixed(1)}</strong>
            </div>
            <div style={summaryChipStyle}>
              <span style={summaryChipLabelStyle}>지점</span>
              <strong style={summaryChipValueStyle}>{getBranchLabel(s(student.branch_id))}</strong>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px", marginTop: "18px" }}>
          {infoRows.map(([label, value]) => (
            <div key={label} style={infoCardStyle}>
              <span style={infoLabelStyle}>{label}</span>
              <strong style={infoValueStyle}>{value}</strong>
            </div>
          ))}
        </div>

        {s(student.memo) ? (
          <div style={{ marginTop: "16px", background: portalTheme.colors.surfaceAccent, borderRadius: portalTheme.radius.md, padding: "14px 16px", color: portalTheme.colors.textPrimary, fontSize: "14px", border: `1px solid ${portalTheme.colors.line}` }}>
            {s(student.memo)}
          </div>
        ) : null}
      </section>

      <section style={cardStyle}>
        <div style={sectionHeaderStyle}>
          <div>
            <h3 style={sectionTitleStyle}>모의고사 카드</h3>
            <p style={sectionDescStyle}>원점수, 표준점수, 백분위와 시험별 grouped bar 차트를 함께 확인합니다.</p>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", marginBottom: "18px" }}>
          {subjectRows.map(([label, score, grade]) => (
            <div key={label} style={infoCardStyle}>
              <span style={infoLabelStyle}>{label}</span>
              <strong style={infoValueStyle}>{score}</strong>
              <span style={{ ...gradeBadgeStyle, ...getGradeBadgeStyle(grade) }}>{s(grade) || "-"}등급</span>
            </div>
          ))}
        </div>

        <div style={chartGridStyle}>
          <HorizontalMetricCard title="원점수" description="과목별 현재 원점수 비교" data={rawScoreChart} maxDomain={100} />
          <HorizontalMetricCard title="표준점수" description="입력된 표준점수 비교" data={stdScoreChart} />
          <HorizontalMetricCard title="백분위" description="과목별 백분위 비교" data={pctScoreChart} maxDomain={100} />
        </div>

        {mockChartData.length > 0 ? (
          <div style={chartWrapStyle}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mockChartData} margin={{ top: 8, right: 12, left: 0, bottom: 12 }} barGap={6} barCategoryGap={20}>
                <CartesianGrid stroke={portalTheme.colors.lineStrong} strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: portalTheme.colors.textMuted, fontWeight: 700 }} interval={0} angle={0} textAnchor="middle" height={40} tickLine={false} axisLine={{ stroke: portalTheme.colors.lineStrong }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: portalTheme.colors.textMuted }} />
                <Tooltip contentStyle={tooltipContentStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} cursor={{ fill: "rgba(225, 29, 72, 0.1)" }} />
                <Legend wrapperStyle={legendStyle} />
                <Bar dataKey="korean" name="국어" fill={portalTheme.chart[0]} radius={[6, 6, 0, 0]} maxBarSize={18} />
                <Bar dataKey="math" name="수학" fill={portalTheme.chart[1]} radius={[6, 6, 0, 0]} maxBarSize={18} />
                <Bar dataKey="english" name="영어" fill={portalTheme.chart[3]} radius={[6, 6, 0, 0]} maxBarSize={18} />
                <Bar dataKey="inquiry1" name="탐구1" fill={portalTheme.chart[2]} radius={[6, 6, 0, 0]} maxBarSize={18} />
                <Bar dataKey="inquiry2" name="탐구2" fill={portalTheme.chart[4]} radius={[6, 6, 0, 0]} maxBarSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyState title="모의고사 데이터가 없습니다" description="아직 저장된 시험 점수가 없습니다." />
        )}
      </section>

      <section style={cardStyle}>
        <div style={sectionHeaderStyle}>
          <div>
            <h3 style={sectionTitleStyle}>실기 점수 추이</h3>
            <p style={sectionDescStyle}>날짜별로 6종목 배점을 grouped bar chart로 비교합니다.</p>
          </div>
        </div>

        {physicalChartData.length > 0 ? (
          <div style={chartWrapStyle}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={physicalChartData} margin={{ top: 8, right: 12, left: 0, bottom: 12 }} barGap={4} barCategoryGap={16}>
                <CartesianGrid stroke={portalTheme.colors.lineStrong} strokeDasharray="3 3" />
                <XAxis dataKey="short_label" tick={{ fontSize: 11, fill: portalTheme.colors.textMuted, fontWeight: 700 }} interval={0} angle={0} textAnchor="middle" height={40} tickLine={false} axisLine={{ stroke: portalTheme.colors.lineStrong }} />
                <YAxis tick={{ fontSize: 12, fill: portalTheme.colors.textMuted }} />
                <Tooltip contentStyle={tooltipContentStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} cursor={{ fill: "rgba(225, 29, 72, 0.1)" }} />
                <Legend wrapperStyle={legendStyle} />
                <Bar dataKey="back_strength" name="배근력" fill={portalTheme.chart[0]} radius={[6, 6, 0, 0]} maxBarSize={16} />
                <Bar dataKey="run_10m" name="10m" fill={portalTheme.chart[1]} radius={[6, 6, 0, 0]} maxBarSize={16} />
                <Bar dataKey="medicine_ball" name="메디신볼" fill={portalTheme.chart[3]} radius={[6, 6, 0, 0]} maxBarSize={16} />
                <Bar dataKey="sit_reach" name="좌전굴" fill={portalTheme.chart[4]} radius={[6, 6, 0, 0]} maxBarSize={16} />
                <Bar dataKey="standing_jump" name="제자리멀리뛰기" fill={portalTheme.chart[2]} radius={[6, 6, 0, 0]} maxBarSize={16} />
                <Bar dataKey="run_20m" name="20m왕복달리기" fill={portalTheme.chart[5]} radius={[6, 6, 0, 0]} maxBarSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyState title="실기 데이터가 없습니다" description="아직 저장된 실기 기록이 없습니다." />
        )}
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

const chartWrapStyle: React.CSSProperties = {
  width: "100%",
  height: "340px",
  background: portalTheme.gradients.cardTint,
  borderRadius: portalTheme.radius.md,
  padding: "14px 12px 12px 12px",
  border: `1px solid ${portalTheme.colors.line}`,
};

const chartGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: "14px",
  marginBottom: "18px",
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

const summaryChipStyle: React.CSSProperties = {
  background: portalTheme.colors.surfaceAccent,
  border: `1px solid ${portalTheme.colors.line}`,
  borderRadius: portalTheme.radius.md,
  padding: "14px 16px",
  minWidth: "120px",
};

const summaryChipLabelStyle: React.CSSProperties = {
  display: "block",
  color: portalTheme.colors.textMuted,
  fontSize: "12px",
  marginBottom: "6px",
};

const summaryChipValueStyle: React.CSSProperties = {
  color: portalTheme.colors.textStrong,
  fontSize: "18px",
  fontWeight: 900,
};

const infoCardStyle: React.CSSProperties = {
  background: portalTheme.colors.surfacePanel,
  borderRadius: portalTheme.radius.md,
  padding: "14px 16px",
  border: `1px solid ${portalTheme.colors.line}`,
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  boxShadow: portalTheme.shadows.soft,
};

const infoLabelStyle: React.CSSProperties = {
  color: portalTheme.colors.textMuted,
  fontSize: "12px",
};

const infoValueStyle: React.CSSProperties = {
  color: portalTheme.colors.textStrong,
  fontSize: "16px",
  fontWeight: 800,
};

const gradeBadgeStyle: React.CSSProperties = {
  display: "inline-block",
  width: "fit-content",
  padding: "5px 9px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: 700,
};

const legendStyle = {
  fontSize: 12,
  color: portalTheme.colors.textMuted,
  paddingTop: 4,
};

const tooltipContentStyle = {
  borderRadius: 14,
  border: `1px solid ${portalTheme.colors.lineStrong}`,
  boxShadow: portalTheme.shadows.cardStrong,
  background: "rgba(255,255,255,0.98)",
};

const tooltipLabelStyle = {
  color: portalTheme.colors.textStrong,
  fontWeight: 800,
};

const tooltipItemStyle = {
  color: portalTheme.colors.textPrimary,
};

function HorizontalMetricCard({
  title,
  description,
  data,
  maxDomain,
}: {
  title: string;
  description: string;
  data: Array<{ label: string; value: number; displayValue: string; fill: string }>;
  maxDomain?: number;
}) {
  const hasData = data.some((item) => item.value > 0);

  return (
    <div
      style={{
        background: portalTheme.colors.surfacePanel,
        borderRadius: portalTheme.radius.md,
        border: `1px solid ${portalTheme.colors.line}`,
        borderLeft: `4px solid ${portalTheme.colors.primary}`,
        padding: "16px",
        boxShadow: portalTheme.shadows.soft,
      }}
    >
      <div style={{ marginBottom: "12px" }}>
        <h4 style={{ margin: 0, fontSize: "17px", fontWeight: 900, color: portalTheme.colors.textStrong }}>{title}</h4>
        <p style={{ margin: "6px 0 0 0", fontSize: "13px", color: portalTheme.colors.textMuted, lineHeight: 1.45 }}>{description}</p>
      </div>

      {hasData ? (
        <div style={{ width: "100%", height: "250px" }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 6, right: 24, left: 0, bottom: 6 }} barCategoryGap={16}>
              <CartesianGrid stroke={portalTheme.colors.lineStrong} strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" domain={[0, maxDomain || "dataMax + 10"]} tick={{ fontSize: 12, fill: portalTheme.colors.textMuted }} tickLine={false} axisLine={{ stroke: portalTheme.colors.lineStrong }} />
              <YAxis type="category" dataKey="label" width={70} tick={{ fontSize: 12, fill: portalTheme.colors.textPrimary, fontWeight: 700 }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={tooltipContentStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} cursor={{ fill: "rgba(225, 29, 72, 0.1)" }} />
              <Bar dataKey="value" radius={[0, 10, 10, 0]} maxBarSize={20}>
                {data.map((item) => (
                  <Cell key={item.label} fill={item.fill} />
                ))}
                <LabelList dataKey="displayValue" position="right" style={{ fill: portalTheme.colors.textStrong, fontSize: 12, fontWeight: 800 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <EmptyState title={`${title} 데이터가 없습니다`} description="표시할 기록이 없습니다." />
      )}
    </div>
  );
}
