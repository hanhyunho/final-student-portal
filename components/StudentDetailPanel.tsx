"use client";

import React, { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MockExam, MockScore, Student, StudentMockChartPoint, StudentPhysicalChartPoint } from "@/lib/dataService";
import { EmptyState } from "@/components/EmptyState";
import { portalButtonStyles, portalTheme } from "@/lib/theme";

interface StudentDetailPanelProps {
  student: Student | null;
  mockScores?: MockScore[];
  mockExams?: MockExam[];
  mockChartData?: StudentMockChartPoint[];
  physicalChartData?: StudentPhysicalChartPoint[];
  canManage?: boolean;
  sticky?: boolean;
  showActions?: boolean;
  renderMode?: "screen" | "print";
  badgeLabel?: string;
  onEdit: () => void;
  onDelete: () => void;
  onShowDetail: () => void;
  getAverageNumber: (s: Student) => number;
  getGradeBadgeStyle: (grade: string | number | undefined) => React.CSSProperties;
  getBranchLabel: (branchId: string | undefined) => string;
  s: (value: unknown) => string;
}

type ChartType = "bar" | "line";

type MetricSeries = {
  key: string;
  label: string;
  color: string;
};

type PhysicalMetricKey =
  | "back_strength"
  | "run_10m"
  | "medicine_ball"
  | "sit_reach"
  | "standing_jump"
  | "run_20m";

type PhysicalTableColumn = {
  key: "test_date" | "rank_no" | PhysicalMetricKey;
  label: string;
};

type PhysicalTableTheme = "warm" | "cool";

type MockExamGroupKey = "3mo" | "6mo" | "9mo" | "suneung";

type MockExamSummaryCell = {
  subjectName?: string;
  raw?: string;
  std?: string;
  pct?: string;
  grade?: string;
};

type MockExamTableRow = {
  key: MockExamGroupKey;
  label: string;
  left: {
    korean: MockExamSummaryCell;
    math: MockExamSummaryCell;
    english: MockExamSummaryCell;
  };
  right: {
    inquiry1: MockExamSummaryCell;
    inquiry2: MockExamSummaryCell;
    history: MockExamSummaryCell;
  };
};

const CHART_TYPE_STORAGE_KEYS = {
  mockExam: "chartType_mockExam",
  physical: "chartType_physical",
} as const;

const CHART_TYPE_OPTIONS: Array<{ value: ChartType; label: string }> = [
  { value: "bar", label: "막대그래프" },
  { value: "line", label: "선그래프" },
];

const PHYSICAL_TABLE_GROUPS: Array<{
  title: string;
  chartTitle: string;
  chartHint: string;
  theme: PhysicalTableTheme;
  metricKeys: PhysicalMetricKey[];
  columns: PhysicalTableColumn[];
}> = [
  {
    title: "상하체 순발력계열",
    chartTitle: "(상하체 순발력계열)",
    chartHint: "배근력, 메디신볼, 제자리멀리뛰기 기록을 한 차트로 묶어 회차별 변화를 비교합니다.",
    theme: "warm",
    metricKeys: ["back_strength", "medicine_ball", "standing_jump"],
    columns: [
      { key: "test_date", label: "일자" },
      { key: "rank_no", label: "순위" },
      { key: "back_strength", label: "배근력" },
      { key: "medicine_ball", label: "메디신볼" },
      { key: "standing_jump", label: "제멀" },
    ],
  },
  {
    title: "민첩성 유연성계열",
    chartTitle: "(민첩성 유연성계열)",
    chartHint: "10m왕복, 좌전굴, 20m왕복 기록을 한 차트로 묶어 회차별 변화를 비교합니다.",
    theme: "cool",
    metricKeys: ["run_10m", "sit_reach", "run_20m"],
    columns: [
      { key: "test_date", label: "일자" },
      { key: "rank_no", label: "순위" },
      { key: "run_10m", label: "10m" },
      { key: "sit_reach", label: "좌전굴" },
      { key: "run_20m", label: "20m왕복" },
    ],
  },
];

const MOCK_EXAM_ROW_ORDER: Array<{ key: MockExamGroupKey; label: string }> = [
  { key: "3mo", label: "3모" },
  { key: "6mo", label: "6모" },
  { key: "9mo", label: "9모" },
  { key: "suneung", label: "수능" },
];

export function StudentDetailPanel({
  student,
  mockScores = [],
  mockExams = [],
  mockChartData = [],
  physicalChartData = [],
  canManage = true,
  sticky = true,
  showActions = true,
  renderMode = "screen",
  badgeLabel = "선택된 학생",
  onEdit,
  onDelete,
  onShowDetail,
  getBranchLabel,
  s,
}: StudentDetailPanelProps) {
  const isPrintMode = renderMode === "print";
  const [mockChartType, setMockChartType] = useState<ChartType>("bar");
  const [physicalChartType, setPhysicalChartType] = useState<ChartType>("bar");
  const [chartPreferencesReady, setChartPreferencesReady] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);

  useEffect(() => {
    setMockChartType(readStoredChartType(CHART_TYPE_STORAGE_KEYS.mockExam));
    setPhysicalChartType(readStoredChartType(CHART_TYPE_STORAGE_KEYS.physical));
    setChartPreferencesReady(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const updateViewport = () => setIsMobileViewport(mediaQuery.matches);

    updateViewport();

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", updateViewport);
      return () => mediaQuery.removeEventListener("change", updateViewport);
    }

    mediaQuery.addListener(updateViewport);
    return () => mediaQuery.removeListener(updateViewport);
  }, []);

  useEffect(() => {
    if (!chartPreferencesReady) {
      return;
    }

    persistChartType(CHART_TYPE_STORAGE_KEYS.mockExam, mockChartType);
  }, [chartPreferencesReady, mockChartType]);

  useEffect(() => {
    if (!chartPreferencesReady) {
      return;
    }

    persistChartType(CHART_TYPE_STORAGE_KEYS.physical, physicalChartType);
  }, [chartPreferencesReady, physicalChartType]);

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

  const mockExamTableRows = buildMockExamTableRows(mockScores, mockExams);

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

  const physicalMetricItems = [
    { category: "배근력", metricKey: "back_strength" },
    { category: "메디신볼", metricKey: "medicine_ball" },
    { category: "제자리멀리뛰기", metricKey: "standing_jump" },
    { category: "10m왕복", metricKey: "run_10m" },
    { category: "좌전굴", metricKey: "sit_reach" },
    { category: "20m왕복달리기", metricKey: "run_20m" },
  ] as const;

  const physicalGroupedChartData = physicalMetricItems.map((item) => ({
    category: item.category,
    metricKey: item.metricKey,
    ...Object.fromEntries(physicalSeries.map((series) => [series.key, series.values[item.metricKey as keyof typeof series.values]])),
    ...Object.fromEntries(
      physicalSeries.map((series) => [`${series.key}__record`, series.records[item.metricKey as keyof typeof series.records]])
    ),
  }));

  const physicalChartGroup1 = physicalGroupedChartData.filter((item) =>
    ["back_strength", "medicine_ball", "standing_jump"].includes(String(item.metricKey))
  );
  const physicalChartGroup2 = physicalGroupedChartData.filter((item) =>
    ["run_10m", "sit_reach", "run_20m"].includes(String(item.metricKey))
  );
  const physicalRecordRows = [...physicalChartData].reverse();

  const styles: { [key: string]: React.CSSProperties } = {
    detailCard: {
      background: isPrintMode ? "#ffffff" : portalTheme.gradients.card,
      padding: isPrintMode ? "0" : "clamp(16px, 3vw, 24px)",
      borderRadius: portalTheme.radius.md,
      boxShadow: isPrintMode ? "none" : portalTheme.shadows.panel,
      border: isPrintMode ? "none" : `1px solid ${portalTheme.colors.line}`,
      position: !isPrintMode && sticky ? "sticky" : "relative",
      top: !isPrintMode && sticky ? "20px" : undefined,
      breakInside: "avoid",
      pageBreakInside: "avoid",
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
      breakInside: "avoid",
      pageBreakInside: "avoid",
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
      breakInside: "avoid",
      pageBreakInside: "avoid",
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
      breakInside: "avoid",
      pageBreakInside: "avoid",
    },
    sectionHeaderRow: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: "12px",
      flexWrap: "wrap",
      marginBottom: "14px",
    },
    sectionHeaderCopy: {
      flex: "1 1 320px",
      minWidth: 0,
    },
    examTablesGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 460px), 1fr))",
      gap: "12px",
      marginBottom: "16px",
    },
    examTableCard: {
      background: "linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(248,250,252,0.98) 100%)",
      borderRadius: portalTheme.radius.md,
      border: `1px solid ${portalTheme.colors.line}`,
      boxShadow: portalTheme.shadows.soft,
      minWidth: 0,
      overflow: "hidden",
      breakInside: "avoid",
      pageBreakInside: "avoid",
    },
    examTableHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: "10px",
      padding: "12px 14px 10px 14px",
      borderBottom: `1px solid ${portalTheme.colors.line}`,
    },
    examTableTitle: {
      margin: 0,
      fontSize: "15px",
      fontWeight: 900,
      color: portalTheme.colors.textStrong,
    },
    examTableHint: {
      margin: "4px 0 0 0",
      fontSize: "11px",
      color: portalTheme.colors.textMuted,
      lineHeight: 1.4,
    },
    examTableBadge: {
      display: "inline-flex",
      alignItems: "center",
      padding: "5px 9px",
      borderRadius: portalTheme.radius.pill,
      background: portalTheme.colors.surfaceCardAlt,
      color: portalTheme.colors.textMuted,
      fontSize: "10px",
      fontWeight: 800,
      whiteSpace: "nowrap",
      border: `1px solid ${portalTheme.colors.line}`,
    },
    examTableWrap: {
      width: "100%",
      overflowX: isPrintMode ? "visible" : isMobileViewport ? "auto" : "visible",
    },
    examTable: {
      width: "100%",
      borderCollapse: "separate",
      borderSpacing: 0,
      tableLayout: "fixed",
      minWidth: isMobileViewport ? "720px" : undefined,
    },
    examTableGroupHead: {
      padding: "9px 4px",
      fontSize: "13px",
      fontWeight: 600,
      textAlign: "center",
      color: "#ffffff",
      background: "#334155",
      borderBottom: `1px solid ${portalTheme.colors.line}`,
    },
    examTableSubHead: {
      padding: "7px 4px",
      fontSize: "13px",
      fontWeight: 600,
      textAlign: "center",
      color: portalTheme.colors.textStrong,
      background: "rgba(226, 232, 240, 0.9)",
      borderBottom: `1px solid ${portalTheme.colors.line}`,
    },
    examTableRowLabel: {
      padding: "10px 6px",
      fontSize: "17px",
      fontWeight: 700,
      color: portalTheme.colors.textStrong,
      textAlign: "center",
      background: "rgba(241, 245, 249, 0.72)",
      borderBottom: `1px solid ${portalTheme.colors.line}`,
    },
    examTableCell: {
      padding: "9px 4px",
      fontSize: "16px",
      color: portalTheme.colors.textPrimary,
      textAlign: "center",
      borderBottom: `1px solid ${portalTheme.colors.line}`,
      whiteSpace: "normal",
      wordBreak: "keep-all",
      lineHeight: 1.35,
    },
    examTableCellEmphasis: {
      fontWeight: 600,
    },
    examTableRowStripe: {
      background: "rgba(248, 250, 252, 0.75)",
    },
    examTableRowHover: {
      background: "rgba(241, 245, 249, 0.9)",
    },
    examTableRowHighlight: {
      background: "rgba(255, 247, 237, 0.82)",
    },
    examTableSubjectCell: {
      fontSize: "14px",
      fontWeight: 500,
      color: portalTheme.colors.textPrimary,
      wordBreak: "keep-all",
    },
    examTableRawValue: {
      color: portalTheme.colors.textStrong,
    },
    examTableStdValue: {
      color: "#2563eb",
    },
    examTablePctValue: {
      color: "#059669",
    },
    examTableGradeValue: {
      color: "#dc2626",
    },
    chartGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
      gap: "14px",
    },
    physicalChartGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 360px), 1fr))",
      gap: "14px",
      width: "100%",
    },
    physicalRecordGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 360px), 1fr))",
      gap: "14px",
      width: "100%",
    },
    chartPanel: {
      background: portalTheme.colors.surfacePanel,
      borderRadius: portalTheme.radius.md,
      padding: "16px",
      border: `1px solid ${portalTheme.colors.line}`,
      boxShadow: portalTheme.shadows.soft,
      breakInside: "avoid",
      pageBreakInside: "avoid",
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
      minWidth: 0,
      breakInside: "avoid",
      pageBreakInside: "avoid",
    },
    chartWrap: {
      width: "100%",
      minWidth: "280px",
      height: isPrintMode ? "320px" : "clamp(320px, 42vw, 380px)",
    },
    recordTableCard: {
      background: "linear-gradient(180deg, rgba(255,255,255,0.97) 0%, rgba(248,250,252,0.98) 100%)",
      borderRadius: portalTheme.radius.md,
      padding: "0",
      border: `1px solid ${portalTheme.colors.line}`,
      boxShadow: portalTheme.shadows.card,
      minWidth: 0,
      overflow: "hidden",
      breakInside: "avoid",
      pageBreakInside: "avoid",
    },
    recordTableCardInner: {
      padding: "14px 16px 16px 16px",
    },
    recordTableTitleBar: {
      padding: "14px 16px 12px 16px",
      borderBottom: `1px solid ${portalTheme.colors.line}`,
    },
    recordTableTitle: {
      margin: 0,
      fontSize: "16px",
      fontWeight: 900,
      color: portalTheme.colors.textStrong,
    },
    recordTableTitleHint: {
      margin: "6px 0 0 0",
      fontSize: "12px",
      lineHeight: 1.5,
      color: portalTheme.colors.textMuted,
    },
    recordTableWrap: {
      width: "100%",
      overflowX: isPrintMode ? "visible" : "auto",
    },
    recordTable: {
      width: "100%",
      borderCollapse: "collapse",
      minWidth: "360px",
    },
    recordTableHeadCell: {
      padding: "10px 12px",
      borderBottom: `1px solid ${portalTheme.colors.line}`,
      color: portalTheme.colors.textStrong,
      fontSize: "12px",
      fontWeight: 800,
      textAlign: "left",
      whiteSpace: "nowrap",
    },
    recordTableCell: {
      padding: "11px 12px",
      borderBottom: `1px solid ${portalTheme.colors.line}`,
      color: portalTheme.colors.textPrimary,
      fontSize: "13px",
      whiteSpace: "nowrap",
      transition: "background-color 160ms ease, transform 160ms ease",
    },
    recordTableRowAlt: {
      background: "rgba(15, 23, 42, 0.02)",
    },
    recordTableRowRecent: {
      background: "rgba(255,255,255,0.98)",
      boxShadow: "inset 3px 0 0 rgba(225, 29, 72, 0.22)",
    },
    recordTableRowHover: {
      background: "rgba(255,255,255,0.94)",
    },
    recordDateCell: {
      fontWeight: 800,
      color: portalTheme.colors.textStrong,
    },
    recordRankPill: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      minWidth: "44px",
      padding: "6px 10px",
      borderRadius: portalTheme.radius.pill,
      fontSize: "12px",
      fontWeight: 900,
      border: "1px solid transparent",
    },
    recordMetricValue: {
      fontWeight: 800,
      color: portalTheme.colors.textStrong,
    },
    chartTypeControls: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      flexWrap: "wrap",
      justifyContent: "flex-end",
      flex: "0 1 auto",
    },
    chartTypeLabel: {
      fontSize: "12px",
      fontWeight: 800,
      color: portalTheme.colors.textMuted,
      whiteSpace: "nowrap",
    },
    chartTypeButtons: {
      display: "flex",
      alignItems: "center",
      gap: "6px",
      padding: "4px",
      borderRadius: portalTheme.radius.pill,
      border: `1px solid ${portalTheme.colors.line}`,
      background: portalTheme.colors.surfacePanel,
      overflowX: "auto",
    },
    chartTypeButton: {
      border: 0,
      borderRadius: portalTheme.radius.pill,
      background: "transparent",
      color: portalTheme.colors.textMuted,
      padding: "8px 12px",
      fontSize: "12px",
      fontWeight: 800,
      cursor: "pointer",
      whiteSpace: "nowrap",
      transition: "background-color 160ms ease, color 160ms ease, box-shadow 160ms ease",
    },
    chartTypeButtonActive: {
      background: portalTheme.colors.primarySoft,
      color: portalTheme.colors.primaryStrong,
      boxShadow: "inset 0 0 0 1px rgba(37, 99, 235, 0.12)",
    },
    actionButtons: {
      display: "flex",
      gap: "8px",
      marginTop: "16px",
      flexWrap: "wrap",
      breakInside: "avoid",
      pageBreakInside: "avoid",
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
        <div style={styles.sectionHeaderRow}>
          <div style={styles.sectionHeaderCopy}>
            <h3 style={styles.sectionTitle}>모의고사 및 수능</h3>
            <p style={styles.sectionHint}>3모, 6모, 9모, 수능을 한 번에 비교할 수 있도록 성적표를 표 형태로 정리하고, 아래에는 회차별 차트를 이어서 배치했습니다.</p>
          </div>
        </div>
        <div style={styles.examTablesGrid}>
          <MockExamScoreTable
            title="국어 · 수학 · 영어"
            hint="주요 공통/절대평가 과목을 4개 시험 기준으로 비교합니다."
            rows={mockExamTableRows}
            tableSide="left"
            styles={styles}
          />
          <MockExamScoreTable
            title="탐구1 · 탐구2 · 한국사"
            hint="탐구 및 한국사 성적을 같은 시험 순서로 정렬했습니다."
            rows={mockExamTableRows}
            tableSide="right"
            styles={styles}
          />
        </div>
        <div style={styles.sectionHeaderRow}>
          <div style={styles.sectionHeaderCopy}>
            <h4 style={styles.chartPanelTitle}>모의고사 및 수능 차트</h4>
            <p style={styles.chartPanelHint}>시험 회차별 비교는 기존 차트 영역에서 그대로 확인할 수 있습니다.</p>
          </div>
          <ChartTypeSelector
            label="그래프 형태"
            value={mockChartType}
            onChange={setMockChartType}
            styles={styles}
          />
        </div>
        {stdSeries.length === 0 && pctSeries.length === 0 ? (
          <EmptyState title="모의고사 데이터가 없습니다" description="저장된 모의고사 기록이 없습니다." />
        ) : (
          <div style={styles.chartGrid}>
            <div style={styles.chartPanel}>
              <h4 style={styles.chartPanelTitle}>표준점수</h4>
              <p style={styles.chartPanelHint}>과목별로 각 시험 회차의 표준점수를 비교합니다.</p>
              {stdSeries.length === 0 ? (
                <EmptyState title="표준점수 데이터가 없습니다" description="표시할 표준점수 기록이 없습니다." />
              ) : (
                <div style={styles.chartWrap}>
                  <SeriesComparisonChart
                    chartType={mockChartType}
                    data={stdChartData}
                    series={stdSeries}
                    tooltip={<GroupedSeriesTooltip titleLabel="과목" />}
                    disableAnimation={isPrintMode}
                  />
                </div>
              )}
            </div>

            <div style={styles.chartPanel}>
              <h4 style={styles.chartPanelTitle}>백분위</h4>
              <p style={styles.chartPanelHint}>과목별로 각 시험 회차의 백분위를 빠르게 비교합니다.</p>
              {pctSeries.length === 0 ? (
                <EmptyState title="백분위 데이터가 없습니다" description="표시할 백분위 기록이 없습니다." />
              ) : (
                <div style={styles.chartWrap}>
                  <SeriesComparisonChart
                    chartType={mockChartType}
                    data={pctChartData}
                    series={pctSeries}
                    tooltip={<GroupedSeriesTooltip titleLabel="과목" />}
                    yAxisDomain={[0, 100]}
                    disableAnimation={isPrintMode}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div style={styles.section}>
        <div style={styles.sectionHeaderRow}>
          <div style={styles.sectionHeaderCopy}>
            <h3 style={styles.sectionTitle}>실기 테스트 기록</h3>
            <p style={styles.sectionHint}>최근 회차가 위로 오도록 정리했고, 차트에 쓰는 동일한 종목 묶음 기준으로 두 개의 기록표를 나눴습니다.</p>
          </div>
        </div>
        {physicalRecordRows.length === 0 ? (
          <EmptyState title="실기 기록이 없습니다" description="저장된 실기 측정 기록이 없습니다." />
        ) : (
          <div style={styles.physicalRecordGrid}>
            {PHYSICAL_TABLE_GROUPS.map((group) => (
              <PhysicalRecordTable
                key={group.title}
                title={group.title}
                theme={group.theme}
                columns={group.columns}
                rows={physicalRecordRows}
                styles={styles}
              />
            ))}
          </div>
        )}
      </div>

      <div style={styles.section}>
        <div style={styles.sectionHeaderRow}>
          <div style={styles.sectionHeaderCopy}>
            <h3 style={styles.sectionTitle}>실기차트</h3>
            <p style={styles.sectionHint}>대표 종목 6개를 계열별로 나눠, 측정 회차를 색상으로 유지한 채 두 개의 차트로 정리했습니다.</p>
          </div>
          <ChartTypeSelector
            label="그래프 형태"
            value={physicalChartType}
            onChange={setPhysicalChartType}
            styles={styles}
          />
        </div>
        {physicalSeries.length === 0 ? (
          <EmptyState title="실기 데이터가 없습니다" description="저장된 실기 기록이 없습니다." />
        ) : (
          <div style={styles.physicalChartGrid}>
            <div style={styles.chartCard}>
              <h4 style={styles.chartPanelTitle}>{PHYSICAL_TABLE_GROUPS[0].chartTitle}</h4>
              <p style={styles.chartPanelHint}>{PHYSICAL_TABLE_GROUPS[0].chartHint}</p>
              <div style={styles.chartWrap}>
                <SeriesComparisonChart
                  chartType={physicalChartType}
                  data={physicalChartGroup1}
                  series={physicalSeries}
                  tooltip={<PhysicalTrendTooltip />}
                  xAxisTickFormatter={formatPhysicalCategoryTick}
                  xAxisHeight={68}
                  chartMargin={{ top: 20, right: 20, left: 10, bottom: 46 }}
                  disableAnimation={isPrintMode}
                />
              </div>
            </div>

            <div style={styles.chartCard}>
              <h4 style={styles.chartPanelTitle}>{PHYSICAL_TABLE_GROUPS[1].chartTitle}</h4>
              <p style={styles.chartPanelHint}>{PHYSICAL_TABLE_GROUPS[1].chartHint}</p>
              <div style={styles.chartWrap}>
                <SeriesComparisonChart
                  chartType={physicalChartType}
                  data={physicalChartGroup2}
                  series={physicalSeries}
                  tooltip={<PhysicalTrendTooltip />}
                  xAxisTickFormatter={formatPhysicalCategoryTick}
                  xAxisHeight={68}
                  chartMargin={{ top: 20, right: 20, left: 10, bottom: 46 }}
                  disableAnimation={isPrintMode}
                />
              </div>
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

function ChartTypeSelector({
  label,
  value,
  onChange,
  styles,
}: {
  label: string;
  value: ChartType;
  onChange: (value: ChartType) => void;
  styles: Record<string, React.CSSProperties>;
}) {
  return (
    <div style={styles.chartTypeControls}>
      <span style={styles.chartTypeLabel}>{label}</span>
      <div style={styles.chartTypeButtons}>
        {CHART_TYPE_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            style={{
              ...styles.chartTypeButton,
              ...(value === option.value ? styles.chartTypeButtonActive : null),
            }}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function MockExamScoreTable({
  title,
  hint,
  rows,
  tableSide,
  styles,
}: {
  title: string;
  hint: string;
  rows: MockExamTableRow[];
  tableSide: "left" | "right";
  styles: Record<string, React.CSSProperties>;
}) {
  const isLeft = tableSide === "left";
  const [hoveredRowKey, setHoveredRowKey] = useState<string | null>(null);
  const groupHeadStyle = {
    ...styles.examTableGroupHead,
    background: isLeft ? "#334155" : "#1f4f6b",
  };
  const subHeadStyle = {
    ...styles.examTableSubHead,
    background: isLeft ? "rgba(226, 232, 240, 0.94)" : "rgba(219, 234, 254, 0.92)",
  };

  return (
    <div style={styles.examTableCard}>
      <div style={styles.examTableHeader}>
        <div>
          <h4 style={styles.examTableTitle}>{title}</h4>
          <p style={styles.examTableHint}>{hint}</p>
        </div>
        <span style={styles.examTableBadge}>4개 시험 비교</span>
      </div>
      <div style={styles.examTableWrap}>
        <table style={styles.examTable}>
          <colgroup>
            <col style={{ width: "8%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "6%" }} />
            <col style={{ width: "6%" }} />
            <col style={{ width: "6%" }} />
            <col style={{ width: "6%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "6%" }} />
            <col style={{ width: "6%" }} />
            <col style={{ width: "6%" }} />
            <col style={{ width: "6%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "10%" }} />
          </colgroup>
          <thead>
            <tr>
              <th style={groupHeadStyle} rowSpan={2}>구분</th>
              {isLeft ? (
                <>
                  <th style={groupHeadStyle} colSpan={5}>국어</th>
                  <th style={groupHeadStyle} colSpan={5}>수학</th>
                  <th style={groupHeadStyle} colSpan={2}>영어</th>
                </>
              ) : (
                <>
                  <th style={groupHeadStyle} colSpan={5}>탐구1</th>
                  <th style={groupHeadStyle} colSpan={5}>탐구2</th>
                  <th style={groupHeadStyle} colSpan={2}>한국사</th>
                </>
              )}
            </tr>
            <tr>
              {isLeft ? (
                <>
                  <th style={subHeadStyle}>과목명</th>
                  <th style={subHeadStyle}>원</th>
                  <th style={subHeadStyle}>표</th>
                  <th style={subHeadStyle}>백</th>
                  <th style={subHeadStyle}>등</th>
                  <th style={subHeadStyle}>과목명</th>
                  <th style={subHeadStyle}>원</th>
                  <th style={subHeadStyle}>표</th>
                  <th style={subHeadStyle}>백</th>
                  <th style={subHeadStyle}>등</th>
                  <th style={subHeadStyle}>원</th>
                  <th style={subHeadStyle}>등</th>
                </>
              ) : (
                <>
                  <th style={subHeadStyle}>과목명</th>
                  <th style={subHeadStyle}>원</th>
                  <th style={subHeadStyle}>표</th>
                  <th style={subHeadStyle}>백</th>
                  <th style={subHeadStyle}>등</th>
                  <th style={subHeadStyle}>과목명</th>
                  <th style={subHeadStyle}>원</th>
                  <th style={subHeadStyle}>표</th>
                  <th style={subHeadStyle}>백</th>
                  <th style={subHeadStyle}>등</th>
                  <th style={subHeadStyle}>원</th>
                  <th style={subHeadStyle}>등</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const isHighlightedRow = row.key === "suneung";
              const isHovered = hoveredRowKey === row.key;

              return (
                <tr
                  key={row.key}
                  style={{
                    ...(index % 2 === 1 ? styles.examTableRowStripe : null),
                    ...(isHighlightedRow ? styles.examTableRowHighlight : null),
                    ...(isHovered ? styles.examTableRowHover : null),
                  }}
                  onMouseEnter={() => setHoveredRowKey(row.key)}
                  onMouseLeave={() => setHoveredRowKey(null)}
                >
                  <td style={styles.examTableRowLabel}>{row.label}</td>
                  {isLeft ? renderMockExamLeftCells(row, styles) : renderMockExamRightCells(row, styles)}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PhysicalRecordTable({
  title,
  theme,
  columns,
  rows,
  styles,
}: {
  title: string;
  theme: PhysicalTableTheme;
  columns: PhysicalTableColumn[];
  rows: StudentPhysicalChartPoint[];
  styles: Record<string, React.CSSProperties>;
}) {
  const [hoveredRowIndex, setHoveredRowIndex] = useState<number | null>(null);
  const tableTheme = getPhysicalTableTheme(theme);

  return (
    <div style={styles.recordTableCard}>
      <div style={{ ...styles.recordTableTitleBar, background: tableTheme.titleBackground }}>
        <h4 style={{ ...styles.recordTableTitle, color: tableTheme.titleColor }}>{title}</h4>
        <p style={{ ...styles.recordTableTitleHint, color: tableTheme.hintColor }}>최근 기록을 먼저 보여주고, 차트 바로 위에서 핵심 수치를 빠르게 읽을 수 있게 정리했습니다.</p>
      </div>
      <div style={styles.recordTableCardInner}>
        <div style={styles.recordTableWrap}>
          <table style={styles.recordTable}>
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column.key} style={{ ...styles.recordTableHeadCell, background: tableTheme.headerBackground }}>
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const isLatestRow = index === 0;
                const isHovered = hoveredRowIndex === index;

                return (
                  <tr
                    key={`${row.test_id}-${row.test_date}-${index}`}
                    style={{
                      ...(index % 2 === 1 ? styles.recordTableRowAlt : null),
                      ...(isLatestRow ? styles.recordTableRowRecent : null),
                      ...(isHovered ? styles.recordTableRowHover : null),
                    }}
                    onMouseEnter={() => setHoveredRowIndex(index)}
                    onMouseLeave={() => setHoveredRowIndex(null)}
                  >
                    {columns.map((column) => (
                      <td key={column.key} style={styles.recordTableCell}>
                        {renderPhysicalTableCell(row, column.key, styles, tableTheme)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SeriesComparisonChart({
  chartType,
  data,
  series,
  tooltip,
  disableAnimation = false,
  yAxisDomain,
  xAxisTickFormatter,
  xAxisHeight,
  chartMargin,
}: {
  chartType: ChartType;
  data: Array<Record<string, unknown>>;
  series: MetricSeries[];
  tooltip: React.ReactElement;
  disableAnimation?: boolean;
  yAxisDomain?: [number, number];
  xAxisTickFormatter?: (value: string) => string | string[];
  xAxisHeight?: number;
  chartMargin?: { top: number; right: number; left: number; bottom: number };
}) {
  const resolvedMargin = chartMargin || { top: 8, right: 12, left: 0, bottom: 18 };
  const resolvedXAxisHeight = xAxisHeight || 42;

  if (chartType === "line") {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={resolvedMargin}>
          <CartesianGrid stroke={portalTheme.colors.lineStrong} strokeDasharray="3 3" />
          <XAxis
            dataKey="category"
            tick={xAxisTickFormatter ? <MultilineXAxisTick formatter={xAxisTickFormatter} /> : { fontSize: 11, fill: portalTheme.colors.textPrimary, fontWeight: 800 }}
            interval={0}
            height={resolvedXAxisHeight}
            tickLine={false}
            axisLine={{ stroke: portalTheme.colors.lineStrong }}
          />
          <YAxis
            domain={yAxisDomain}
            tick={{ fontSize: 12, fill: portalTheme.colors.textMuted }}
          />
          <Tooltip cursor={{ stroke: "rgba(225, 29, 72, 0.18)", strokeWidth: 1 }} content={tooltip} />
          <Legend wrapperStyle={legendStyle} />
          {series.map((item) => (
            <Line
              key={item.key}
              type="monotone"
              dataKey={item.key}
              name={item.label}
              stroke={item.color}
              strokeWidth={3}
              isAnimationActive={!disableAnimation}
              dot={{ r: 4, strokeWidth: 2, fill: "#ffffff" }}
              activeDot={{ r: 6, strokeWidth: 2, fill: item.color }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={resolvedMargin} barGap={6} barCategoryGap="24%">
        <CartesianGrid stroke={portalTheme.colors.lineStrong} strokeDasharray="3 3" />
        <XAxis
          dataKey="category"
          tick={xAxisTickFormatter ? <MultilineXAxisTick formatter={xAxisTickFormatter} /> : { fontSize: 11, fill: portalTheme.colors.textPrimary, fontWeight: 800 }}
          interval={0}
          height={resolvedXAxisHeight}
          tickLine={false}
          axisLine={{ stroke: portalTheme.colors.lineStrong }}
        />
        <YAxis
          domain={yAxisDomain}
          tick={{ fontSize: 12, fill: portalTheme.colors.textMuted }}
        />
        <Tooltip cursor={{ fill: "rgba(225, 29, 72, 0.1)" }} content={tooltip} />
        <Legend wrapperStyle={legendStyle} />
        {series.map((item) => (
          <Bar key={item.key} dataKey={item.key} name={item.label} fill={item.color} radius={[6, 6, 0, 0]} maxBarSize={26} isAnimationActive={!disableAnimation} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

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

function MultilineXAxisTick({
  x = 0,
  y = 0,
  payload,
  formatter,
}: {
  x?: number;
  y?: number;
  payload?: { value?: string };
  formatter: (value: string) => string | string[];
}) {
  const rawValue = String(payload?.value ?? "");
  const formattedValue = formatter(rawValue);
  const lines = Array.isArray(formattedValue) ? formattedValue : [formattedValue];

  return (
    <g transform={`translate(${x},${y})`}>
      <text textAnchor="middle" fill={portalTheme.colors.textPrimary} fontSize={11} fontWeight={800}>
        {lines.map((line, index) => (
          <tspan key={`${rawValue}-${index}`} x={0} dy={index === 0 ? 14 : 14}>
            {line}
          </tspan>
        ))}
      </text>
    </g>
  );
}

function formatPhysicalCategoryTick(value: string) {
  if (value === "제자리멀리뛰기") {
    return ["제자리", "멀리뛰기"];
  }

  if (value === "20m왕복달리기") {
    return ["20m왕복", "달리기"];
  }

  if (value === "20m왕복") {
    return ["20m왕복", "달리기"];
  }

  return value;
}

function readStoredChartType(storageKey: string): ChartType {
  if (typeof window === "undefined") {
    return "bar";
  }

  try {
    const storedValue = window.localStorage.getItem(storageKey);
    return storedValue === "line" ? "line" : "bar";
  } catch {
    return "bar";
  }
}

function persistChartType(storageKey: string, value: ChartType) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(storageKey, value);
  } catch {}
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

function buildMockExamTableRows(mockScores: MockScore[], mockExams: MockExam[]): MockExamTableRow[] {
  const examsById = new Map(mockExams.map((exam) => [String(exam.exam_id || "").trim(), exam]));
  const groupedScores = new Map<MockExamGroupKey, MockScore>();

  [...mockScores]
    .sort((left, right) => {
      const leftExam = examsById.get(String(left.exam_id || "").trim());
      const rightExam = examsById.get(String(right.exam_id || "").trim());
      return getMockExamSortWeight(leftExam, left) - getMockExamSortWeight(rightExam, right);
    })
    .forEach((score) => {
      const exam = examsById.get(String(score.exam_id || "").trim());
      const examGroup = resolveMockExamGroup(score, exam);

      if (examGroup && !groupedScores.has(examGroup)) {
        groupedScores.set(examGroup, score);
      }
    });

  return MOCK_EXAM_ROW_ORDER.map((row) => {
    const score = groupedScores.get(row.key);
    return {
      key: row.key,
      label: row.label,
      left: {
        korean: buildMockExamSummaryCell(score, "korean"),
        math: buildMockExamSummaryCell(score, "math"),
        english: buildMockExamSummaryCell(score, "english"),
      },
      right: {
        inquiry1: buildMockExamSummaryCell(score, "inquiry1"),
        inquiry2: buildMockExamSummaryCell(score, "inquiry2"),
        history: buildMockExamSummaryCell(score, "history"),
      },
    };
  });
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

function renderPhysicalTableCell(
  point: StudentPhysicalChartPoint,
  key: PhysicalTableColumn["key"],
  styles: Record<string, React.CSSProperties>,
  tableTheme: ReturnType<typeof getPhysicalTableTheme>
) {
  if (key === "test_date") {
    return <span style={styles.recordDateCell}>{formatPhysicalTableDate(point.test_date)}</span>;
  }

  if (key === "rank_no") {
    return <span style={{ ...styles.recordRankPill, background: tableTheme.rankBackground, color: tableTheme.rankColor, borderColor: tableTheme.rankBorder }}>{point.rank_no || "-"}</span>;
  }

  return <span style={styles.recordMetricValue}>{formatPhysicalTableMetric(key, point)}</span>;
}

function formatPhysicalTableDate(value: string) {
  const raw = String(value || "").trim();

  if (!raw) {
    return "-";
  }

  const matched = raw.match(/^(\d{4})[-./]?(\d{1,2})(?:[-./]?(\d{1,2}))?$/);

  if (!matched) {
    return raw;
  }

  const [, year, month, day] = matched;
  const normalizedMonth = String(month).padStart(2, "0");
  const normalizedDay = day ? String(day).padStart(2, "0") : "";

  return normalizedDay ? `${year.slice(2)}.${normalizedMonth}.${normalizedDay}` : `${year.slice(2)}.${normalizedMonth}`;
}

function formatPhysicalTableMetric(metricKey: PhysicalMetricKey, point: StudentPhysicalChartPoint) {
  const valueMap: Record<PhysicalMetricKey, string> = {
    back_strength: point.back_strength_record,
    run_10m: point.run_10m_record,
    medicine_ball: point.medicine_ball_record,
    sit_reach: point.sit_reach_record,
    standing_jump: point.standing_jump_record,
    run_20m: point.run_20m_record,
  };

  const rawValue = String(valueMap[metricKey] || "").trim();

  if (!rawValue) {
    return "-";
  }

  if (metricKey === "standing_jump") {
    const centimeters = normalizeStandingJumpCentimeters(rawValue);
    return centimeters ? `${centimeters}cm` : rawValue;
  }

  if (metricKey === "back_strength") {
    return `${rawValue}kg`;
  }

  if (metricKey === "medicine_ball" || metricKey === "sit_reach") {
    return `${rawValue}cm`;
  }

  if (metricKey === "run_10m" || metricKey === "run_20m") {
    return `${rawValue}초`;
  }

  return rawValue;
}

function normalizeStandingJumpCentimeters(rawValue: string) {
  const numericValue = Number(rawValue);

  if (!Number.isFinite(numericValue)) {
    return "";
  }

  const centimeters = numericValue <= 10 ? numericValue * 100 : numericValue;
  const roundedValue = Math.round(centimeters * 10) / 10;

  return Number.isInteger(roundedValue) ? String(Math.trunc(roundedValue)) : String(roundedValue);
}

function renderMockExamLeftCells(row: MockExamTableRow, styles: Record<string, React.CSSProperties>) {
  return [
    renderMockExamTextCell(`left-korean-name-${row.key}`, row.left.korean.subjectName, styles, "subject"),
    renderMockExamTextCell(`left-korean-raw-${row.key}`, row.left.korean.raw, styles, "raw"),
    renderMockExamTextCell(`left-korean-std-${row.key}`, row.left.korean.std, styles, "std"),
    renderMockExamTextCell(`left-korean-pct-${row.key}`, row.left.korean.pct, styles, "pct"),
    renderMockExamTextCell(`left-korean-grade-${row.key}`, row.left.korean.grade, styles, "grade"),
    renderMockExamTextCell(`left-math-name-${row.key}`, row.left.math.subjectName, styles, "subject"),
    renderMockExamTextCell(`left-math-raw-${row.key}`, row.left.math.raw, styles, "raw"),
    renderMockExamTextCell(`left-math-std-${row.key}`, row.left.math.std, styles, "std"),
    renderMockExamTextCell(`left-math-pct-${row.key}`, row.left.math.pct, styles, "pct"),
    renderMockExamTextCell(`left-math-grade-${row.key}`, row.left.math.grade, styles, "grade"),
    renderMockExamTextCell(`left-english-raw-${row.key}`, row.left.english.raw, styles, "raw"),
    renderMockExamTextCell(`left-english-grade-${row.key}`, row.left.english.grade, styles, "grade"),
  ];
}

function renderMockExamRightCells(row: MockExamTableRow, styles: Record<string, React.CSSProperties>) {
  return [
    renderMockExamTextCell(`right-inquiry1-name-${row.key}`, row.right.inquiry1.subjectName, styles, "subject"),
    renderMockExamTextCell(`right-inquiry1-raw-${row.key}`, row.right.inquiry1.raw, styles, "raw"),
    renderMockExamTextCell(`right-inquiry1-std-${row.key}`, row.right.inquiry1.std, styles, "std"),
    renderMockExamTextCell(`right-inquiry1-pct-${row.key}`, row.right.inquiry1.pct, styles, "pct"),
    renderMockExamTextCell(`right-inquiry1-grade-${row.key}`, row.right.inquiry1.grade, styles, "grade"),
    renderMockExamTextCell(`right-inquiry2-name-${row.key}`, row.right.inquiry2.subjectName, styles, "subject"),
    renderMockExamTextCell(`right-inquiry2-raw-${row.key}`, row.right.inquiry2.raw, styles, "raw"),
    renderMockExamTextCell(`right-inquiry2-std-${row.key}`, row.right.inquiry2.std, styles, "std"),
    renderMockExamTextCell(`right-inquiry2-pct-${row.key}`, row.right.inquiry2.pct, styles, "pct"),
    renderMockExamTextCell(`right-inquiry2-grade-${row.key}`, row.right.inquiry2.grade, styles, "grade"),
    renderMockExamTextCell(`right-history-raw-${row.key}`, row.right.history.raw, styles, "raw"),
    renderMockExamTextCell(`right-history-grade-${row.key}`, row.right.history.grade, styles, "grade"),
  ];
}

function renderMockExamTextCell(
  key: string,
  value: string | undefined,
  styles: Record<string, React.CSSProperties>,
  kind: "subject" | "raw" | "std" | "pct" | "grade"
) {
  const kindStyle =
    kind === "subject"
      ? styles.examTableSubjectCell
      : kind === "raw"
        ? styles.examTableRawValue
        : kind === "std"
          ? styles.examTableStdValue
          : kind === "pct"
            ? styles.examTablePctValue
            : styles.examTableGradeValue;

  return (
    <td key={key} style={{ ...styles.examTableCell, ...styles.examTableCellEmphasis, ...kindStyle }}>
      {String(value || "").trim()}
    </td>
  );
}

function buildMockExamSummaryCell(
  score: MockScore | undefined,
  subject: "korean" | "math" | "english" | "inquiry1" | "inquiry2" | "history"
): MockExamSummaryCell {
  if (!score) {
    return {};
  }

  if (subject === "english") {
    return {
      raw: normalizeEmptyValue(score.english_raw),
      grade: normalizeEmptyValue(score.english_grade),
    };
  }

  if (subject === "history") {
    return {
      raw: normalizeEmptyValue(score.history_raw),
      grade: normalizeEmptyValue(score.history_grade),
    };
  }

  return {
    subjectName: normalizeSubjectLabel(subject, score[`${subject}_name`]),
    raw: normalizeEmptyValue(score[`${subject}_raw`]),
    std: normalizeEmptyValue(score[`${subject}_std`]),
    pct: normalizeEmptyValue(score[`${subject}_pct`]),
    grade: normalizeEmptyValue(score[`${subject}_grade`]),
  };
}

function normalizeSubjectLabel(
  subject: "korean" | "math" | "inquiry1" | "inquiry2",
  value: string | undefined
) {
  const raw = String(value || "").trim();

  if (!raw) {
    return "";
  }

  const compact = raw.replace(/\s+/g, "");

  if (subject === "korean") {
    if (/화법|화작/.test(compact)) {
      return "화법과작문";
    }

    if (/언어|언매/.test(compact)) {
      return "언어와매체";
    }
  }

  if (subject === "math") {
    if (/확률|확통/.test(compact)) {
      return "확률과통계";
    }

    if (/미적/.test(compact)) {
      return "미적분";
    }

    if (/기하/.test(compact)) {
      return "기하";
    }
  }

  const normalized = compact
    .replace(/^국어/, "")
    .replace(/^수학/, "")
    .replace(/^탐구1?/, "")
    .replace(/^탐구2?/, "")
    .replace(/^사회탐구/, "")
    .replace(/^과학탐구/, "");

  return normalized || compact;
}

function normalizeEmptyValue(value: string | undefined) {
  return String(value || "").trim();
}

function resolveMockExamGroup(score: MockScore, exam?: MockExam): MockExamGroupKey | null {
  const candidate = [score.exam_id, exam?.exam_id, exam?.exam_name, exam?.exam_date]
    .map((value) => String(value || "").trim().toLowerCase())
    .join(" ");

  if (/수능|suneung|sunung|csat/.test(candidate)) {
    return "suneung";
  }

  if (/9모|9월|9mo|09mo|9-m|9_mock/.test(candidate)) {
    return "9mo";
  }

  if (/6모|6월|6mo|06mo|6-m|6_mock/.test(candidate)) {
    return "6mo";
  }

  if (/3모|3월|3mo|03mo|3-m|3_mock/.test(candidate)) {
    return "3mo";
  }

  return null;
}

function getMockExamSortWeight(exam: MockExam | undefined, score: MockScore) {
  const group = resolveMockExamGroup(score, exam);

  switch (group) {
    case "3mo":
      return 1;
    case "6mo":
      return 2;
    case "9mo":
      return 3;
    case "suneung":
      return 4;
    default:
      return 99;
  }
}

function getPhysicalTableTheme(theme: PhysicalTableTheme) {
  if (theme === "warm") {
    return {
      titleBackground: "linear-gradient(135deg, rgba(251, 113, 133, 0.18) 0%, rgba(249, 115, 22, 0.16) 100%)",
      titleColor: "#9f1239",
      hintColor: "#9a3412",
      headerBackground: "rgba(255, 237, 213, 0.95)",
      rankBackground: "rgba(251, 113, 133, 0.12)",
      rankColor: "#be123c",
      rankBorder: "rgba(251, 113, 133, 0.24)",
    };
  }

  return {
    titleBackground: "linear-gradient(135deg, rgba(14, 165, 233, 0.16) 0%, rgba(20, 184, 166, 0.16) 100%)",
    titleColor: "#0f4c81",
    hintColor: "#0f766e",
    headerBackground: "rgba(224, 242, 254, 0.95)",
    rankBackground: "rgba(14, 165, 233, 0.12)",
    rankColor: "#0369a1",
    rankBorder: "rgba(14, 165, 233, 0.24)",
  };
}
