"use client";

import React from "react";
import type { Student, Branch } from "@/lib/dataService";

interface StudentDetailPanelProps {
  student: Student | null;
  branches: Branch[];
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
  branches,
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
      background: "#ffffff",
      padding: "24px",
      borderRadius: "20px",
      boxShadow: "0 10px 24px rgba(15, 23, 42, 0.06)",
      position: "sticky",
      top: "20px",
    },
    stateBox: {
      background: "#f8fafc",
      borderRadius: "14px",
      padding: "24px",
      fontSize: "14px",
      color: "#64748b",
      textAlign: "center",
    },
    selectedBadge: {
      display: "inline-block",
      padding: "7px 12px",
      borderRadius: "999px",
      background: "#dbeafe",
      color: "#1d4ed8",
      fontSize: "12px",
      fontWeight: 700,
      marginBottom: "14px",
    },
    detailName: {
      margin: "0 0 8px 0",
      fontSize: "34px",
      fontWeight: 900,
      color: "#0f172a",
      letterSpacing: "-0.5px",
    },
    detailSub: {
      margin: "0 0 20px 0",
      color: "#64748b",
      fontSize: "14px",
    },
    scoreGrid: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "12px",
      marginBottom: "20px",
    },
    scoreBox: {
      background: "#f8fafc",
      borderRadius: "16px",
      padding: "16px",
      minHeight: "98px",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
    },
    scoreLabel: {
      display: "block",
      fontSize: "12px",
      color: "#64748b",
      marginBottom: "8px",
    },
    scoreValue: {
      fontSize: "26px",
      fontWeight: 900,
      color: "#0f172a",
    },
    gradeBadge: {
      display: "inline-block",
      width: "fit-content",
      padding: "5px 9px",
      borderRadius: "999px",
      fontSize: "12px",
      fontWeight: 700,
      marginTop: "8px",
    },
    infoSection: {
      borderTop: "1px solid #e2e8f0",
      borderBottom: "1px solid #e2e8f0",
      padding: "16px 0",
      marginBottom: "20px",
    },
    infoRow: {
      display: "flex",
      justifyContent: "space-between",
      gap: "12px",
      fontSize: "14px",
      marginBottom: "10px",
      color: "#334155",
    },
    infoTitle: {
      fontWeight: 700,
      color: "#64748b",
    },
    subjectPanel: {
      display: "flex",
      flexDirection: "column",
      gap: "12px",
    },
    subjectTitle: {
      margin: "0 0 4px 0",
      fontSize: "18px",
      fontWeight: 900,
      color: "#0f172a",
    },
    subjectBox: {
      background: "#f8fafc",
      borderRadius: "16px",
      padding: "16px",
    },
    subjectRow: {
      display: "flex",
      justifyContent: "space-between",
      gap: "12px",
      fontSize: "14px",
      color: "#334155",
      marginBottom: "8px",
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
      border: "none",
      background: "#0f766e",
      color: "#ffffff",
      padding: "12px 16px",
      borderRadius: "12px",
      fontSize: "14px",
      fontWeight: 700,
      cursor: "pointer",
    },
    deleteButton: {
      flex: 1,
      minWidth: "100px",
      border: "none",
      background: "#dc2626",
      color: "#ffffff",
      padding: "12px 16px",
      borderRadius: "12px",
      fontSize: "14px",
      fontWeight: 700,
      cursor: "pointer",
    },
    detailButton: {
      flex: 1,
      minWidth: "100px",
      border: "1px solid #cbd5e1",
      background: "#ffffff",
      color: "#334155",
      padding: "12px 16px",
      borderRadius: "12px",
      fontSize: "14px",
      fontWeight: 700,
      cursor: "pointer",
    },
  };

  if (!student) {
    return (
      <div style={styles.detailCard}>
        <div style={styles.stateBox}>학생을 선택하세요.</div>
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
        <h3 style={styles.sectionTitle}>체력 검사</h3>
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
          <div style={styles.subjectRow}>
            <span>총점</span>
            <span>{s(student.physical_total_score) || "-"}</span>
          </div>
          {student.physical_memo && (
            <div style={styles.subjectRow}>
              <span>메모</span>
              <span>{s(student.physical_memo)}</span>
            </div>
          )}
        </div>
      </div>

      <div style={styles.actionButtons}>
        <button style={styles.detailButton} onClick={onShowDetail}>
          상세보기
        </button>
        <button style={styles.editButton} onClick={onEdit}>
          수정
        </button>
        <button style={styles.deleteButton} onClick={onDelete}>
          삭제
        </button>
      </div>
    </div>
  );
}
