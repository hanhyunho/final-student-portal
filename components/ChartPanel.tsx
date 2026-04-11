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
import type { Student, Branch } from "@/lib/dataService";
import { EmptyState } from "@/components/EmptyState";
import { portalTheme } from "@/lib/theme";

interface ChartPanelProps {
  branches: Branch[];
  students: Student[];
  getAverageNumber: (student: Student) => number;
  s: (value: unknown) => string;
}

const BRANCH_BAR_COLORS = portalTheme.chart;

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload?: { branch_name?: string; avg?: number; count?: number } }> }) {
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
      <div style={{ fontSize: "13px", fontWeight: 800, color: portalTheme.colors.textStrong, marginBottom: "6px" }}>{item.branch_name}</div>
      <div style={{ fontSize: "13px", color: portalTheme.colors.textMuted }}>평균 점수 {Number(item.avg || 0).toFixed(1)}</div>
      <div style={{ fontSize: "13px", color: portalTheme.colors.textMuted }}>학생 수 {item.count || 0}명</div>
    </div>
  );
}

export function ChartPanel({
  branches,
  students,
  getAverageNumber,
  s,
}: ChartPanelProps) {
  const styles: Record<string, React.CSSProperties> = {
    chartGrid: {
      marginBottom: "20px",
    },
    chartPanel: {
      background: portalTheme.gradients.card,
      borderRadius: portalTheme.radius.md,
      padding: "22px",
      boxShadow: portalTheme.shadows.card,
      border: `1px solid ${portalTheme.colors.line}`,
      borderLeft: `4px solid ${portalTheme.colors.primary}`,
    },
    header: {
      display: "flex",
      flexWrap: "wrap",
      gap: "12px",
      marginBottom: "16px",
    },
    chartPanelTitle: {
      margin: 0,
      fontSize: "21px",
      fontWeight: 900,
      color: portalTheme.colors.textStrong,
      letterSpacing: "-0.02em",
    },
    chartPanelDesc: {
      margin: "6px 0 0 0",
      fontSize: "14px",
      color: portalTheme.colors.textMuted,
      lineHeight: 1.5,
    },
    chartSurface: {
      width: "100%",
      height: "360px",
      borderRadius: portalTheme.radius.md,
      border: `1px solid ${portalTheme.colors.lineStrong}`,
      background: portalTheme.gradients.cardTint,
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
      background: portalTheme.colors.surfaceCard,
      borderRadius: portalTheme.radius.md,
      border: `1px solid ${portalTheme.colors.line}`,
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

  const branchStats = branches
    .map((branch) => {
      const studentsInBranch = students.filter((st) => s(st.branch_id) === s(branch.branch_id));
      const count = studentsInBranch.length;
      const avg =
        count === 0
          ? 0
          : studentsInBranch.reduce((acc, cur) => acc + getAverageNumber(cur), 0) / count;

      return {
        branch_id: s(branch.branch_id),
        branch_name: s(branch.branch_name) || s(branch.branch_id),
        count,
        avg: Number(avg.toFixed(1)),
      };
    })
    .sort((left, right) => right.avg - left.avg);

  const totalStudents = branchStats.reduce((sum, item) => sum + item.count, 0);
  const topBranch = branchStats[0];

  return (
    <section style={styles.chartGrid}>
      <div style={styles.chartPanel}>
        <div style={styles.header}>
          <div>
            <h3 style={styles.chartPanelTitle}>지점별 평균 비교</h3>
            <p style={styles.chartPanelDesc}>지점별 평균 점수를 같은 기준선 위에 정리한 막대형 차트입니다.</p>
          </div>
        </div>

        {branchStats.length === 0 ? (
          <EmptyState title="차트 데이터가 없습니다" description="표시할 지점 통계가 없습니다." />
        ) : (
          <>
            <div style={styles.chartSurface}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={branchStats} layout="vertical" margin={{ top: 8, right: 28, left: 8, bottom: 8 }} barCategoryGap={18}>
                  <CartesianGrid stroke={portalTheme.colors.lineStrong} strokeDasharray="3 3" horizontal={false} />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    axisLine={{ stroke: portalTheme.colors.lineStrong }}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: portalTheme.colors.textPrimary, fontWeight: 600 }}
                  />
                  <YAxis
                    type="category"
                    dataKey="branch_name"
                    width={88}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 13, fill: portalTheme.colors.textPrimary, fontWeight: 700 }}
                  />
                  <Tooltip cursor={{ fill: "rgba(225, 29, 72, 0.1)" }} content={<CustomTooltip />} />
                  <Bar dataKey="avg" radius={[0, 10, 10, 0]} maxBarSize={24}>
                    {branchStats.map((item, index) => (
                      <Cell key={item.branch_id} fill={BRANCH_BAR_COLORS[index % BRANCH_BAR_COLORS.length]} />
                    ))}
                    <LabelList dataKey="avg" position="right" formatter={(value: number) => value.toFixed(1)} style={{ fill: portalTheme.colors.textStrong, fontSize: 12, fontWeight: 800 }} />
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
                <span style={styles.footerLabel}>학생 수</span>
                <strong style={styles.footerValue}>{totalStudents}명</strong>
              </div>
              <div style={styles.footerCard}>
                <span style={styles.footerLabel}>최상위 지점</span>
                <strong style={styles.footerValue}>{topBranch ? topBranch.branch_name : "-"}</strong>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
