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
  onEdit,
  onDelete,
  onShowDetail,
  getAverageNumber,
  getGradeBadgeStyle,
  getBranchLabel,
  s,
}: StudentDetailPanelProps) {
  const styles: { [key: string]: React.CSSProperties } = {
    detailCard: {
      background: portalTheme.gradients.card,
      padding: "24px",
      borderRadius: portalTheme.radius.md,
      boxShadow: portalTheme.shadows.card,
      border: `1px solid ${portalTheme.colors.line}`,
      borderLeft: `4px solid ${portalTheme.colors.primary}`,
      position: sticky ? "sticky" : "relative",
      top: sticky ? "20px" : undefined,
    },
    selectedBadge: {
      display: "inline-block",
      padding: "7px 12px",
      borderRadius: portalTheme.radius.pill,
      background: portalTheme.colors.primarySoft,
      color: portalTheme.colors.primary,
      fontSize: "12px",
      fontWeight: 700,
      marginBottom: "14px",
    },
    detailName: {
      margin: "0 0 8px 0",
      fontSize: "34px",
      fontWeight: 900,
      color: portalTheme.colors.textStrong,
      letterSpacing: "-0.5px",
    },
    detailSub: {
      margin: "0 0 20px 0",
      color: portalTheme.colors.textMuted,
      fontSize: "14px",
    },
    scoreGrid: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "12px",
      marginBottom: "20px",
    },
    scoreBox: {
      background: portalTheme.colors.surfacePanel,
      borderRadius: portalTheme.radius.md,
      padding: "16px",
      border: `1px solid ${portalTheme.colors.line}`,
      minHeight: "98px",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      boxShadow: portalTheme.shadows.soft,
    },
    scoreLabel: {
      display: "block",
      fontSize: "12px",
      color: portalTheme.colors.textMuted,
      marginBottom: "8px",
    },
    scoreValue: {
      fontSize: "26px",
      fontWeight: 900,
      color: portalTheme.colors.textStrong,
    },
    gradeBadge: {
      display: "inline-block",
      width: "fit-content",
      padding: "5px 9px",
      borderRadius: portalTheme.radius.pill,
      fontSize: "12px",
      fontWeight: 700,
      marginTop: "8px",
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
    },
    infoTitle: {
      fontWeight: 700,
      color: portalTheme.colors.textMuted,
    },
    subjectPanel: {
      display: "flex",
      flexDirection: "column",
      gap: "12px",
      marginTop: "20px",
    },
    subjectTitle: {
      margin: "0 0 4px 0",
      fontSize: "18px",
      fontWeight: 900,
      color: portalTheme.colors.textStrong,
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
      marginTop: "20px",
    },
    sectionTitle: {
      margin: "0 0 12px 0",
      fontSize: "18px",
      fontWeight: 900,
      color: portalTheme.colors.textStrong,
    },
    chartCard: {
      background: portalTheme.gradients.cardTint,
      borderRadius: portalTheme.radius.md,
      padding: "16px",
      border: `1px solid ${portalTheme.colors.lineStrong}`,
      boxShadow: portalTheme.shadows.soft,
    },
    chartWrap: {
      width: "100%",
      height: "320px",
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
      padding: "12px 16px",
      fontSize: "14px",
      fontWeight: 700,
      cursor: "pointer",
    },
    deleteButton: {
      flex: 1,
      minWidth: "100px",
      ...portalButtonStyles.warning,
      padding: "12px 16px",
      fontSize: "14px",
      fontWeight: 700,
      cursor: "pointer",
    },
    detailButton: {
      flex: 1,
      minWidth: "100px",
      ...portalButtonStyles.secondary,
      padding: "12px 16px",
      fontSize: "14px",
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
      <p style={styles.selectedBadge}>선택된 학생</p>
      <h2 style={styles.detailName}>{s(student.name)}</h2>
      <p style={styles.detailSub}>
        {s(student.school_name)} · {s(student.grade)}학년 · {s(student.class_name) || "-"}반 ·{" "}
        {getBranchLabel(s(student.branch_id))}
      </p>

      <div style={styles.scoreGrid}>
        <div style={styles.scoreBox}>
          <span style={styles.scoreLabel}>국어</span>
          <strong style={styles.scoreValue}>{s(student.korean_raw) || "-"}</strong>
          <span style={{ ...styles.gradeBadge, ...getGradeBadgeStyle(student.korean_grade) }}>
            {s(student.korean_grade) || "-"}등급
          </span>
        </div>
        <div style={styles.scoreBox}>
          <span style={styles.scoreLabel}>수학</span>
          <strong style={styles.scoreValue}>{s(student.math_raw) || "-"}</strong>
          <span style={{ ...styles.gradeBadge, ...getGradeBadgeStyle(student.math_grade) }}>
            {s(student.math_grade) || "-"}등급
          </span>
        </div>
        <div style={styles.scoreBox}>
          <span style={styles.scoreLabel}>영어</span>
          <strong style={styles.scoreValue}>{s(student.english_raw) || "-"}</strong>
          <span style={{ ...styles.gradeBadge, ...getGradeBadgeStyle(student.english_grade) }}>
            {s(student.english_grade) || "-"}등급
          </span>
        </div>
        <div style={styles.scoreBox}>
          <span style={styles.scoreLabel}>평균</span>
          <strong style={styles.scoreValue}>{getAverageNumber(student).toFixed(1)}</strong>
        </div>
      </div>

      <div style={styles.infoSection}>
        <div style={styles.infoRow}>
          <span style={styles.infoTitle}>학생 ID</span>
          <span>{s(student.student_id)}</span>
        </div>
        <div style={styles.infoRow}>
          <span style={styles.infoTitle}>학번</span>
          <span>{s(student.student_no) || "-"}</span>
        </div>
        <div style={styles.infoRow}>
          <span style={styles.infoTitle}>성별</span>
          <span>{s(student.gender) || "-"}</span>
        </div>
        <div style={styles.infoRow}>
          <span style={styles.infoTitle}>생년월일</span>
          <span>{s(student.birth_date) || "-"}</span>
        </div>
        <div style={styles.infoRow}>
          <span style={styles.infoTitle}>지점</span>
          <span>{getBranchLabel(s(student.branch_id))}</span>
        </div>
        <div style={styles.infoRow}>
          <span style={styles.infoTitle}>연락처</span>
          <span>{s(student.phone) || "-"}</span>
        </div>
        <div style={styles.infoRow}>
          <span style={styles.infoTitle}>학부모연락처</span>
          <span>{s(student.parent_phone) || "-"}</span>
        </div>
        <div style={styles.infoRow}>
          <span style={styles.infoTitle}>입학연도</span>
          <span>{s(student.admission_year) || "-"}</span>
        </div>
        <div style={styles.infoRow}>
          <span style={styles.infoTitle}>상태</span>
          <span>{s(student.status) || "-"}</span>
        </div>
        <div style={styles.infoRow}>
          <span style={styles.infoTitle}>시험 유형</span>
          <span>{s(student.exam_id) || "-"}</span>
        </div>
        <div style={styles.infoRow}>
          <span style={styles.infoTitle}>등록일시</span>
          <span>{s(student.created_at) || "-"}</span>
        </div>
      </div>

      <div style={styles.subjectPanel}>
        <h4 style={styles.subjectTitle}>기본 메모</h4>
        <div style={styles.subjectBox}>
          <div style={styles.subjectRow}>
            <span>메모</span>
            <span>{s(student.memo) || "-"}</span>
          </div>
        </div>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>모의고사 추이</h3>
        {mockChartData.length === 0 ? (
          <EmptyState title="모의고사 데이터가 없습니다" description="저장된 모의고사 기록이 없습니다." />
        ) : (
          <div style={styles.chartCard}>
            <div style={styles.chartWrap}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mockChartData} margin={{ top: 8, right: 12, left: 0, bottom: 12 }} barGap={6} barCategoryGap={20}>
                  <CartesianGrid stroke={portalTheme.colors.lineStrong} strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: portalTheme.colors.textPrimary, fontWeight: 700 }} interval={0} angle={0} textAnchor="middle" height={40} tickLine={false} axisLine={{ stroke: portalTheme.colors.lineStrong }} />
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
        {physicalChartData.length === 0 ? (
          <EmptyState title="실기 데이터가 없습니다" description="저장된 실기 기록이 없습니다." />
        ) : (
          <div style={styles.chartCard}>
            <div style={styles.chartWrap}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={physicalChartData} margin={{ top: 8, right: 12, left: 0, bottom: 12 }} barGap={4} barCategoryGap={16}>
                  <CartesianGrid stroke={portalTheme.colors.lineStrong} strokeDasharray="3 3" />
                  <XAxis dataKey="short_label" tick={{ fontSize: 11, fill: portalTheme.colors.textPrimary, fontWeight: 700 }} interval={0} angle={0} textAnchor="middle" height={40} tickLine={false} axisLine={{ stroke: portalTheme.colors.lineStrong }} />
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
          </div>
        )}
      </div>

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
    </div>
  );
}

const legendStyle = {
  fontSize: 12,
  color: portalTheme.colors.textPrimary,
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
