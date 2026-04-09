"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import type { Student, Branch } from "@/lib/dataService";

interface StudentModalProps {
  isOpen: boolean;
  mode: "add" | "edit";
  student: Student | null;
  branches: Branch[];
  saving: boolean;
  onClose: () => void;
  onSave: (student: Student) => Promise<void>;
  onSaveExamScores?: (examId: string, scores: Partial<Student>) => Promise<void>;
}

const emptyForm: Student = {
  student_id: "",
  student_no: "",
  name: "",
  gender: "",
  birth_date: "",
  school_name: "",
  grade: "",
  class_name: "",
  phone: "",
  parent_phone: "",
  branch_id: "",
  admission_year: "",
  status: "active",
  memo: "",
  exam_id: "",
  korean_name: "",
  korean_raw: "",
  korean_std: "",
  korean_pct: "",
  korean_grade: "",
  math_name: "",
  math_raw: "",
  math_std: "",
  math_pct: "",
  math_grade: "",
  english_raw: "",
  english_grade: "",
  inquiry1_name: "",
  inquiry1_raw: "",
  inquiry1_std: "",
  inquiry1_pct: "",
  inquiry1_grade: "",
  inquiry2_name: "",
  inquiry2_raw: "",
  inquiry2_std: "",
  inquiry2_pct: "",
  inquiry2_grade: "",
  history_raw: "",
  history_grade: "",
  back_strength: "",
  run_10m: "",
  medicine_ball: "",
  sit_reach: "",
  standing_jump: "",
  run_20m: "",
  physical_total_score: "",
  physical_memo: "",
};

function s(value: unknown) {
  return String(value ?? "");
}

// Exam field keys for score management - moved outside to avoid recreation
const examFieldKeys = [
  "korean_name","korean_raw","korean_std","korean_pct","korean_grade",
  "math_name","math_raw","math_std","math_pct","math_grade",
  "english_raw","english_grade",
  "inquiry1_name","inquiry1_raw","inquiry1_std","inquiry1_pct","inquiry1_grade",
  "inquiry2_name","inquiry2_raw","inquiry2_std","inquiry2_pct","inquiry2_grade",
  "history_raw","history_grade"
];

export function StudentModal({
  isOpen,
  mode,
  student,
  branches,
  saving,
  onClose,
  onSave,
  onSaveExamScores,
}: StudentModalProps) {
  const [form, setForm] = useState<Student>(emptyForm);
  const [examScores, setExamScores] = useState<Record<string, Partial<Student>>>({});
  const [currentExamId, setCurrentExamId] = useState<string>("");
  const [hasUnsavedExamChanges, setHasUnsavedExamChanges] = useState(false);
  const [savingExam, setSavingExam] = useState(false);

  const getExamScoreFields = (examId: string) => {
    return examScores[examId] || {};
  };

  const setExamScoreFields = (
    examId: string,
    updates: Partial<typeof form>
  ) => {
    setExamScores((prev) => ({
      ...prev,
      [examId]: {
        ...(prev[examId] || {}),
        ...updates,
      },
    }));
  };

  // Helper to load exam scores when switching exams
  const loadExamScores = useCallback((examId: string) => {
    const scores = getExamScoreFields(examId);
    setForm(prev => ({
      ...prev,
      exam_id: examId,
      korean_name: s(scores.korean_name),
      korean_raw: s(scores.korean_raw),
      korean_std: s(scores.korean_std),
      korean_pct: s(scores.korean_pct),
      korean_grade: s(scores.korean_grade),
      math_name: s(scores.math_name),
      math_raw: s(scores.math_raw),
      math_std: s(scores.math_std),
      math_pct: s(scores.math_pct),
      math_grade: s(scores.math_grade),
      english_raw: s(scores.english_raw),
      english_grade: s(scores.english_grade),
      inquiry1_name: s(scores.inquiry1_name),
      inquiry1_raw: s(scores.inquiry1_raw),
      inquiry1_std: s(scores.inquiry1_std),
      inquiry1_pct: s(scores.inquiry1_pct),
      inquiry1_grade: s(scores.inquiry1_grade),
      inquiry2_name: s(scores.inquiry2_name),
      inquiry2_raw: s(scores.inquiry2_raw),
      inquiry2_std: s(scores.inquiry2_std),
      inquiry2_pct: s(scores.inquiry2_pct),
      inquiry2_grade: s(scores.inquiry2_grade),
      history_raw: s(scores.history_raw),
      history_grade: s(scores.history_grade),
    }));
  }, [examScores]);

  // Handle exam change with warning for unsaved changes
  const handleExamChange = useCallback((newExamId: string) => {
    if (newExamId === currentExamId) return;

    if (hasUnsavedExamChanges && currentExamId) {
      const confirmed = window.confirm(
        "현재 시험 성적이 저장되지 않았습니다. 저장하지 않고 다른 시험으로 이동하시겠습니까?"
      );
      if (!confirmed) return;
    }

    // Save current visible exam fields into examScores before switching
    if (currentExamId) {
      const currentExamFields: Partial<Student> = {};
      examFieldKeys.forEach(key => {
        (currentExamFields as any)[key] = form[key as keyof Student];
      });
      setExamScores(prev => ({
        ...prev,
        [currentExamId]: {
          ...(prev[currentExamId] || {}),
          ...currentExamFields
        }
      }));
    }

    setCurrentExamId(newExamId);
    setHasUnsavedExamChanges(false);
    loadExamScores(newExamId);
  }, [currentExamId, hasUnsavedExamChanges, form, examScores, loadExamScores]);

  // Handle field changes for exam score fields
  const handleExamFieldChange = useCallback((field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (currentExamId) {
      setExamScores(prev => ({
        ...prev,
        [currentExamId]: {
          ...(prev[currentExamId] || {}),
          [field]: value
        }
      }));
      setHasUnsavedExamChanges(true);
    }
  }, [currentExamId]);;

  // Exam labels for UI display
  const examLabels: Record<string, string> = {
    "3mo": "3모",
    "6mo": "6모",
    "9mo": "9모",
    "suneung": "수능",
  };

  // Helper to check if an exam has any entered data
  const hasExamData = (examId: string): boolean => {
    if (!examScores[examId]) return false;
    const scores = examScores[examId];
    return examFieldKeys.some(key => scores[key as keyof Student]);
  };

  // Helper to get exam status display
  const getExamStatus = (examId: string): string => {
    if (examId === currentExamId && hasUnsavedExamChanges) return "수정중";
    return hasExamData(examId) ? "입력됨" : "비어있음";
  };

  // Helper to get data for the currently selected exam
  const getSelectedExamData = (): Partial<Student> => {
    return examScores[currentExamId] || {};
  };

  // Helper to get exam summary for display
  const getExamSummary = (examId: string): string => {
    const scores = examScores[examId];
    if (!scores) return "-";

    const parts: string[] = [];
    if (scores.korean_grade) parts.push(`국 ${scores.korean_grade}`);
    if (scores.math_grade) parts.push(`수 ${scores.math_grade}`);
    if (scores.english_grade) parts.push(`영 ${scores.english_grade}`);

    return parts.length > 0 ? parts.join(" ") : "-";
  };

  const [openSections, setOpenSections] = useState({
    basic: true,
    korean: true,
    math: false,
    english: false,
    inquiry1: false,
    inquiry2: false,
    history: false,
    physical: false,
  });

  useEffect(() => {
    if (!isOpen) return;

    if (mode === "add") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpenSections(prev => ({
        ...prev,
        basic: true,
        korean: true,
        math: false,
        english: false,
        inquiry1: false,
        inquiry2: false,
        history: false,
        physical: false,
      }));
      setForm(emptyForm);
      setExamScores({});
      setCurrentExamId("");
      setHasUnsavedExamChanges(false);
    } else if (student) {
      setOpenSections({
        basic: true,
        korean: true,
        math: true,
        english: true,
        inquiry1: true,
        inquiry2: true,
        history: true,
        physical: false,
      });
      setForm({
        student_id: s(student.student_id),
        student_no: s(student.student_no),
        name: s(student.name),
        gender: s(student.gender),
        birth_date: s(student.birth_date),
        school_name: s(student.school_name),
        grade: s(student.grade),
        class_name: s(student.class_name),
        phone: s(student.phone),
        parent_phone: s(student.parent_phone),
        branch_id: s(student.branch_id),
        admission_year: s(student.admission_year),
        status: s(student.status) || "active",
        memo: s(student.memo),
        exam_id: s(student.exam_id),
        korean_name: s(student.korean_name),
        korean_raw: s(student.korean_raw),
        korean_std: s(student.korean_std),
        korean_pct: s(student.korean_pct),
        korean_grade: s(student.korean_grade),
        math_name: s(student.math_name),
        math_raw: s(student.math_raw),
        math_std: s(student.math_std),
        math_pct: s(student.math_pct),
        math_grade: s(student.math_grade),
        english_raw: s(student.english_raw),
        english_grade: s(student.english_grade),
        inquiry1_name: s(student.inquiry1_name),
        inquiry1_raw: s(student.inquiry1_raw),
        inquiry1_std: s(student.inquiry1_std),
        inquiry1_pct: s(student.inquiry1_pct),
        inquiry1_grade: s(student.inquiry1_grade),
        inquiry2_name: s(student.inquiry2_name),
        inquiry2_raw: s(student.inquiry2_raw),
        inquiry2_std: s(student.inquiry2_std),
        inquiry2_pct: s(student.inquiry2_pct),
        inquiry2_grade: s(student.inquiry2_grade),
        history_raw: s(student.history_raw),
        history_grade: s(student.history_grade),
        back_strength: s(student.back_strength),
        run_10m: s(student.run_10m),
        medicine_ball: s(student.medicine_ball),
        sit_reach: s(student.sit_reach),
        standing_jump: s(student.standing_jump),
        run_20m: s(student.run_20m),
        physical_total_score: s(student.physical_total_score),
        physical_memo: s(student.physical_memo),
      });

      // On initial modal load, if saved exam data exists, restore
      if ((student as any).exam_scores) {
        setExamScores((student as any).exam_scores);
      } else {
        // Initialize exam scores with current student data
        const initialExamId = s(student.exam_id);
        if (initialExamId) {
          setExamScores({
            [initialExamId]: {
              korean_name: s(student.korean_name),
              korean_raw: s(student.korean_raw),
              korean_std: s(student.korean_std),
              korean_pct: s(student.korean_pct),
              korean_grade: s(student.korean_grade),
              math_name: s(student.math_name),
              math_raw: s(student.math_raw),
              math_std: s(student.math_std),
              math_pct: s(student.math_pct),
              math_grade: s(student.math_grade),
              english_raw: s(student.english_raw),
              english_grade: s(student.english_grade),
              inquiry1_name: s(student.inquiry1_name),
              inquiry1_raw: s(student.inquiry1_raw),
              inquiry1_std: s(student.inquiry1_std),
              inquiry1_pct: s(student.inquiry1_pct),
              inquiry1_grade: s(student.inquiry1_grade),
              inquiry2_name: s(student.inquiry2_name),
              inquiry2_raw: s(student.inquiry2_raw),
              inquiry2_std: s(student.inquiry2_std),
              inquiry2_pct: s(student.inquiry2_pct),
              inquiry2_grade: s(student.inquiry2_grade),
              history_raw: s(student.history_raw),
              history_grade: s(student.history_grade),
            }
          });
        }
      }

      const initialExamId = s(student.exam_id);
      if (initialExamId) {
        setCurrentExamId(initialExamId);
        setHasUnsavedExamChanges(false);
      }
    }
  }, [isOpen, mode, student]);

  const toggleSection = (key: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const renderSectionToggle = (key: keyof typeof openSections, label: string) => (
    <div style={styles.formFieldWide}>
      <button style={styles.sectionToggle} onClick={() => toggleSection(key)} type="button">
        {label} {openSections[key] ? "접기" : "펼치기"}
      </button>
    </div>
  );

  const handleSave = async () => {
    if (!form.name || !form.school_name || !form.grade || !form.branch_id) {
      alert("이름, 학교, 학년, 지점은 필수입니다.");
      return;
    }

    try {
      setSavingExam(true);

      // Save basic student info with current exam
      const payload: Student = {
        student_id: s(form.student_id).trim(),
        student_no: s(form.student_no).trim(),
        name: s(form.name).trim(),
        gender: s(form.gender).trim(),
        birth_date: s(form.birth_date).trim(),
        school_name: s(form.school_name).trim(),
        grade: String(form.grade || ""),
        class_name: s(form.class_name).trim(),
        phone: s(form.phone).trim(),
        parent_phone: s(form.parent_phone).trim(),
        branch_id: s(form.branch_id).trim(),
        admission_year: s(form.admission_year).trim(),
        status: s(form.status).trim(),
        memo: s(form.memo).trim(),
        exam_id: s(currentExamId || form.exam_id).trim(),
        // Include current exam scores in the payload
        korean_name: s(form.korean_name).trim(),
        korean_raw: s(form.korean_raw).trim(),
        korean_std: s(form.korean_std).trim(),
        korean_pct: s(form.korean_pct).trim(),
        korean_grade: s(form.korean_grade).trim(),
        math_name: s(form.math_name).trim(),
        math_raw: s(form.math_raw).trim(),
        math_std: s(form.math_std).trim(),
        math_pct: s(form.math_pct).trim(),
        math_grade: s(form.math_grade).trim(),
        english_raw: s(form.english_raw).trim(),
        english_grade: s(form.english_grade).trim(),
        inquiry1_name: s(form.inquiry1_name).trim(),
        inquiry1_raw: s(form.inquiry1_raw).trim(),
        inquiry1_std: s(form.inquiry1_std).trim(),
        inquiry1_pct: s(form.inquiry1_pct).trim(),
        inquiry1_grade: s(form.inquiry1_grade).trim(),
        inquiry2_name: s(form.inquiry2_name).trim(),
        inquiry2_raw: s(form.inquiry2_raw).trim(),
        inquiry2_std: s(form.inquiry2_std).trim(),
        inquiry2_pct: s(form.inquiry2_pct).trim(),
        inquiry2_grade: s(form.inquiry2_grade).trim(),
        history_raw: s(form.history_raw).trim(),
        history_grade: s(form.history_grade).trim(),
        back_strength: s(form.back_strength).trim(),
        run_10m: s(form.run_10m).trim(),
        medicine_ball: s(form.medicine_ball).trim(),
        sit_reach: s(form.sit_reach).trim(),
        standing_jump: s(form.standing_jump).trim(),
        run_20m: s(form.run_20m).trim(),
        physical_total_score: s(form.physical_total_score).trim(),
        physical_memo: s(form.physical_memo).trim(),
      };

      // Add all exam drafts to the payload
      (payload as any).exam_scores = examScores;

      await onSave(payload);

      // Save all exam scores if the callback is provided
      if (onSaveExamScores) {
        for (const [examId, scores] of Object.entries(examScores)) {
          if (examId && Object.keys(scores).length > 0) {
            await onSaveExamScores(examId, scores);
          }
        }
      }

      setHasUnsavedExamChanges(false);
    } catch (error) {
      console.error("Save failed:", error);
      alert("저장 중 오류가 발생했습니다.");
    } finally {
      setSavingExam(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modalBox}>
        <div style={styles.leftPanel}>
          <div style={styles.modalHeader}>
            <h3 style={styles.modalTitle}>{mode === "add" ? "학생 추가" : "학생 수정"}</h3>
            <button style={styles.closeButton} onClick={onClose} disabled={saving}>
              ✕
            </button>
          </div>

          <div style={styles.formGrid}>
          {renderSectionToggle("basic", "기본 정보")}
          {openSections.basic && (
            <>
              <div style={styles.formField}>
                <label style={styles.formLabel}>학번</label>
                <input
                  style={styles.formInput}
                  value={form.student_no}
                  onChange={(e) => setForm({ ...form, student_no: e.target.value })}
                  placeholder="비우면 자동생성"
                />
              </div>
              <div style={styles.formField}>
                <label style={styles.formLabel}>이름 *</label>
                <input
                  style={styles.formInput}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="학생 이름"
                  autoFocus
                />
              </div>
              <div style={styles.formField}>
                <label style={styles.formLabel}>성별</label>
                <select
                  style={styles.formInput}
                  value={form.gender}
                  onChange={(e) => setForm({ ...form, gender: e.target.value })}
                >
                  <option value="">선택</option>
                  <option value="남">남</option>
                  <option value="여">여</option>
                </select>
              </div>
              <div style={styles.formField}>
                <label style={styles.formLabel}>생년월일</label>
                <input
                  style={styles.formInput}
                  value={form.birth_date}
                  onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
                  placeholder="예: 2008-05-26"
                />
              </div>
              <div style={styles.formField}>
                <label style={styles.formLabel}>학교 *</label>
                <input
                  style={styles.formInput}
                  value={form.school_name}
                  onChange={(e) => setForm({ ...form, school_name: e.target.value })}
                  placeholder="학교명"
                />
              </div>
              <div style={styles.formField}>
                <label style={styles.formLabel}>학년 *</label>
                <input
                  style={styles.formInput}
                  value={s(form.grade)}
                  onChange={(e) => setForm({ ...form, grade: e.target.value })}
                  placeholder="학년"
                />
              </div>
              <div style={styles.formField}>
                <label style={styles.formLabel}>반</label>
                <input
                  style={styles.formInput}
                  value={form.class_name}
                  onChange={(e) => setForm({ ...form, class_name: e.target.value })}
                  placeholder="반"
                />
              </div>
              <div style={styles.formField}>
                <label style={styles.formLabel}>지점 *</label>
                <select
                  style={styles.formInput}
                  value={form.branch_id}
                  onChange={(e) => setForm({ ...form, branch_id: e.target.value })}
                >
                  <option value="">지점 선택</option>
                  {branches.map((branch) => (
                    <option key={s(branch.branch_id)} value={s(branch.branch_id)}>
                      {s(branch.branch_name)}
                    </option>
                  ))}
                </select>
              </div>
              <div style={styles.formField}>
                <label style={styles.formLabel}>연락처</label>
                <input
                  style={styles.formInput}
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="연락처"
                />
              </div>
              <div style={styles.formField}>
                <label style={styles.formLabel}>학부모 연락처</label>
                <input
                  style={styles.formInput}
                  value={form.parent_phone}
                  onChange={(e) => setForm({ ...form, parent_phone: e.target.value })}
                  placeholder="학부모 연락처"
                />
              </div>
              <div style={styles.formField}>
                <label style={styles.formLabel}>입학연도</label>
                <input
                  style={styles.formInput}
                  value={form.admission_year}
                  onChange={(e) => setForm({ ...form, admission_year: e.target.value })}
                  placeholder="예: 2026"
                />
              </div>
              <div style={styles.formField}>
                <label style={styles.formLabel}>상태</label>
                <select
                  style={styles.formInput}
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  <option value="active">active</option>
                  <option value="inactive">inactive</option>
                </select>
              </div>
              <div style={styles.formFieldWide}>
                <label style={styles.formLabel}>메모</label>
                <textarea
                  style={{ ...styles.formInput, minHeight: "90px", resize: "vertical" as const }}
                  value={form.memo}
                  onChange={(e) => setForm({ ...form, memo: e.target.value })}
                  placeholder="메모"
                />
              </div>
            </>
          )}

          <div style={styles.formFieldWide}>
            <label style={styles.formLabel}>시험 유형 *</label>
            <select
              style={styles.formInput}
              value={form.exam_id}
              onChange={(e) => handleExamChange(e.target.value)}
            >
              <option value="">시험 유형 선택</option>
              <option value="3모">3모</option>
              <option value="6모">6모</option>
              <option value="9모">9모</option>
              <option value="수능">수능</option>
            </select>
          </div>

          {renderSectionToggle("korean", "국어 성적")}
          {openSections.korean && (
            <>
              <div style={styles.formField}>
                <label style={styles.formLabel}>과목명</label>
                <select
                  style={styles.formInput}
                  value={form.korean_name}
                  onChange={(e) => {
                    setForm({ ...form, korean_name: e.target.value });
                    if (currentExamId) setExamScoreFields(currentExamId, { korean_name: e.target.value });
                  }}
                >
                  <option value="">선택</option>
                  <option value="국어(화법과작문)">국어(화법과작문)</option>
                  <option value="국어(언어와매체)">국어(언어와매체)</option>
                </select>
              </div>
              <div style={styles.formField}>
                <label style={styles.formLabel}>원점수</label>
                <input
                  style={styles.formInput}
                  value={form.korean_raw}
                  onChange={(e) => {
                    setForm({ ...form, korean_raw: e.target.value });
                    if (currentExamId) setExamScoreFields(currentExamId, { korean_raw: e.target.value });
                  }}
                />
              </div>
              <div style={styles.formField}>
                <label style={styles.formLabel}>표준점수</label>
                <input
                  style={styles.formInput}
                  value={form.korean_std}
                  onChange={(e) => {
                    setForm({ ...form, korean_std: e.target.value });
                    if (currentExamId) setExamScoreFields(currentExamId, { korean_std: e.target.value });
                  }}
                />
              </div>
              <div style={styles.formField}>
                <label style={styles.formLabel}>백분위</label>
                <input
                  style={styles.formInput}
                  value={form.korean_pct}
                  onChange={(e) => {
                    setForm({ ...form, korean_pct: e.target.value });
                    if (currentExamId) setExamScoreFields(currentExamId, { korean_pct: e.target.value });
                  }}
                />
              </div>
              <div style={styles.formField}>
                <label style={styles.formLabel}>등급</label>
                <input
                  style={styles.formInput}
                  value={form.korean_grade}
                  onChange={(e) => {
                    setForm({ ...form, korean_grade: e.target.value });
                    if (currentExamId) setExamScoreFields(currentExamId, { korean_grade: e.target.value });
                  }}
                  placeholder="1-9"
                />
              </div>
            </>
          )}

          {renderSectionToggle("math", "수학 성적")}
          {openSections.math && (
            <>
              <div style={styles.formField}>
                <label style={styles.formLabel}>과목명</label>
                <select
                  style={styles.formInput}
                  value={form.math_name}
                  onChange={(e) => {
                    setForm({ ...form, math_name: e.target.value });
                    if (currentExamId) setExamScoreFields(currentExamId, { math_name: e.target.value });
                  }}
                >
                  <option value="">선택</option>
                  <option value="수학(확률과통계)">수학(확률과통계)</option>
                  <option value="수학(미적분)">수학(미적분)</option>
                  <option value="수학(기하)">수학(기하)</option>
                </select>
              </div>
              <div style={styles.formField}>
                <label style={styles.formLabel}>원점수</label>
                <input
                  style={styles.formInput}
                  value={form.math_raw}
                  onChange={(e) => {
                    setForm({ ...form, math_raw: e.target.value });
                    if (currentExamId) setExamScoreFields(currentExamId, { math_raw: e.target.value });
                  }}
                />
              </div>
              <div style={styles.formField}>
                <label style={styles.formLabel}>표준점수</label>
                <input
                  style={styles.formInput}
                  value={form.math_std}
                  onChange={(e) => {
                    setForm({ ...form, math_std: e.target.value });
                    if (currentExamId) setExamScoreFields(currentExamId, { math_std: e.target.value });
                  }}
                />
              </div>
              <div style={styles.formField}>
                <label style={styles.formLabel}>백분위</label>
                <input
                  style={styles.formInput}
                  value={form.math_pct}
                  onChange={(e) => {
                    setForm({ ...form, math_pct: e.target.value });
                    if (currentExamId) setExamScoreFields(currentExamId, { math_pct: e.target.value });
                  }}
                />
              </div>
              <div style={styles.formField}>
                <label style={styles.formLabel}>등급</label>
                <input
                  style={styles.formInput}
                  value={form.math_grade}
                  onChange={(e) => {
                    setForm({ ...form, math_grade: e.target.value });
                    if (currentExamId) setExamScoreFields(currentExamId, { math_grade: e.target.value });
                  }}
                  placeholder="1-9"
                />
              </div>
            </>
          )}

          {renderSectionToggle("english", "영어 성적")}
          {openSections.english && (
            <>
              <div style={styles.formField}>
                <label style={styles.formLabel}>원점수</label>
                <input
                  style={styles.formInput}
                  value={form.english_raw}
                  onChange={(e) => {
                    setForm({ ...form, english_raw: e.target.value });
                    if (currentExamId) setExamScoreFields(currentExamId, { english_raw: e.target.value });
                  }}
                />
              </div>
              <div style={styles.formField}>
                <label style={styles.formLabel}>등급</label>
                <input
                  style={styles.formInput}
                  value={form.english_grade}
                  onChange={(e) => {
                    setForm({ ...form, english_grade: e.target.value });
                    if (currentExamId) setExamScoreFields(currentExamId, { english_grade: e.target.value });
                  }}
                  placeholder="1-9"
                />
              </div>
            </>
          )}

          {renderSectionToggle("inquiry1", "탐구1 성적")}
          {openSections.inquiry1 && (
            <>
              <div style={styles.formField}>
                <label style={styles.formLabel}>과목명</label>
                <select
                  style={styles.formInput}
                  value={form.inquiry1_name}
                  onChange={(e) => {
                    setForm({ ...form, inquiry1_name: e.target.value });
                    if (currentExamId) setExamScoreFields(currentExamId, { inquiry1_name: e.target.value });
                  }}
                >
                  <option value="">선택</option>
                  <optgroup label="사회탐구">
                    <option value="생활과윤리">생활과윤리</option>
                    <option value="윤리와사상">윤리와사상</option>
                    <option value="한국지리">한국지리</option>
                    <option value="세계지리">세계지리</option>
                    <option value="동아시아사">동아시아사</option>
                    <option value="세계사">세계사</option>
                    <option value="정치와법">정치와법</option>
                    <option value="경제">경제</option>
                    <option value="사회문화">사회문화</option>
                  </optgroup>
                  <optgroup label="과학탐구">
                    <option value="물리1">물리1</option>
                    <option value="물리2">물리2</option>
                    <option value="화학1">화학1</option>
                    <option value="화학2">화학2</option>
                    <option value="생명과학1">생명과학1</option>
                    <option value="생명과학2">생명과학2</option>
                    <option value="지구과학1">지구과학1</option>
                    <option value="지구과학2">지구과학2</option>
                  </optgroup>
                </select>
              </div>
              <div style={styles.formField}>
                <label style={styles.formLabel}>원점수</label>
                <input
                  style={styles.formInput}
                  value={form.inquiry1_raw}
                  onChange={(e) => {
                    setForm({ ...form, inquiry1_raw: e.target.value });
                    if (currentExamId) setExamScoreFields(currentExamId, { inquiry1_raw: e.target.value });
                  }}
                />
              </div>
              <div style={styles.formField}>
                <label style={styles.formLabel}>표준점수</label>
                <input
                  style={styles.formInput}
                  value={form.inquiry1_std}
                  onChange={(e) => {
                    setForm({ ...form, inquiry1_std: e.target.value });
                    if (currentExamId) setExamScoreFields(currentExamId, { inquiry1_std: e.target.value });
                  }}
                />
              </div>
              <div style={styles.formField}>
                <label style={styles.formLabel}>백분위</label>
                <input
                  style={styles.formInput}
                  value={form.inquiry1_pct}
                  onChange={(e) => {
                    setForm({ ...form, inquiry1_pct: e.target.value });
                    if (currentExamId) setExamScoreFields(currentExamId, { inquiry1_pct: e.target.value });
                  }}
                />
              </div>
              <div style={styles.formField}>
                <label style={styles.formLabel}>등급</label>
                <input
                  style={styles.formInput}
                  value={form.inquiry1_grade}
                  onChange={(e) => {
                    setForm({ ...form, inquiry1_grade: e.target.value });
                    if (currentExamId) setExamScoreFields(currentExamId, { inquiry1_grade: e.target.value });
                  }}
                  placeholder="1-9"
                />
              </div>
            </>
          )}

          {renderSectionToggle("inquiry2", "탐구2 성적")}
          {openSections.inquiry2 && (
            <>
              <div style={styles.formField}>
                <label style={styles.formLabel}>과목명</label>
                <select
                  style={styles.formInput}
                  value={form.inquiry2_name}
                  onChange={(e) => {
                    setForm({ ...form, inquiry2_name: e.target.value });
                    if (currentExamId) setExamScoreFields(currentExamId, { inquiry2_name: e.target.value });
                  }}
                >
                  <option value="">선택</option>
                  <optgroup label="사회탐구">
                    <option value="생활과윤리">생활과윤리</option>
                    <option value="윤리와사상">윤리와사상</option>
                    <option value="한국지리">한국지리</option>
                    <option value="세계지리">세계지리</option>
                    <option value="동아시아사">동아시아사</option>
                    <option value="세계사">세계사</option>
                    <option value="정치와법">정치와법</option>
                    <option value="경제">경제</option>
                    <option value="사회문화">사회문화</option>
                  </optgroup>
                  <optgroup label="과학탐구">
                    <option value="물리1">물리1</option>
                    <option value="물리2">물리2</option>
                    <option value="화학1">화학1</option>
                    <option value="화학2">화학2</option>
                    <option value="생명과학1">생명과학1</option>
                    <option value="생명과학2">생명과학2</option>
                    <option value="지구과학1">지구과학1</option>
                    <option value="지구과학2">지구과학2</option>
                  </optgroup>
                </select>
              </div>
              <div style={styles.formField}>
                <label style={styles.formLabel}>원점수</label>
                <input
                  style={styles.formInput}
                  value={form.inquiry2_raw}
                  onChange={(e) => {
                    setForm({ ...form, inquiry2_raw: e.target.value });
                    if (currentExamId) setExamScoreFields(currentExamId, { inquiry2_raw: e.target.value });
                  }}
                />
              </div>
              <div style={styles.formField}>
                <label style={styles.formLabel}>표준점수</label>
                <input
                  style={styles.formInput}
                  value={form.inquiry2_std}
                  onChange={(e) => {
                    setForm({ ...form, inquiry2_std: e.target.value });
                    if (currentExamId) setExamScoreFields(currentExamId, { inquiry2_std: e.target.value });
                  }}
                />
              </div>
              <div style={styles.formField}>
                <label style={styles.formLabel}>백분위</label>
                <input
                  style={styles.formInput}
                  value={form.inquiry2_pct}
                  onChange={(e) => {
                    setForm({ ...form, inquiry2_pct: e.target.value });
                    if (currentExamId) setExamScoreFields(currentExamId, { inquiry2_pct: e.target.value });
                  }}
                />
              </div>
              <div style={styles.formField}>
                <label style={styles.formLabel}>등급</label>
                <input
                  style={styles.formInput}
                  value={form.inquiry2_grade}
                  onChange={(e) => {
                    setForm({ ...form, inquiry2_grade: e.target.value });
                    if (currentExamId) setExamScoreFields(currentExamId, { inquiry2_grade: e.target.value });
                  }}
                  placeholder="1-9"
                />
              </div>
            </>
          )}

          {renderSectionToggle("history", "한국사 성적")}
          {openSections.history && (
            <>
              <div style={styles.formField}>
                <label style={styles.formLabel}>원점수</label>
                <input
                  style={styles.formInput}
                  value={form.history_raw}
                  onChange={(e) => {
                    setForm({ ...form, history_raw: e.target.value });
                    if (currentExamId) setExamScoreFields(currentExamId, { history_raw: e.target.value });
                  }}
                />
              </div>
              <div style={styles.formField}>
                <label style={styles.formLabel}>등급</label>
                <input
                  style={styles.formInput}
                  value={form.history_grade}
                  onChange={(e) => {
                    setForm({ ...form, history_grade: e.target.value });
                    if (currentExamId) setExamScoreFields(currentExamId, { history_grade: e.target.value });
                  }}
                  placeholder="1-9"
                />
              </div>
            </>
          )}
        </div>

        {renderSectionToggle("physical", "체력 검사")}
        {openSections.physical && (
          <>
            <div style={styles.formField}>
              <label style={styles.formLabel}>배근력</label>
              <input
                style={styles.formInput}
                value={form.back_strength}
                onChange={(e) => setForm({ ...form, back_strength: e.target.value })}
                placeholder="배근력 측정값"
              />
            </div>
            <div style={styles.formField}>
              <label style={styles.formLabel}>10m왕복달리기</label>
              <input
                style={styles.formInput}
                value={form.run_10m}
                onChange={(e) => setForm({ ...form, run_10m: e.target.value })}
                placeholder="10m왕복달리기 시간"
              />
            </div>
            <div style={styles.formField}>
              <label style={styles.formLabel}>메디신볼</label>
              <input
                style={styles.formInput}
                value={form.medicine_ball}
                onChange={(e) => setForm({ ...form, medicine_ball: e.target.value })}
                placeholder="메디신볼 거리"
              />
            </div>
            <div style={styles.formField}>
              <label style={styles.formLabel}>좌전굴</label>
              <input
                style={styles.formInput}
                value={form.sit_reach}
                onChange={(e) => setForm({ ...form, sit_reach: e.target.value })}
                placeholder="좌전굴 거리"
              />
            </div>
            <div style={styles.formField}>
              <label style={styles.formLabel}>제자리멀리뛰기</label>
              <input
                style={styles.formInput}
                value={form.standing_jump}
                onChange={(e) => setForm({ ...form, standing_jump: e.target.value })}
                placeholder="제자리멀리뛰기 거리"
              />
            </div>
            <div style={styles.formField}>
              <label style={styles.formLabel}>20m왕복달리기</label>
              <input
                style={styles.formInput}
                value={form.run_20m}
                onChange={(e) => setForm({ ...form, run_20m: e.target.value })}
                placeholder="20m왕복달리기 시간"
              />
            </div>
            <div style={styles.formField}>
              <label style={styles.formLabel}>총점</label>
              <input
                style={styles.formInput}
                value={form.physical_total_score}
                onChange={(e) => setForm({ ...form, physical_total_score: e.target.value })}
                placeholder="체력 검사 총점"
              />
            </div>
            <div style={styles.formFieldWide}>
              <label style={styles.formLabel}>메모</label>
              <textarea
                style={styles.formTextarea}
                value={form.physical_memo}
                onChange={(e) => setForm({ ...form, physical_memo: e.target.value })}
                placeholder="체력 검사 관련 메모"
                rows={3}
              />
            </div>
          </>
        )}

        </div>

        <div style={styles.rightPanel}>
          <div style={styles.examPanelColumn}>
            {/* Exam Summary Cards */}
            <div style={styles.examSummaryContainer}>
              {Object.entries(examLabels).map(([examId, examLabel]) => (
                <div
                  key={examId}
                  style={{
                    ...styles.examSummaryCard,
                    ...(currentExamId === examId ? styles.examSummaryCardSelected : {}),
                  }}
                  onClick={() => handleExamChange(examId)}
                >
                  <div style={styles.examSummaryLabel}>{examLabel}</div>
                  <div style={styles.examSummaryGrades}>{getExamSummary(examId)}</div>
                  <div style={styles.examSummaryStatus}>{getExamStatus(examId)}</div>
                </div>
              ))}
            </div>

            {/* Selected Exam Detail Section */}
            <div style={styles.examDetailSection}>
              <h4 style={styles.examDetailTitle}>
                {examLabels[currentExamId] || currentExamId} - 성적 상세
              </h4>

              <div style={styles.examDetailRow}>
                <span>국어 과목명</span>
                <span>{s(getSelectedExamData().korean_name) || "-"}</span>
              </div>
              <div style={styles.examDetailRow}>
                <span>국어 원점수</span>
                <span>{s(getSelectedExamData().korean_raw) || "-"}</span>
              </div>
              <div style={styles.examDetailRow}>
                <span>국어 표준점수</span>
                <span>{s(getSelectedExamData().korean_std) || "-"}</span>
              </div>
              <div style={styles.examDetailRow}>
                <span>국어 백분위</span>
                <span>{s(getSelectedExamData().korean_pct) || "-"}</span>
              </div>
              <div style={styles.examDetailRow}>
                <span>국어 등급</span>
                <span>{s(getSelectedExamData().korean_grade) || "-"}</span>
              </div>

              <div style={styles.examDetailRow}>
                <span>수학 과목명</span>
                <span>{s(getSelectedExamData().math_name) || "-"}</span>
              </div>
              <div style={styles.examDetailRow}>
                <span>수학 원점수</span>
                <span>{s(getSelectedExamData().math_raw) || "-"}</span>
              </div>
              <div style={styles.examDetailRow}>
                <span>수학 표준점수</span>
                <span>{s(getSelectedExamData().math_std) || "-"}</span>
              </div>
              <div style={styles.examDetailRow}>
                <span>수학 백분위</span>
                <span>{s(getSelectedExamData().math_pct) || "-"}</span>
              </div>
              <div style={styles.examDetailRow}>
                <span>수학 등급</span>
                <span>{s(getSelectedExamData().math_grade) || "-"}</span>
              </div>

              <div style={styles.examDetailRow}>
                <span>영어 원점수</span>
                <span>{s(getSelectedExamData().english_raw) || "-"}</span>
              </div>
              <div style={styles.examDetailRow}>
                <span>영어 등급</span>
                <span>{s(getSelectedExamData().english_grade) || "-"}</span>
              </div>

              <div style={styles.examDetailRow}>
                <span>탐구1 과목명</span>
                <span>{s(getSelectedExamData().inquiry1_name) || "-"}</span>
              </div>
              <div style={styles.examDetailRow}>
                <span>탐구1 원점수</span>
                <span>{s(getSelectedExamData().inquiry1_raw) || "-"}</span>
              </div>
              <div style={styles.examDetailRow}>
                <span>탐구1 표준점수</span>
                <span>{s(getSelectedExamData().inquiry1_std) || "-"}</span>
              </div>
              <div style={styles.examDetailRow}>
                <span>탐구1 백분위</span>
                <span>{s(getSelectedExamData().inquiry1_pct) || "-"}</span>
              </div>
              <div style={styles.examDetailRow}>
                <span>탐구1 등급</span>
                <span>{s(getSelectedExamData().inquiry1_grade) || "-"}</span>
              </div>

              <div style={styles.examDetailRow}>
                <span>탐구2 과목명</span>
                <span>{s(getSelectedExamData().inquiry2_name) || "-"}</span>
              </div>
              <div style={styles.examDetailRow}>
                <span>탐구2 원점수</span>
                <span>{s(getSelectedExamData().inquiry2_raw) || "-"}</span>
              </div>
              <div style={styles.examDetailRow}>
                <span>탐구2 표준점수</span>
                <span>{s(getSelectedExamData().inquiry2_std) || "-"}</span>
              </div>
              <div style={styles.examDetailRow}>
                <span>탐구2 백분위</span>
                <span>{s(getSelectedExamData().inquiry2_pct) || "-"}</span>
              </div>
              <div style={styles.examDetailRow}>
                <span>탐구2 등급</span>
                <span>{s(getSelectedExamData().inquiry2_grade) || "-"}</span>
              </div>

              <div style={styles.examDetailRow}>
                <span>한국사 원점수</span>
                <span>{s(getSelectedExamData().history_raw) || "-"}</span>
              </div>
              <div style={styles.examDetailRow}>
                <span>한국사 등급</span>
                <span>{s(getSelectedExamData().history_grade) || "-"}</span>
              </div>
            </div>
          </div>
        </div>

        <div style={styles.modalFooter}>
          <button style={styles.secondaryButton} onClick={onClose} disabled={saving}>
            닫기
          </button>
          {currentExamId && hasUnsavedExamChanges && (
            <button
              style={styles.examSaveButton}
              onClick={handleSave}
              disabled={savingExam}
            >
              {savingExam ? "저장 중..." : "이 시험 성적 저장"}
            </button>
          )}
          <button style={styles.primaryButton} onClick={handleSave} disabled={saving}>
            {saving ? "저장 중..." : mode === "add" ? "학생 추가" : "학생 수정"}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15, 23, 42, 0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: "20px",
  },
  modalBox: {
    width: "100%",
    maxWidth: "1200px",
    background: "#ffffff",
    borderRadius: "20px",
    padding: "24px",
    boxShadow: "0 20px 50px rgba(15, 23, 42, 0.25)",
    maxHeight: "90vh",
    overflowY: "auto",
    display: "flex",
    gap: "24px",
  },
  leftPanel: {
    flex: 1,
    minWidth: 0,
  },
  rightPanel: {
    width: "320px",
    flexShrink: 0,
    borderLeft: "1px solid #e2e8f0",
    paddingLeft: "24px",
  },
  examPanelColumn: {
    minWidth: "260px",
    maxWidth: "320px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  examSummaryContainer: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "8px",
    marginBottom: "16px",
  },
  examSummaryCard: {
    background: "#f8fafc",
    border: "2px solid #e2e8f0",
    borderRadius: "8px",
    padding: "8px",
    textAlign: "center",
    cursor: "pointer",
    transition: "all 0.2s ease",
    fontSize: "12px",
  },
  examSummaryCardSelected: {
    background: "#dbeafe",
    border: "2px solid #1d4ed8",
    color: "#1d4ed8",
  },
  examSummaryLabel: {
    fontWeight: 700,
    marginBottom: "2px",
  },
  examSummaryStatus: {
    fontSize: "10px",
    color: "#64748b",
  },
  examSummaryGrades: {
    fontSize: "11px",
    fontWeight: 600,
    color: "#1e293b",
    marginBottom: "2px",
  },
  examDetailSection: {
    borderTop: "1px solid #e2e8f0",
    paddingTop: "12px",
  },
  examDetailTitle: {
    fontSize: "14px",
    fontWeight: 700,
    color: "#64748b",
    marginBottom: "8px",
  },
  examDetailRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "12px",
    marginBottom: "4px",
    color: "#334155",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
  },
  modalTitle: {
    margin: 0,
    fontSize: "22px",
    fontWeight: 900,
    color: "#0f172a",
  },
  closeButton: {
    border: "none",
    background: "#f1f5f9",
    width: "36px",
    height: "36px",
    borderRadius: "10px",
    cursor: "pointer",
    fontSize: "16px",
    fontWeight: 700,
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "14px",
  },
  formField: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  formFieldWide: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    gridColumn: "1 / -1",
  },
  formLabel: {
    fontSize: "13px",
    fontWeight: 700,
    color: "#475569",
  },
  formInput: {
    padding: "12px 14px",
    borderRadius: "12px",
    border: "1px solid #cbd5e1",
    fontSize: "14px",
    outline: "none",
    background: "#fff",
  },
  sectionToggle: {
    width: "100%",
    border: "1px solid #cbd5e1",
    background: "#f8fafc",
    color: "#0f172a",
    padding: "12px 14px",
    borderRadius: "12px",
    fontSize: "14px",
    fontWeight: 800,
    cursor: "pointer",
    textAlign: "left",
  },
  modalFooter: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
    marginTop: "24px",
    flexWrap: "wrap",
  },
  secondaryButton: {
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    color: "#334155",
    padding: "12px 16px",
    borderRadius: "12px",
    fontSize: "14px",
    fontWeight: 700,
    cursor: "pointer",
  },
  primaryButton: {
    border: "none",
    background: "#2563eb",
    color: "#ffffff",
    padding: "12px 16px",
    borderRadius: "12px",
    fontSize: "14px",
    fontWeight: 700,
    cursor: "pointer",
  },
  examSaveButton: {
    border: "none",
    background: "#16a34a",
    color: "#ffffff",
    padding: "12px 16px",
    borderRadius: "12px",
    fontSize: "14px",
    fontWeight: 700,
    cursor: "pointer",
  },
};
