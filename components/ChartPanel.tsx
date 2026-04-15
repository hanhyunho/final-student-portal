"use client";

import React, { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Branch, PhysicalRecord, PhysicalTest, Student } from "@/lib/dataService";
import { EmptyState } from "@/components/EmptyState";
import { portalTheme } from "@/lib/theme";
import {
  buildBranchPhysicalComparison,
  formatMetricValue,
  getGenderFilterOptions,
  getPhysicalMetricMeta,
  getPhysicalMetricOptions,
  getPhysicalTestOptions,
  type GenderFilter,
  type PhysicalRankingMetric,
} from "@/lib/dashboardMetrics";

interface ChartPanelProps {
  branches: Branch[];
  students: Student[];
  physicalTests: PhysicalTest[];
  physicalRecords: PhysicalRecord[];
}

const BRANCH_BAR_COLORS = portalTheme.chart;

function CustomTooltip({
  active,
  payload,
  metric,
}: {
  active?: boolean;
  payload?: Array<{ payload?: { branchLabel?: string; value?: number; sourceCount?: number; includedCount?: number } }>;
  metric: PhysicalRankingMetric;
}) {
  if (!active || !payload?.length || !payload[0]?.payload) {
    return null;
  }

  const item = payload[0].payload;

  return (
    <div
      style={{
        background: "rgba(248,245,255,0.98)",
        border: "1px solid rgba(124, 58, 237, 0.18)",
        borderRadius: "14px",
        boxShadow: portalTheme.shadows.cardStrong,
        padding: "12px 14px",
      }}
    >
      <div style={{ fontSize: "13px", fontWeight: 800, color: portalTheme.colors.textStrong, marginBottom: "6px" }}>{item.branchLabel}</div>
      <div style={{ fontSize: "13px", color: portalTheme.colors.textMuted }}>{getPhysicalMetricMeta(metric).label} 평균 {formatMetricValue(metric, Number(item.value || 0))}</div>
      <div style={{ fontSize: "13px", color: portalTheme.colors.textMuted }}>원본 인원 {item.sourceCount || 0}명</div>
      <div style={{ fontSize: "13px", color: portalTheme.colors.textMuted }}>반영 인원 {item.includedCount || 0}명</div>
    </div>
  );
}

export function ChartPanel({
  branches,
  students,
  physicalTests,
  physicalRecords,
}: ChartPanelProps) {
  const branchTone = {
    panel: "linear-gradient(180deg, rgba(124, 58, 237, 0.08) 0%, rgba(255, 255, 255, 0.96) 38%)",
    surface: "rgba(124, 58, 237, 0.06)",
    surfaceStrong: "rgba(124, 58, 237, 0.09)",
    line: "rgba(124, 58, 237, 0.15)",
    accent: "#7c3aed",
  } as const;

  const genderOptions = useMemo(() => getGenderFilterOptions(), []);
  const metricOptions = useMemo(() => getPhysicalMetricOptions(), []);
  const testOptions = useMemo(() => getPhysicalTestOptions(physicalRecords, physicalTests), [physicalRecords, physicalTests]);
  const [selectedTestId, setSelectedTestId] = useState("");
  const [selectedGender, setSelectedGender] = useState<GenderFilter>("all");
  const [selectedMetric, setSelectedMetric] = useState<PhysicalRankingMetric>("total_score");

  const effectiveSelectedTestId = testOptions.some((option) => option.value === selectedTestId) ? selectedTestId : testOptions[0]?.value || "";
  const effectiveSelectedGender = genderOptions.some((option) => option.value === selectedGender)
    ? selectedGender
    : (genderOptions[0]?.value as GenderFilter | undefined) || "all";
  const effectiveSelectedMetric = metricOptions.some((option) => option.value === selectedMetric)
    ? selectedMetric
    : (metricOptions[0]?.value as PhysicalRankingMetric | undefined) || "total_score";

  const branchStats = useMemo(() => {
    if (!effectiveSelectedTestId) {
      return [];
    }

    return buildBranchPhysicalComparison({
      branches,
      students,
      physicalRecords,
      physicalTests,
      testId: effectiveSelectedTestId,
      genderFilter: effectiveSelectedGender,
      metric: effectiveSelectedMetric,
    });
  }, [branches, effectiveSelectedGender, effectiveSelectedMetric, effectiveSelectedTestId, physicalRecords, physicalTests, students]);

  const metricMeta = getPhysicalMetricMeta(effectiveSelectedMetric);
  const maxDomainValue = useMemo(
    () => Math.max(...branchStats.map((item) => item.value), 0),
    [branchStats]
  );

  const styles: Record<string, React.CSSProperties> = {
    chartGrid: {
      marginBottom: "22px",
    },
    chartPanel: {
      background: branchTone.panel,
      borderRadius: "22px",
      padding: "24px 26px",
      boxShadow: portalTheme.shadows.panel,
      border: `1px solid ${portalTheme.colors.line}`,
      borderLeft: "5px solid #7c3aed",
    },
    header: {
      display: "flex",
      flexDirection: "column",
      gap: "14px",
      marginBottom: "16px",
    },
    chartPanelTitle: {
      margin: 0,
      fontSize: "clamp(24px, 3vw, 28px)",
      fontWeight: 900,
      color: portalTheme.colors.textStrong,
      letterSpacing: "-0.02em",
    },
    chartPanelDesc: {
      margin: "8px 0 0 0",
      fontSize: "14px",
      color: portalTheme.colors.textMuted,
      lineHeight: 1.65,
      maxWidth: "64ch",
    },
    controlGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
      gap: "10px",
    },
    controlWrap: {
      display: "flex",
      flexDirection: "column",
      gap: "6px",
    },
    controlLabel: {
      fontSize: "13px",
      fontWeight: 800,
      color: portalTheme.colors.textPrimary,
    },
    select: {
      width: "100%",
      minHeight: "40px",
      padding: "0 12px",
      borderRadius: "12px",
      border: `1px solid ${branchTone.line}`,
      background: branchTone.surfaceStrong,
      color: portalTheme.colors.textStrong,
      fontSize: "14px",
      fontWeight: 700,
      boxShadow: "none",
    },
    helperText: {
      fontSize: "12px",
      color: portalTheme.colors.textSoft,
      minHeight: "16px",
    },
    chartSurface: {
      width: "100%",
      height: "380px",
      borderRadius: "18px",
      border: `1px solid ${branchTone.line}`,
      background: branchTone.surface,
      padding: "14px 10px 10px 10px",
      boxShadow: portalTheme.shadows.soft,
    },
    footer: {
      marginTop: "16px",
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
      gap: "12px",
    },
    footerCard: {
      background: branchTone.surface,
      borderRadius: "16px",
      border: `1px solid ${branchTone.line}`,
      padding: "14px 16px",
      boxShadow: portalTheme.shadows.soft,
    },
    footerLabel: {
      display: "block",
      color: portalTheme.colors.textMuted,
      fontSize: "12px",
      marginBottom: "6px",
    },
    footerValue: {
      color: portalTheme.colors.textStrong,
      fontSize: "18px",
      fontWeight: 900,
    },
  };

  const totalIncluded = branchStats.reduce((sum, item) => sum + item.includedCount, 0);
  const topBranch = branchStats[0];

  return (
    <section style={styles.chartGrid}>
      <div style={styles.chartPanel}>
        <div style={styles.header}>
          <div>
            <h3 style={styles.chartPanelTitle}>지점별 평균 비교</h3>
            <p style={styles.chartPanelDesc}>
              기본값은 가장 최근 실기, 남녀 전체, 실기 총점 평균입니다. 값이 높을수록 상위에 노출되며 비교 기준을 바꿔가며 확인할 수 있습니다.
            </p>
          </div>

          <div style={styles.controlGrid}>
            <label style={styles.controlWrap}>
              <span style={styles.controlLabel}>실기 날짜</span>
              <select style={styles.select} value={effectiveSelectedTestId} onChange={(event) => setSelectedTestId(event.target.value)}>
                {testOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <span style={styles.helperText}>{testOptions.find((option) => option.value === effectiveSelectedTestId)?.helper || ""}</span>
            </label>

            <label style={styles.controlWrap}>
              <span style={styles.controlLabel}>성별</span>
              <select style={styles.select} value={effectiveSelectedGender} onChange={(event) => setSelectedGender(event.target.value as GenderFilter)}>
                {genderOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <span style={styles.helperText}>지점별 평균을 남녀, 남, 여 기준으로 나눠 볼 수 있습니다.</span>
            </label>

            <label style={styles.controlWrap}>
              <span style={styles.controlLabel}>평균 기준</span>
              <select style={styles.select} value={effectiveSelectedMetric} onChange={(event) => setSelectedMetric(event.target.value as PhysicalRankingMetric)}>
                {metricOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <span style={styles.helperText}>{metricMeta.label} 평균으로 지점을 비교합니다.</span>
            </label>
          </div>
        </div>

        {branchStats.length === 0 ? (
          <EmptyState
            title="차트 데이터가 없습니다"
            description="표시할 지점 비교 데이터가 없습니다."
            tone={{
              background: "linear-gradient(180deg, rgba(124, 58, 237, 0.08) 0%, rgba(255, 255, 255, 0.96) 100%)",
              borderColor: branchTone.line,
              accentColor: branchTone.accent,
            }}
          />
        ) : (
          <>
            <div style={styles.chartSurface}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={branchStats} layout="vertical" margin={{ top: 8, right: 28, left: 8, bottom: 8 }} barCategoryGap={18}>
                  <CartesianGrid stroke={portalTheme.colors.lineStrong} strokeDasharray="3 3" horizontal={false} />
                  <XAxis
                    type="number"
                    domain={[0, Math.max(10, Math.ceil(maxDomainValue * 1.15))]}
                    axisLine={{ stroke: portalTheme.colors.lineStrong }}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: portalTheme.colors.textPrimary, fontWeight: 600 }}
                  />
                  <YAxis
                    type="category"
                    dataKey="branchLabel"
                    width={96}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 13, fill: portalTheme.colors.textPrimary, fontWeight: 700 }}
                  />
                  <Tooltip cursor={{ fill: "rgba(225, 29, 72, 0.1)" }} content={<CustomTooltip metric={effectiveSelectedMetric} />} />
                  <Bar dataKey="value" radius={[0, 10, 10, 0]} maxBarSize={24}>
                    {branchStats.map((item, index) => (
                      <Cell key={item.branchId} fill={BRANCH_BAR_COLORS[index % BRANCH_BAR_COLORS.length]} />
                    ))}
                    <LabelList
                      dataKey="value"
                      position="right"
                      formatter={(value: number) => formatMetricValue(effectiveSelectedMetric, value)}
                      style={{ fill: portalTheme.colors.textStrong, fontSize: 12, fontWeight: 800 }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div style={styles.footer}>
              <div style={styles.footerCard}>
                <span style={styles.footerLabel}>총 지점</span>
                <strong style={styles.footerValue}>{branchStats.length}개</strong>
              </div>
              <div style={styles.footerCard}>
                <span style={styles.footerLabel}>반영 인원</span>
                <strong style={styles.footerValue}>{totalIncluded}명</strong>
              </div>
              <div style={styles.footerCard}>
                <span style={styles.footerLabel}>상위 지점</span>
                <strong style={styles.footerValue}>{topBranch ? topBranch.branchLabel : "-"}</strong>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
