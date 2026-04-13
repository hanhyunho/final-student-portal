"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { Branch, MockExam, MockScore, PhysicalRecord, PhysicalTest, Student } from "@/lib/dataService";
import { EmptyState } from "@/components/EmptyState";
import { portalTheme } from "@/lib/theme";
import {
  buildPhysicalRankings,
  buildScoreRankings,
  formatMetricValue,
  getGenderFilterOptions,
  getMockExamOptions,
  getPhysicalMetricOptions,
  getPhysicalTestOptions,
  getScoreMetricOptions,
  type GenderFilter,
  type PhysicalRankingMetric,
  type ScoreRankingMetric,
} from "@/lib/dashboardMetrics";

interface StatsPanelProps {
  branches: Branch[];
  students: Student[];
  mockExams: MockExam[];
  mockScores: MockScore[];
  physicalTests: PhysicalTest[];
  physicalRecords: PhysicalRecord[];
}

export function StatsPanel({
  branches,
  students,
  mockExams,
  mockScores,
  physicalTests,
  physicalRecords,
}: StatsPanelProps) {
  const scoreTone = {
    panel: "linear-gradient(180deg, rgba(37, 99, 235, 0.08) 0%, rgba(255, 255, 255, 0.96) 38%)",
    surface: "rgba(37, 99, 235, 0.06)",
    surfaceStrong: "rgba(37, 99, 235, 0.09)",
    line: "rgba(37, 99, 235, 0.14)",
    index: "rgba(37, 99, 235, 0.12)",
    accent: "#2563eb",
  } as const;

  const physicalTone = {
    panel: "linear-gradient(180deg, rgba(22, 163, 74, 0.08) 0%, rgba(255, 255, 255, 0.96) 38%)",
    surface: "rgba(22, 163, 74, 0.06)",
    surfaceStrong: "rgba(22, 163, 74, 0.09)",
    line: "rgba(22, 163, 74, 0.14)",
    index: "rgba(22, 163, 74, 0.12)",
    accent: "#16a34a",
  } as const;

  const scoreMetricOptions = useMemo(() => getScoreMetricOptions(), []);
  const physicalMetricOptions = useMemo(() => getPhysicalMetricOptions(), []);
  const genderOptions = useMemo(() => getGenderFilterOptions(), []);
  const scoreExamOptions = useMemo(() => getMockExamOptions(mockScores, mockExams), [mockExams, mockScores]);
  const physicalTestOptions = useMemo(() => getPhysicalTestOptions(physicalRecords, physicalTests), [physicalRecords, physicalTests]);
  const [selectedScoreExamId, setSelectedScoreExamId] = useState("");
  const [selectedScoreMetric, setSelectedScoreMetric] = useState<ScoreRankingMetric>("five-subject-total");
  const [selectedPhysicalTestId, setSelectedPhysicalTestId] = useState("");
  const [selectedPhysicalGender, setSelectedPhysicalGender] = useState<GenderFilter>("all");
  const [selectedPhysicalMetric, setSelectedPhysicalMetric] = useState<PhysicalRankingMetric>("total_score");

  const effectiveSelectedScoreExamId =
    scoreExamOptions.some((option) => option.value === selectedScoreExamId) ? selectedScoreExamId : scoreExamOptions[0]?.value || "";

  const effectiveSelectedPhysicalTestId =
    physicalTestOptions.some((option) => option.value === selectedPhysicalTestId) ? selectedPhysicalTestId : physicalTestOptions[0]?.value || "";

  useEffect(() => {
    if (effectiveSelectedScoreExamId && selectedScoreExamId !== effectiveSelectedScoreExamId) {
      setSelectedScoreExamId(effectiveSelectedScoreExamId);
    }
  }, [effectiveSelectedScoreExamId, selectedScoreExamId]);

  useEffect(() => {
    if (effectiveSelectedPhysicalTestId && selectedPhysicalTestId !== effectiveSelectedPhysicalTestId) {
      setSelectedPhysicalTestId(effectiveSelectedPhysicalTestId);
    }
  }, [effectiveSelectedPhysicalTestId, selectedPhysicalTestId]);

  useEffect(() => {
    const defaultScoreMetric = scoreMetricOptions[0]?.value as ScoreRankingMetric | undefined;

    if (defaultScoreMetric && !scoreMetricOptions.some((option) => option.value === selectedScoreMetric)) {
      setSelectedScoreMetric(defaultScoreMetric);
    }
  }, [scoreMetricOptions, selectedScoreMetric]);

  useEffect(() => {
    const defaultGender = genderOptions[0]?.value as GenderFilter | undefined;

    if (defaultGender && !genderOptions.some((option) => option.value === selectedPhysicalGender)) {
      setSelectedPhysicalGender(defaultGender);
    }
  }, [genderOptions, selectedPhysicalGender]);

  useEffect(() => {
    const defaultPhysicalMetric = physicalMetricOptions[0]?.value as PhysicalRankingMetric | undefined;

    if (defaultPhysicalMetric && !physicalMetricOptions.some((option) => option.value === selectedPhysicalMetric)) {
      setSelectedPhysicalMetric(defaultPhysicalMetric);
    }
  }, [physicalMetricOptions, selectedPhysicalMetric]);

  const scoreRankings = useMemo(() => {
    if (!effectiveSelectedScoreExamId) {
      return [];
    }

    return buildScoreRankings({
      branches,
      students,
      mockExams,
      mockScores,
      examId: effectiveSelectedScoreExamId,
      metric: selectedScoreMetric,
    });
  }, [branches, effectiveSelectedScoreExamId, mockExams, mockScores, selectedScoreMetric, students]);

  const physicalRankings = useMemo(() => {
    if (!effectiveSelectedPhysicalTestId) {
      return [];
    }

    return buildPhysicalRankings({
      branches,
      students,
      physicalRecords,
      physicalTests,
      testId: effectiveSelectedPhysicalTestId,
      genderFilter: selectedPhysicalGender,
      metric: selectedPhysicalMetric,
    });
  }, [branches, effectiveSelectedPhysicalTestId, physicalRecords, physicalTests, selectedPhysicalGender, selectedPhysicalMetric, students]);

  const styles: { [key: string]: React.CSSProperties } = {
    statsSection: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
      gap: "18px",
      marginBottom: "22px",
    },
    statsCard: {
      borderRadius: portalTheme.radius.md,
      padding: "clamp(16px, 2.8vw, 24px)",
      boxShadow: portalTheme.shadows.panel,
      border: `1px solid ${portalTheme.colors.line}`,
      display: "flex",
      flexDirection: "column",
      gap: "16px",
    },
    statsTitle: {
      margin: 0,
      fontSize: "clamp(18px, 2.2vw, 21px)",
      fontWeight: 900,
      color: portalTheme.colors.textStrong,
    },
    statsDesc: {
      margin: "6px 0 0 0",
      fontSize: "13px",
      lineHeight: 1.5,
      color: portalTheme.colors.textMuted,
      maxWidth: "58ch",
    },
    controlGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(132px, 1fr))",
      gap: "10px",
    },
    controlWrap: {
      display: "flex",
      flexDirection: "column",
      gap: "6px",
    },
    controlLabel: {
      fontSize: "12px",
      fontWeight: 800,
      color: portalTheme.colors.textMuted,
    },
    select: {
      width: "100%",
      padding: "10px 12px",
      borderRadius: "12px",
      border: `1px solid ${portalTheme.colors.line}`,
      background: portalTheme.colors.surfaceCardAlt,
      color: portalTheme.colors.textStrong,
      fontSize: "13px",
      fontWeight: 700,
      boxShadow: "none",
    },
    helperText: {
      fontSize: "12px",
      color: portalTheme.colors.textSoft,
      minHeight: "16px",
    },
    rankingList: {
      display: "flex",
      flexDirection: "column",
      gap: "8px",
      maxHeight: "320px",
      overflowY: "auto",
      padding: "12px",
      paddingRight: "8px",
      borderRadius: portalTheme.radius.md,
      border: `1px solid ${portalTheme.colors.line}`,
    },
    rankingRow: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: "12px",
      padding: "14px 14px",
      border: `1px solid ${portalTheme.colors.lineSoft}`,
      borderRadius: "14px",
      background: "rgba(255,255,255,0.84)",
    },
    rankingIndex: {
      minWidth: "28px",
      height: "28px",
      borderRadius: portalTheme.radius.pill,
      background: portalTheme.colors.surfacePanelStrong,
      fontSize: "12px",
      fontWeight: 900,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      marginTop: "2px",
      boxShadow: `inset 0 0 0 1px ${portalTheme.colors.line}`,
      color: portalTheme.colors.textStrong,
    },
    rankingBody: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      gap: "3px",
      minWidth: 0,
    },
    rankingName: {
      fontSize: "15px",
      fontWeight: 900,
      color: portalTheme.colors.textStrong,
      letterSpacing: "-0.02em",
    },
    rankingMeta: {
      fontSize: "12px",
      color: portalTheme.colors.textMuted,
      lineHeight: 1.4,
    },
    rankingValue: {
      minWidth: "78px",
      textAlign: "right",
      fontSize: "clamp(18px, 2.6vw, 26px)",
      fontWeight: 900,
      color: portalTheme.colors.textStrong,
      letterSpacing: "-0.03em",
    },
    rankingValueLabel: {
      display: "block",
      marginTop: "3px",
      fontSize: "11px",
      color: portalTheme.colors.textSoft,
      fontWeight: 700,
    },
    scoreSelect: {
      background: scoreTone.surfaceStrong,
      border: `1px solid ${scoreTone.line}`,
    },
    physicalSelect: {
      background: physicalTone.surfaceStrong,
      border: `1px solid ${physicalTone.line}`,
    },
    scoreList: {
      background: scoreTone.surface,
      border: `1px solid ${scoreTone.line}`,
    },
    physicalList: {
      background: physicalTone.surface,
      border: `1px solid ${physicalTone.line}`,
    },
    scoreRow: {
      background: "rgba(255, 255, 255, 0.76)",
      border: `1px solid ${scoreTone.line}`,
    },
    physicalRow: {
      background: "rgba(255, 255, 255, 0.76)",
      border: `1px solid ${physicalTone.line}`,
    },
    scoreIndex: {
      background: scoreTone.index,
      boxShadow: `inset 0 0 0 1px ${scoreTone.line}`,
      color: scoreTone.accent,
    },
    physicalIndex: {
      background: physicalTone.index,
      boxShadow: `inset 0 0 0 1px ${physicalTone.line}`,
      color: physicalTone.accent,
    },
  };

  return (
    <section style={styles.statsSection}>
      <div
        style={{
          ...styles.statsCard,
          background: scoreTone.panel,
          borderLeft: "6px solid #2563eb",
        }}
      >
        <div>
          <h3 style={styles.statsTitle}>성적순위 TOP 5</h3>
          <p style={styles.statsDesc}>기본값은 가장 최근 성적과 국영수탐1탐2 합산입니다. 내부 목록은 스크롤로 더 안정적으로 볼 수 있습니다.</p>
        </div>

        <div style={styles.controlGrid}>
          <label style={styles.controlWrap}>
            <span style={styles.controlLabel}>성적 제목</span>
            <select
              style={{ ...styles.select, ...styles.scoreSelect }}
              value={effectiveSelectedScoreExamId}
              onChange={(event) => setSelectedScoreExamId(event.target.value)}
            >
              {scoreExamOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <span style={styles.helperText}>{scoreExamOptions.find((option) => option.value === effectiveSelectedScoreExamId)?.helper || ""}</span>
          </label>

          <label style={styles.controlWrap}>
            <span style={styles.controlLabel}>합산 기준</span>
            <select
              style={{ ...styles.select, ...styles.scoreSelect }}
              value={selectedScoreMetric}
              onChange={(event) => setSelectedScoreMetric(event.target.value as ScoreRankingMetric)}
            >
              {scoreMetricOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <span style={styles.helperText}>지점 이름, 성적 제목, 합산 점수를 함께 표시합니다.</span>
          </label>
        </div>

        {scoreRankings.length === 0 ? (
          <EmptyState
            title="성적 데이터가 없습니다"
            description="선택한 시험에 표시할 성적 데이터가 없습니다."
            tone={{
              background: "linear-gradient(180deg, rgba(37, 99, 235, 0.08) 0%, rgba(255, 255, 255, 0.96) 100%)",
              borderColor: scoreTone.line,
              accentColor: scoreTone.accent,
            }}
          />
        ) : (
          <div style={{ ...styles.rankingList, ...styles.scoreList }}>
            {scoreRankings.map((item, index) => (
              <div key={`${item.studentId}-${item.metricLabel}`} style={{ ...styles.rankingRow, ...styles.scoreRow }}>
                <span style={{ ...styles.rankingIndex, ...styles.scoreIndex }}>{index + 1}</span>
                <div style={styles.rankingBody}>
                  <span style={styles.rankingName}>{item.studentName}</span>
                  <span style={styles.rankingMeta}>{item.branchLabel}</span>
                  <span style={styles.rankingMeta}>{item.examLabel} · {item.metricLabel}</span>
                </div>
                <div style={styles.rankingValue}>
                  {formatMetricValue(selectedScoreMetric, item.value)}
                  <span style={styles.rankingValueLabel}>합산점수</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div
        style={{
          ...styles.statsCard,
          background: physicalTone.panel,
          borderLeft: "6px solid #16a34a",
        }}
      >
        <div>
          <h3 style={styles.statsTitle}>실기순위 TOP 5</h3>
          <p style={styles.statsDesc}>기본값은 가장 최근 실기와 남녀 전체 실기 총점입니다. 기록 종목은 요청한 방향대로 오름차순 또는 내림차순으로 정렬됩니다.</p>
        </div>

        <div style={styles.controlGrid}>
          <label style={styles.controlWrap}>
            <span style={styles.controlLabel}>실기 날짜</span>
            <select
              style={{ ...styles.select, ...styles.physicalSelect }}
              value={effectiveSelectedPhysicalTestId}
              onChange={(event) => setSelectedPhysicalTestId(event.target.value)}
            >
              {physicalTestOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <span style={styles.helperText}>{physicalTestOptions.find((option) => option.value === effectiveSelectedPhysicalTestId)?.helper || ""}</span>
          </label>

          <label style={styles.controlWrap}>
            <span style={styles.controlLabel}>성별</span>
            <select
              style={{ ...styles.select, ...styles.physicalSelect }}
              value={selectedPhysicalGender}
              onChange={(event) => setSelectedPhysicalGender(event.target.value as GenderFilter)}
            >
              {genderOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <span style={styles.helperText}>남녀 전체, 남, 여 기준을 선택할 수 있습니다.</span>
          </label>

          <label style={styles.controlWrap}>
            <span style={styles.controlLabel}>정렬 기준</span>
            <select
              style={{ ...styles.select, ...styles.physicalSelect }}
              value={selectedPhysicalMetric}
              onChange={(event) => setSelectedPhysicalMetric(event.target.value as PhysicalRankingMetric)}
            >
              {physicalMetricOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <span style={styles.helperText}>지점 이름, 성별, 선택한 실기 기준을 함께 표시합니다.</span>
          </label>
        </div>

        {physicalRankings.length === 0 ? (
          <EmptyState
            title="실기 데이터가 없습니다"
            description="선택한 조건에 표시할 실기 기록이 없습니다."
            tone={{
              background: "linear-gradient(180deg, rgba(22, 163, 74, 0.08) 0%, rgba(255, 255, 255, 0.96) 100%)",
              borderColor: physicalTone.line,
              accentColor: physicalTone.accent,
            }}
          />
        ) : (
          <div style={{ ...styles.rankingList, ...styles.physicalList }}>
            {physicalRankings.map((item, index) => (
              <div key={`${item.studentId}-${item.metricLabel}`} style={{ ...styles.rankingRow, ...styles.physicalRow }}>
                <span style={{ ...styles.rankingIndex, ...styles.physicalIndex }}>{index + 1}</span>
                <div style={styles.rankingBody}>
                  <span style={styles.rankingName}>{item.studentName}</span>
                  <span style={styles.rankingMeta}>{item.branchLabel}</span>
                  <span style={styles.rankingMeta}>{item.genderLabel} · {item.testLabel} · {item.metricLabel}</span>
                </div>
                <div style={styles.rankingValue}>
                  {formatMetricValue(selectedPhysicalMetric, item.value)}
                  <span style={styles.rankingValueLabel}>{item.metricLabel}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
