"use client";

import React from "react";
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
import type { Student } from "@/lib/dataService";
import { EmptyState } from "@/components/EmptyState";
import { portalTheme } from "@/lib/theme";

interface StudentChartSectionProps {
  selectedStudent: Student | null;
  getScoreNumber: (value: string | number | undefined) => number;
  getBarWidth: (value: string | number | undefined) => string;
  s: (value: unknown) => string;
}

type ChartDatum = {
  label: string;
  value: number;
  displayValue: string;
  fill: string;
};

function ChartTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload?: ChartDatum }> }) {
  if (!active || !payload?.length || !payload[0]?.payload) {
    return null;
  }

  const item = payload[0].payload;

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.98)",
        border: `1px solid ${portalTheme.colors.lineStrong}`,
        borderRadius: "14px",
        boxShadow: portalTheme.shadows.cardStrong,
        padding: "12px 14px",
      }}
    >
      <div style={{ fontSize: "13px", fontWeight: 800, color: portalTheme.colors.textStrong, marginBottom: "4px" }}>{item.label}</div>
      <div style={{ fontSize: "13px", color: portalTheme.colors.textMuted }}>값 {item.displayValue}</div>
    </div>
  );
}

function HorizontalBarCard({
  title,
  description,
  data,
  emptyTitle,
  emptyDescription,
  maxDomain,
}: {
  title: string;
  description: string;
  data: ChartDatum[];
  emptyTitle: string;
  emptyDescription: string;
  maxDomain?: number;
}) {
  const hasData = data.some((item) => item.value > 0);

  return (
    <div
      style={{
        background: portalTheme.gradients.card,
        border: `1px solid ${portalTheme.colors.line}`,
        borderRadius: portalTheme.radius.md,
        padding: "clamp(16px, 2.8vw, 18px)",
        boxShadow: portalTheme.shadows.panel,
      }}
    >
      <div style={{ marginBottom: "14px" }}>
        <h4 style={{ margin: 0, fontSize: "18px", fontWeight: 900, color: portalTheme.colors.textStrong }}>{title}</h4>
        <p style={{ margin: "6px 0 0 0", color: portalTheme.colors.textMuted, fontSize: "13px", lineHeight: 1.5 }}>{description}</p>
      </div>

      {hasData ? (
        <div
          style={{
            width: "100%",
            height: "280px",
            borderRadius: portalTheme.radius.md,
            border: `1px solid ${portalTheme.colors.line}`,
            background: portalTheme.colors.surfacePanel,
            padding: "10px",
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 8, right: 24, left: 6, bottom: 8 }} barCategoryGap={16}>
              <CartesianGrid stroke={portalTheme.colors.lineStrong} strokeDasharray="3 3" horizontal={false} />
              <XAxis
                type="number"
                domain={[0, maxDomain || "dataMax + 10"]}
                axisLine={{ stroke: portalTheme.colors.lineStrong }}
                tickLine={false}
                tick={{ fontSize: 12, fill: portalTheme.colors.textPrimary }}
              />
              <YAxis
                type="category"
                dataKey="label"
                width={72}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 13, fill: portalTheme.colors.textPrimary, fontWeight: 700 }}
              />
              <Tooltip cursor={{ fill: "rgba(225, 29, 72, 0.1)" }} content={<ChartTooltip />} />
              <Bar dataKey="value" radius={[0, 10, 10, 0]} maxBarSize={22}>
                {data.map((item) => (
                  <Cell key={item.label} fill={item.fill} />
                ))}
                <LabelList dataKey="displayValue" position="right" style={{ fill: portalTheme.colors.textStrong, fontSize: 12, fontWeight: 800 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      )}
    </div>
  );
}

export function StudentChartSection({
  selectedStudent,
  getScoreNumber,
  getBarWidth,
  s,
}: StudentChartSectionProps) {
  void getBarWidth;

  const styles: Record<string, React.CSSProperties> = {
    chartSection: {
      background: portalTheme.gradients.card,
      borderRadius: portalTheme.radius.md,
      padding: "clamp(16px, 3vw, 22px)",
      boxShadow: portalTheme.shadows.panel,
      marginBottom: "16px",
      border: `1px solid ${portalTheme.colors.line}`,
    },
    chartHeader: {
      marginBottom: "18px",
    },
    chartTitle: {
      margin: "0 0 6px 0",
      fontSize: "22px",
      fontWeight: 900,
      color: portalTheme.colors.textStrong,
      letterSpacing: "-0.02em",
    },
    chartDesc: {
      margin: 0,
      color: portalTheme.colors.textMuted,
      fontSize: "14px",
      lineHeight: 1.5,
    },
    grid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
      gap: "16px",
    },
  };

  if (!selectedStudent) {
    return null;
  }

  const rawData: ChartDatum[] = [
    { label: "국어", value: getScoreNumber(selectedStudent.korean_raw), displayValue: s(selectedStudent.korean_raw) || "-", fill: portalTheme.chart[0] },
    { label: "수학", value: getScoreNumber(selectedStudent.math_raw), displayValue: s(selectedStudent.math_raw) || "-", fill: portalTheme.chart[1] },
    { label: "영어", value: getScoreNumber(selectedStudent.english_raw), displayValue: s(selectedStudent.english_raw) || "-", fill: portalTheme.chart[3] },
    { label: "탐구1", value: getScoreNumber(selectedStudent.inquiry1_raw), displayValue: s(selectedStudent.inquiry1_raw) || "-", fill: portalTheme.chart[2] },
    { label: "탐구2", value: getScoreNumber(selectedStudent.inquiry2_raw), displayValue: s(selectedStudent.inquiry2_raw) || "-", fill: portalTheme.chart[4] },
  ];

  const stdData: ChartDatum[] = [
    { label: "국어", value: getScoreNumber(selectedStudent.korean_std), displayValue: s(selectedStudent.korean_std) || "-", fill: portalTheme.chart[0] },
    { label: "수학", value: getScoreNumber(selectedStudent.math_std), displayValue: s(selectedStudent.math_std) || "-", fill: portalTheme.chart[1] },
    { label: "탐구1", value: getScoreNumber(selectedStudent.inquiry1_std), displayValue: s(selectedStudent.inquiry1_std) || "-", fill: portalTheme.chart[2] },
    { label: "탐구2", value: getScoreNumber(selectedStudent.inquiry2_std), displayValue: s(selectedStudent.inquiry2_std) || "-", fill: portalTheme.chart[3] },
  ];

  const pctData: ChartDatum[] = [
    { label: "국어", value: getScoreNumber(selectedStudent.korean_pct), displayValue: s(selectedStudent.korean_pct) || "-", fill: portalTheme.chart[0] },
    { label: "수학", value: getScoreNumber(selectedStudent.math_pct), displayValue: s(selectedStudent.math_pct) || "-", fill: portalTheme.chart[1] },
    { label: "탐구1", value: getScoreNumber(selectedStudent.inquiry1_pct), displayValue: s(selectedStudent.inquiry1_pct) || "-", fill: portalTheme.chart[2] },
    { label: "탐구2", value: getScoreNumber(selectedStudent.inquiry2_pct), displayValue: s(selectedStudent.inquiry2_pct) || "-", fill: portalTheme.chart[3] },
  ];

  return (
    <section style={styles.chartSection}>
      <div style={styles.chartHeader}>
        <div>
          <h3 style={styles.chartTitle}>모의고사 요약</h3>
          <p style={styles.chartDesc}>{s(selectedStudent.name)} 학생의 과목별 성적만 남겨 간결하게 정리했습니다.</p>
        </div>
      </div>

      <div style={styles.grid}>
        <HorizontalBarCard
          title="원점수"
          description="과목별 현재 원점수를 같은 축에서 비교합니다."
          data={rawData}
          emptyTitle="원점수 데이터가 없습니다"
          emptyDescription="표시할 원점수 데이터가 없습니다."
          maxDomain={100}
        />
        <HorizontalBarCard
          title="표준점수"
          description="표준점수 입력이 있는 과목만 깔끔한 막대형으로 표시합니다."
          data={stdData}
          emptyTitle="표준점수 데이터가 없습니다"
          emptyDescription="표시할 표준점수 데이터가 없습니다."
        />
        <HorizontalBarCard
          title="백분위"
          description="과목별 백분위를 0~100 범위에서 빠르게 비교할 수 있습니다."
          data={pctData}
          emptyTitle="백분위 데이터가 없습니다"
          emptyDescription="표시할 백분위 데이터가 없습니다."
          maxDomain={100}
        />
      </div>
    </section>
  );
}
