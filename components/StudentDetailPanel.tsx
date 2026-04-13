"use client";

import React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Student, StudentMockChartPoint, StudentPhysicalChartPoint } from "@/lib/dataService";
import { EmptyState } from "@/components/EmptyState";
import { portalButtonStyles, portalTheme } from "@/lib/theme";

interface StudentDetailPanelProps {
  student: Student | null;
  mockChartData?: StudentMockChartPoint[];
  physicalChartData?: StudentPhysicalChartPoint[];
  canManage?: boolean;
  sticky?: boolean;
  showActions?: boolean;
  badgeLabel?: string;
  onEdit: () => void;
  onDelete: () => void;
  onShowDetail: () => void;
  getAverageNumber: (s: Student) => number;
  getGradeBadgeStyle: (grade: string | number | undefined) => React.CSSProperties;
  getBranchLabel: (branchId: string | undefined) => string;
  s: (value: unknown) => string;
}

export function StudentDetailPanel({
  student,
  mockChartData = [],
  physicalChartData = [],
  canManage = true,
  sticky = true,
  showActions = true,
  badgeLabel = "선택된 학생",
  onEdit,
  onDelete,
  onShowDetail,
  getBranchLabel,
  s,
}: StudentDetailPanelProps) {
  const stdSeries = mockChartData.map((point, index) => ({
    key: `series_${index + 1}`,
    label: buildShortMockSeriesLabel(point.exam_name, point.exam_date),
    color: getSeriesColor(index),
    values: {
      korean: point.korean_std,
      math: point.math_std,
      inquiry1: point.inquiry1_std,
      inquiry2: point.inquiry2_std,
    },
  }));

  const stdChartData = [
    { category: "국어", metricKey: "korean" },
    { category: "수학", metricKey: "math" },
    { category: "탐구1", metricKey: "inquiry1" },
    { category: "탐구2", metricKey: "inquiry2" },
  ].map((item) => ({
    category: item.category,
    ...Object.fromEntries(stdSeries.map((series) => [series.key, series.values[item.metricKey as keyof typeof series.values]])),
  }));

  const pctSeries = mockChartData.map((point, index) => ({
    key: `series_${index + 1}`,
    label: buildShortMockSeriesLabel(point.exam_name, point.exam_date),
    color: getSeriesColor(index),
    values: {
      korean: point.korean_pct,
      math: point.math_pct,
      inquiry1: point.inquiry1_pct,
      inquiry2: point.inquiry2_pct,
    },
  }));

  const pctChartData = [
    { category: "국어", metricKey: "korean" },
    { category: "수학", metricKey: "math" },
    { category: "탐구1", metricKey: "inquiry1" },
    { category: "탐구2", metricKey: "inquiry2" },
  ].map((item) => ({
    category: item.category,
    ...Object.fromEntries(pctSeries.map((series) => [series.key, series.values[item.metricKey as keyof typeof series.values]])),
  }));

  const physicalSeries = physicalChartData.map((point, index) => ({
    key: `series_${index + 1}`,
    label: buildShortPhysicalSeriesLabel(point.test_date),
    color: getSeriesColor(index),
    values: {
      back_strength: point.back_strength,
      run_10m: point.run_10m,
      medicine_ball: point.medicine_ball,
      sit_reach: point.sit_reach,
      standing_jump: point.standing_jump,
      run_20m: point.run_20m,
    },
    records: {
      back_strength: point.back_strength_record,
      run_10m: point.run_10m_record,
      medicine_ball: point.medicine_ball_record,
      sit_reach: point.sit_reach_record,
      standing_jump: point.standing_jump_record,
      run_20m: point.run_20m_record,
    },
  }));

  const physicalGroupedChartData = [
    { category: "배근력", metricKey: "back_strength" },
    { category: "10m", metricKey: "run_10m" },
    { category: "메디신볼", metricKey: "medicine_ball" },
    { category: "좌전굴", metricKey: "sit_reach" },
    { category: "제자리멀리뛰기", metricKey: "standing_jump" },
    { category: "20m왕복달리기", metricKey: "run_20m" },
  ].map((item) => ({
    category: item.category,
    metricKey: item.metricKey,
    ...Object.fromEntries(physicalSeries.map((series) => [series.key, series.values[item.metricKey as keyof typeof series.values]])),
    ...Object.fromEntries(
      physicalSeries.map((series) => [`${series.key}__record`, series.records[item.metricKey as keyof typeof series.records]])
    ),
  }));

  const styles: { [key: string]: React.CSSProperties } = {
    detailCard: {
      background: portalTheme.gradients.card,
      padding: "clamp(16px, 3vw, 24px)",
      borderRadius: portalTheme.radius.md,
      boxShadow: portalTheme.shadows.panel,
      border: `1px solid ${portalTheme.colors.line}`,
      position: sticky ? "sticky" : "relative",
      top: sticky ? "20px" : undefined,
    },
    selectedBadge: {
      display: "inline-block",
      padding: "7px 12px",
      borderRadius: portalTheme.radius.pill,
      background: portalTheme.colors.primarySoft,
      color: portalTheme.colors.primaryStrong,
      fontSize: "12px",
      fontWeight: 700,
      marginBottom: "14px",
      border: `1px solid ${portalTheme.colors.primaryTint}`,
    },
    detailName: {
      margin: "0 0 8px 0",
      fontSize: "34px",
      fontWeight: 900,
      color: portalTheme.colors.textStrong,
      letterSpacing: "-0.5px",
    },
    detailSub: {
      margin: "0 0 16px 0",
      color: portalTheme.colors.textMuted,
      fontSize: "14px",
    },
    infoSection: {
      borderTop: `1px solid ${portalTheme.colors.line}`,
      borderBottom: `1px solid ${portalTheme.colors.line}`,
      padding: "16px 0",
      marginBottom: "20px",
    },
    infoRow: {
      display: "flex",
      justifyContent: "space-between",
      gap: "12px",
      fontSize: "14px",
      marginBottom: "10px",
      color: portalTheme.colors.textPrimary,
      alignItems: "flex-start",
    },
    infoTitle: {
      fontWeight: 700,
      color: portalTheme.colors.textMuted,
      flex: "0 0 88px",
    },
    infoValue: {
      flex: 1,
      textAlign: "right",
      whiteSpace: "pre-wrap",
      wordBreak: "break-word",
    },
    subjectBox: {
      background: portalTheme.colors.surfacePanel,
      borderRadius: portalTheme.radius.md,
      padding: "16px",
      border: `1px solid ${portalTheme.colors.line}`,
      boxShadow: portalTheme.shadows.soft,
    },
    subjectRow: {
      display: "flex",
      justifyContent: "space-between",
      gap: "12px",
      fontSize: "14px",
      color: portalTheme.colors.textPrimary,
      marginBottom: "8px",
    },
    section: {
      marginTop: "24px",
    },
    chartGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
      gap: "14px",
    },
    chartPanel: {
      background: portalTheme.colors.surfacePanel,
      borderRadius: portalTheme.radius.md,
      padding: "16px",
      border: `1px solid ${portalTheme.colors.line}`,
      boxShadow: portalTheme.shadows.soft,
    },
    chartPanelTitle: {
      margin: "0 0 4px 0",
      fontSize: "16px",
      fontWeight: 900,
      color: portalTheme.colors.textStrong,
    },
    chartPanelHint: {
      margin: "0 0 12px 0",
      fontSize: "12px",
      lineHeight: 1.5,
      color: portalTheme.colors.textMuted,
    },
    sectionTitle: {
      margin: "0 0 8px 0",
      fontSize: "clamp(18px, 2.4vw, 21px)",
      fontWeight: 900,
      color: portalTheme.colors.textStrong,
    },
    sectionHint: {
      margin: "0 0 14px 0",
      fontSize: "clamp(12px, 1.8vw, 13px)",
      color: portalTheme.colors.textMuted,
      lineHeight: 1.5,
      maxWidth: "720px",
    },
    chartCard: {
      background: portalTheme.colors.surfacePanel,
      borderRadius: portalTheme.radius.md,
      padding: "16px",
      border: `1px solid ${portalTheme.colors.line}`,
      boxShadow: portalTheme.shadows.soft,
    },
    chartWrap: {
      width: "100%",
      height: "clamp(320px, 46vw, 380px)",
    },
    actionButtons: {
      display: "flex",
      gap: "8px",
      marginTop: "16px",
      flexWrap: "wrap",
    },
    editButton: {
      flex: 1,
      minWidth: "100px",
      ...portalButtonStyles.success,
      padding: "clamp(9px, 2.2vw, 12px) clamp(12px, 3vw, 16px)",
      fontSize: "clamp(12px, 1.9vw, 14px)",
      fontWeight: 700,
      cursor: "pointer",
    },
    deleteButton: {
      flex: 1,
      minWidth: "100px",
      ...portalButtonStyles.warning,
      padding: "clamp(9px, 2.2vw, 12px) clamp(12px, 3vw, 16px)",
      fontSize: "clamp(12px, 1.9vw, 14px)",
      fontWeight: 700,
      cursor: "pointer",
    },
    detailButton: {
      flex: 1,
      minWidth: "100px",
      ...portalButtonStyles.secondary,
      padding: "clamp(9px, 2.2vw, 12px) clamp(12px, 3vw, 16px)",
      fontSize: "clamp(12px, 1.9vw, 14px)",
      fontWeight: 700,
      cursor: "pointer",
    },
  };

  if (!student) {
    return (
      <div style={styles.detailCard}>
        <EmptyState title="학생을 선택하세요" description="학생을 선택하면 상세 정보가 표시됩니다." />
      </div>
    );
  }

  return (
    <div style={styles.detailCard}>
      <p style={styles.selectedBadge}>{badgeLabel}</p>
      <h2 style={styles.detailName}>{s(student.name)}</h2>
      <p style={styles.detailSub}>
        {s(student.school_name) || "학교 정보 없음"} · {s(student.grade) ? `${s(student.grade)}학년` : "학년 정보 없음"} · {getBranchLabel(s(student.branch_id))}
      </p>

      <div style={styles.infoSection}>
        <div style={styles.infoRow}>
          <span style={styles.infoTitle}>학생 ID</span>
          <span style={styles.infoValue}>{s(student.student_id)}</span>
        </div>
        <div style={styles.infoRow}>
          <span style={styles.infoTitle}>성별</span>
          <span style={styles.infoValue}>{s(student.gender) || "-"}</span>
        </div>
        <div style={styles.infoRow}>
          <span style={styles.infoTitle}>생년월일</span>
          <span style={styles.infoValue}>{s(student.birth_date) || "-"}</span>
        </div>
        <div style={styles.infoRow}>
          <span style={styles.infoTitle}>지점</span>
          <span style={styles.infoValue}>{getBranchLabel(s(student.branch_id))}</span>
        </div>
        <div style={styles.infoRow}>
          <span style={styles.infoTitle}>연락처</span>
          <span style={styles.infoValue}>{s(student.phone) || "-"}</span>
        </div>
        <div style={styles.infoRow}>
          <span style={styles.infoTitle}>학부모연락처</span>
          <span style={styles.infoValue}>{s(student.parent_phone) || "-"}</span>
        </div>
        <div style={styles.infoRow}>
          <span style={styles.infoTitle}>등록일시</span>
          <span style={styles.infoValue}>{s(student.created_at) || "-"}</span>
        </div>
        <div style={{ ...styles.infoRow, marginBottom: 0 }}>
          <span style={styles.infoTitle}>기본 메모</span>
          <span style={styles.infoValue}>{s(student.memo) || "-"}</span>
        </div>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>모의고사 추이</h3>
        <p style={styles.sectionHint}>원점수는 제거하고, 표준점수와 백분위만 짧은 회차 표기로 분리해서 비교할 수 있게 정리했습니다.</p>
        {stdSeries.length === 0 && pctSeries.length === 0 ? (
          <EmptyState title="모의고사 데이터가 없습니다" description="저장된 모의고사 기록이 없습니다." />
        ) : (
          <div style={styles.chartGrid}>
            <div style={styles.chartPanel}>
              <h4 style={styles.chartPanelTitle}>표준점수 추이</h4>
              <p style={styles.chartPanelHint}>과목별로 각 시험 회차의 표준점수를 비교합니다.</p>
              {stdSeries.length === 0 ? (
                <EmptyState title="표준점수 데이터가 없습니다" description="표시할 표준점수 기록이 없습니다." />
              ) : (
                <div style={styles.chartWrap}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stdChartData} margin={{ top: 8, right: 12, left: 0, bottom: 18 }} barGap={6} barCategoryGap="24%">
                      <CartesianGrid stroke={portalTheme.colors.lineStrong} strokeDasharray="3 3" />
                      <XAxis dataKey="category" tick={{ fontSize: 11, fill: portalTheme.colors.textPrimary, fontWeight: 800 }} interval={0} height={42} tickLine={false} axisLine={{ stroke: portalTheme.colors.lineStrong }} />
                      <YAxis tick={{ fontSize: 12, fill: portalTheme.colors.textMuted }} />
                      <Tooltip cursor={{ fill: "rgba(225, 29, 72, 0.1)" }} content={<GroupedSeriesTooltip titleLabel="과목" />} />
                      <Legend wrapperStyle={legendStyle} />
                      {stdSeries.map((series) => (
                        <Bar key={series.key} dataKey={series.key} name={series.label} fill={series.color} radius={[6, 6, 0, 0]} maxBarSize={24} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div style={styles.chartPanel}>
              <h4 style={styles.chartPanelTitle}>백분위 추이</h4>
              <p style={styles.chartPanelHint}>과목별로 각 시험 회차의 백분위를 빠르게 비교합니다.</p>
              {pctSeries.length === 0 ? (
                <EmptyState title="백분위 데이터가 없습니다" description="표시할 백분위 기록이 없습니다." />
              ) : (
                <div style={styles.chartWrap}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={pctChartData} margin={{ top: 8, right: 12, left: 0, bottom: 18 }} barGap={6} barCategoryGap="24%">
                      <CartesianGrid stroke={portalTheme.colors.lineStrong} strokeDasharray="3 3" />
                      <XAxis dataKey="category" tick={{ fontSize: 11, fill: portalTheme.colors.textPrimary, fontWeight: 800 }} interval={0} height={42} tickLine={false} axisLine={{ stroke: portalTheme.colors.lineStrong }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: portalTheme.colors.textMuted }} />
                      <Tooltip cursor={{ fill: "rgba(225, 29, 72, 0.1)" }} content={<GroupedSeriesTooltip titleLabel="과목" />} />
                      <Legend wrapperStyle={legendStyle} />
                      {pctSeries.map((series) => (
                        <Bar key={series.key} dataKey={series.key} name={series.label} fill={series.color} radius={[6, 6, 0, 0]} maxBarSize={24} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>실기테스트기록</h3>
        <div style={styles.subjectBox}>
          <div style={styles.subjectRow}>
            <span>배근력</span>
            <span>{s(student.back_strength) || "-"} kg</span>
          </div>
          <div style={styles.subjectRow}>
            <span>10m왕복달리기</span>
            <span>{s(student.run_10m) || "-"} 초</span>
          </div>
          <div style={styles.subjectRow}>
            <span>메디신볼</span>
            <span>{s(student.medicine_ball) || "-"} cm</span>
          </div>
          <div style={styles.subjectRow}>
            <span>좌전굴</span>
            <span>{s(student.sit_reach) || "-"} cm</span>
          </div>
          <div style={styles.subjectRow}>
            <span>제자리멀리뛰기</span>
            <span>{s(student.standing_jump) || "-"} cm</span>
          </div>
          <div style={styles.subjectRow}>
            <span>20m왕복달리기</span>
            <span>{s(student.run_20m) || "-"} 초</span>
          </div>
          {student.physical_memo && (
            <div style={styles.subjectRow}>
              <span>메모</span>
              <span>{s(student.physical_memo)}</span>
            </div>
          )}
        </div>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>실기 추이</h3>
        <p style={styles.sectionHint}>대표 종목 6개를 가로축에 고정하고, 측정 회차를 색상으로 분리해서 종목별 추이를 더 직관적으로 보이게 정리했습니다.</p>
        {physicalSeries.length === 0 ? (
          <EmptyState title="실기 데이터가 없습니다" description="저장된 실기 기록이 없습니다." />
        ) : (
          <div style={styles.chartCard}>
            <div style={styles.chartWrap}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={physicalGroupedChartData} margin={{ top: 8, right: 12, left: 0, bottom: 18 }} barGap={6} barCategoryGap="24%">
                  <CartesianGrid stroke={portalTheme.colors.lineStrong} strokeDasharray="3 3" />
                  <XAxis dataKey="category" tick={{ fontSize: 11, fill: portalTheme.colors.textPrimary, fontWeight: 800 }} interval={0} height={42} tickLine={false} axisLine={{ stroke: portalTheme.colors.lineStrong }} />
                  <YAxis tick={{ fontSize: 12, fill: portalTheme.colors.textMuted }} />
                  <Tooltip cursor={{ fill: "rgba(225, 29, 72, 0.1)" }} content={<PhysicalTrendTooltip />} />
                  <Legend wrapperStyle={legendStyle} />
                  {physicalSeries.map((series) => (
                    <Bar key={series.key} dataKey={series.key} name={series.label} fill={series.color} radius={[6, 6, 0, 0]} maxBarSize={26} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {showActions ? (
        <div style={styles.actionButtons}>
          <button style={styles.detailButton} onClick={onShowDetail}>
            상세보기
          </button>
          {canManage ? (
            <>
              <button style={styles.editButton} onClick={onEdit}>
                수정
              </button>
              <button style={styles.deleteButton} onClick={onDelete}>
                삭제
              </button>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

const legendStyle = {
  fontSize: 12,
  color: portalTheme.colors.textPrimary,
  paddingTop: 10,
  lineHeight: "20px",
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

function GroupedSeriesTooltip({
  active,
  payload,
  titleLabel,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number | string; color?: string; payload?: Record<string, unknown> }>;
  titleLabel: string;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  const source = payload[0]?.payload ?? {};
  const title = String(source.category ?? "").trim() || "-";

  return (
    <div style={tooltipContentStyle}>
      <div style={{ padding: "12px 14px 10px 14px" }}>
        <div style={{ ...tooltipLabelStyle, marginBottom: "8px" }}>{titleLabel} {title}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          {payload.map((item) => (
            <div key={item.name} style={{ ...tooltipItemStyle, display: "flex", alignItems: "center", gap: "8px", fontSize: 12 }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "999px", background: item.color || portalTheme.colors.primary }} />
              <span style={{ minWidth: "48px", fontWeight: 700 }}>{item.name}</span>
              <span>{String(item.value ?? "-")}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PhysicalTrendTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{
    name?: string;
    value?: number | string;
    color?: string;
    dataKey?: string;
    payload?: Record<string, unknown>;
  }>;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  const source = payload[0]?.payload ?? {};
  const title = String(source.category ?? "").trim() || "-";
  const metricKey = String(source.metricKey ?? "").trim();

  return (
    <div style={tooltipContentStyle}>
      <div style={{ padding: "12px 14px 10px 14px" }}>
        <div style={{ ...tooltipLabelStyle, marginBottom: "8px" }}>종목 {title}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {payload.map((item) => {
            const dataKey = String(item.dataKey ?? "").trim();
            const recordValue = String(source[`${dataKey}__record`] ?? "").trim();
            const formattedRecord = formatPhysicalRecord(metricKey, recordValue);

            return (
              <div key={item.name} style={{ ...tooltipItemStyle, display: "flex", alignItems: "flex-start", gap: "8px", fontSize: 12 }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "999px", background: item.color || portalTheme.colors.primary, marginTop: "4px", flexShrink: 0 }} />
                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  <span style={{ fontWeight: 700 }}>{item.name}</span>
                  <span>기록 {formattedRecord}</span>
                  <span style={{ color: portalTheme.colors.textMuted }}>점수 {String(item.value ?? "-")}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function getSeriesColor(index: number) {
  const palette = [
    ...portalTheme.chart,
    "#0ea5e9",
    "#f97316",
    "#14b8a6",
    "#e11d48",
  ];

  return palette[index % palette.length];
}

function buildShortMockSeriesLabel(examName: string, examDate: string) {
  const normalizedName = String(examName || "").trim();

  if (normalizedName.includes("수능")) {
    return "수능";
  }

  return formatCompactDate(examDate) || normalizedName || "시험";
}

function buildShortPhysicalSeriesLabel(testDate: string) {
  return formatCompactDate(testDate) || "실기측정";
}

function formatCompactDate(value: string) {
  const raw = String(value || "").trim();

  if (!raw) {
    return "";
  }

  const matched = raw.match(/^(\d{4})[-./]?(\d{1,2})/);

  if (matched) {
    return `${matched[1].slice(2)}년${Number(matched[2])}월`;
  }

  return raw;
}

function formatPhysicalRecord(metricKey: string, rawValue: string) {
  const value = String(rawValue || "").trim();

  if (!value) {
    return "-";
  }

  if (metricKey === "back_strength") {
    return `${value}kg`;
  }

  if (metricKey === "run_10m" || metricKey === "run_20m") {
    return `${value}초`;
  }

  if (metricKey === "standing_jump") {
    const numericValue = Number(value);

    if (Number.isFinite(numericValue)) {
      return `${(numericValue / 100).toFixed(2)}m`;
    }
  }

  if (metricKey === "medicine_ball" || metricKey === "sit_reach") {
    return `${value}cm`;
  }

  return value;
}
