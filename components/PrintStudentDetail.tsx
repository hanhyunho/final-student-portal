"use client";

import React, { useEffect } from "react";
import type { MockExam, MockScore, Student, StudentMockChartPoint, StudentPhysicalChartPoint } from "@/lib/dataService";
import { StudentDetailPanel } from "@/components/StudentDetailPanel";
import { portalTheme } from "@/lib/theme";

interface PrintStudentDetailProps {
  student: Student;
  mockScores: MockScore[];
  mockExams: MockExam[];
  mockChartData: StudentMockChartPoint[];
  physicalChartData: StudentPhysicalChartPoint[];
  getAverageNumber: (student: Student) => number;
  getGradeBadgeStyle: (grade: string | number | undefined) => React.CSSProperties;
  getBranchLabel: (branchId: string | undefined) => string;
  s: (value: unknown) => string;
  onReady?: () => void;
}

export function PrintStudentDetail({
  student,
  mockScores,
  mockExams,
  mockChartData,
  physicalChartData,
  getAverageNumber,
  getGradeBadgeStyle,
  getBranchLabel,
  s,
  onReady,
}: PrintStudentDetailProps) {
  useEffect(() => {
    if (!onReady || typeof window === "undefined") {
      return;
    }

    let frameId = 0;
    let remainingFrames = 5;

    const waitForPaint = () => {
      if (remainingFrames <= 0) {
        onReady();
        return;
      }

      remainingFrames -= 1;
      frameId = window.requestAnimationFrame(waitForPaint);
    };

    frameId = window.requestAnimationFrame(waitForPaint);

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [onReady]);

  return (
    <>
      <style>{`
        :root {
          color-scheme: light;
        }

        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        html, body {
          margin: 0;
          padding: 0;
          background: #ffffff;
          color: #0b1220;
          font-family: Arial, sans-serif;
        }

        @page {
          size: A4 portrait;
          margin: 12mm;
        }

        @media print {
          body {
            background: #ffffff !important;
          }

          .print-shell {
            padding: 0 !important;
          }

          .print-header,
          .print-panel,
          .print-note {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>
      <main className="print-shell" style={styles.page}>
        <header className="print-header" style={styles.header}>
          <div style={styles.headerCopy}>
            <p style={styles.eyebrow}>FINAL STUDENT DETAIL PRINT</p>
            <h1 style={styles.title}>{s(student.name)} 학생 상세 출력</h1>
            <p style={styles.subtitle}>
              {s(student.school_name) || "학교 정보 없음"} · {s(student.grade) ? `${s(student.grade)}학년` : "학년 정보 없음"} · {getBranchLabel(s(student.branch_id))}
            </p>
          </div>
          <div style={styles.metaCard}>
            <div style={styles.metaRow}>
              <span style={styles.metaLabel}>학생 ID</span>
              <strong style={styles.metaValue}>{s(student.student_id) || "-"}</strong>
            </div>
            <div style={styles.metaRow}>
              <span style={styles.metaLabel}>평균</span>
              <strong style={styles.metaValue}>{getAverageNumber(student).toFixed(1)}</strong>
            </div>
            <div style={styles.metaRow}>
              <span style={styles.metaLabel}>출력 시각</span>
              <strong style={styles.metaValue}>{new Date().toLocaleString("ko-KR")}</strong>
            </div>
          </div>
        </header>

        <section className="print-panel" style={styles.panel}>
          <StudentDetailPanel
            student={student}
            mockScores={mockScores}
            mockExams={mockExams}
            mockChartData={mockChartData}
            physicalChartData={physicalChartData}
            canManage={false}
            sticky={false}
            showActions={false}
            renderMode="print"
            badgeLabel="학생 상세 전체 출력"
            onEdit={() => {}}
            onDelete={() => {}}
            onShowDetail={() => {}}
            getAverageNumber={getAverageNumber}
            getGradeBadgeStyle={getGradeBadgeStyle}
            getBranchLabel={getBranchLabel}
            s={s}
          />
        </section>

        <div className="print-note" style={styles.note}>
          배경색과 차트 색상은 브라우저의 배경 그래픽 인쇄 설정에 따라 일부 다르게 보일 수 있습니다.
        </div>
      </main>
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    background: "#ffffff",
    padding: "20px 22px 28px",
  },
  header: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) 260px",
    gap: "18px",
    alignItems: "stretch",
    marginBottom: "20px",
  },
  headerCopy: {
    border: `1px solid ${portalTheme.colors.line}`,
    borderRadius: "24px",
    padding: "20px 22px",
    background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
  },
  eyebrow: {
    margin: 0,
    fontSize: "11px",
    fontWeight: 900,
    letterSpacing: "0.16em",
    color: portalTheme.colors.primaryStrong,
  },
  title: {
    margin: "8px 0 10px 0",
    fontSize: "34px",
    lineHeight: 1.08,
    fontWeight: 900,
    color: portalTheme.colors.textStrong,
    letterSpacing: "-0.05em",
  },
  subtitle: {
    margin: 0,
    fontSize: "14px",
    lineHeight: 1.6,
    color: portalTheme.colors.textMuted,
  },
  metaCard: {
    border: `1px solid ${portalTheme.colors.line}`,
    borderRadius: "24px",
    padding: "18px 18px 16px",
    background: "linear-gradient(180deg, #f9fbfd 0%, #ffffff 100%)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    gap: "10px",
  },
  metaRow: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  metaLabel: {
    fontSize: "11px",
    fontWeight: 800,
    letterSpacing: "0.08em",
    color: portalTheme.colors.textMuted,
  },
  metaValue: {
    fontSize: "14px",
    color: portalTheme.colors.textStrong,
  },
  panel: {
    border: `1px solid ${portalTheme.colors.line}`,
    borderRadius: "28px",
    padding: "22px 24px 24px",
    background: "#ffffff",
  },
  note: {
    marginTop: "12px",
    fontSize: "11px",
    lineHeight: 1.6,
    color: portalTheme.colors.textSoft,
    textAlign: "right",
  },
};
