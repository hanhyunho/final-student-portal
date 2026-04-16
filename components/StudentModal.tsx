"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Student, Branch, MockExam, PhysicalTest, PhysicalRecord } from "@/lib/dataService";
import { EXAM_LABELS, EXAM_SAVE_GROUPS, EXAM_TYPE_MAP, getCanonicalExamId, hasExamSaved, resolveExamSaveGroup } from "@/lib/examSaveState";
import { MOCK_SCORE_FIELD_KEYS, pickMockScoreFields } from "@/lib/mockScoreFields";
import classes from "./StudentModal.module.css";

interface StudentModalProps {
  isOpen: boolean;
  mode: "add" | "edit";
  student: Student | null;
  initialExamId?: string | null;
  initialLoginStatus?: string;
  branches: Branch[];
  mockExams: MockExam[];
  physicalTests: PhysicalTest[];
  physicalRecords: PhysicalRecord[];
  saving: boolean;
  onClose: () => void;
  onSave: (student: Student & { loginStatus?: string }) => Promise<Student | null>;
  onSaveExamScores?: (
    examId: string,
    scores: Partial<Student>,
    targetStudent?: Pick<Student, "student_id" | "name" | "branch_id">,
    options?: {
      skipRefresh?: boolean;
      suppressFeedback?: boolean;
    }
  ) => Promise<Partial<Student> | null>;
  onSavePhysicalRecord?: (
    record: PhysicalRecord,
    options?: {
      skipRefresh?: boolean;
      suppressFeedback?: boolean;
    }
  ) => Promise<void>;
}

type SaveNotice = {
  type: "success" | "error";
  message: string;
};

type StudentWithExamScores = Student & {
  exam_scores?: Record<string, Partial<Student>>;
  loginStatus?: string;
};

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
  status: "등록",
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

function normalizeSubjectName(raw: unknown) {
  const v = s(raw).trim();
  return v
    .replace(/^국어\(([^)]+)\)$/, "$1")
    .replace(/^수학\(([^)]+)\)$/, "$1");
}

function buildPhysicalTestLabel(test: PhysicalTest) {
  const rawDate = s(test.test_date).trim();
  const rawName = s(test.test_name).trim();

  const dateMatch = rawDate.match(/^(\d{4})[-/.](\d{1,2})[-/.]\d{1,2}$/);
  const year = dateMatch?.[1] || "";
  const monthNumber = Number(dateMatch?.[2] || "0");
  const hasValidYearMonth = Number.isFinite(monthNumber) && monthNumber >= 1 && monthNumber <= 12 && !!year;
  const yearMonthLabel = hasValidYearMonth ? `${year}년 ${monthNumber}월` : "";

  const nameWithoutLeadingDate = rawName
    .replace(/^\d{4}\s*[년.-]?\s*\d{0,2}\s*[월.-]?\s*/, "")
    .trim();
  const displayName = nameWithoutLeadingDate || rawName;

  if (yearMonthLabel && displayName) {
    return `${yearMonthLabel} ${displayName}`;
  }

  return yearMonthLabel || displayName;
}

function normalizeCompareText(value: unknown) {
  return s(value).trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizeLoginStatus(value: unknown) {
  return normalizeCompareText(value) === "inactive" ? "inactive" : "active";
}

function normalizeStudentStatus(value: unknown) {
  const normalized = s(value).trim();
  return ["등록", "휴원", "졸업", "퇴원"].includes(normalized) ? normalized : "등록";
}

function getSortableDateValue(rawDate: unknown) {
  const normalizedDate = s(rawDate).trim();
  const dateMatch = normalizedDate.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);

  if (!dateMatch) {
    return -1;
  }

  return Number(`${dateMatch[1]}${dateMatch[2].padStart(2, "0")}${dateMatch[3].padStart(2, "0")}`);
}

function getRecordField(record: PhysicalRecord, fieldName: string) {
  return (record as Record<string, unknown>)[fieldName];
}

function pickExamFields(source: Partial<Student>) {
  return pickMockScoreFields(source);
}

const EXAM_DRAFT_KEY_PREFIX = "draft_exam";
const EXAM_DRAFT_DEBOUNCE_MS = 800;
const physicalFieldKeys = [
  "back_strength_value",
  "run_10m_value",
  "medicine_ball_value",
  "sit_reach_value",
  "standing_jump_value",
  "run_20m_value",
] as const;

const emptyPhysicalForm = {
  back_strength_value: "",
  run_10m_value: "",
  medicine_ball_value: "",
  sit_reach_value: "",
  standing_jump_value: "",
  run_20m_value: "",
};

const fallbackMockExams: MockExam[] = EXAM_SAVE_GROUPS.map((group) => ({
  exam_id: getCanonicalExamId(group),
  exam_name: EXAM_LABELS[group],
  exam_date: "",
}));

// Find scores for a given exam ID from a score map, with group-based fallback.
// This handles the case where scores are stored under an old-format key (e.g. "suneung")
// but the current exam button uses the new format ("EXAM202511").
function findExamScoresFromMap(
  scoreMap: Record<string, Partial<Student>> | null | undefined,
  examId: string
): Partial<Student> | null {
  if (!scoreMap || !examId) return null;
  if (scoreMap[examId]) return scoreMap[examId];
  const group = resolveExamSaveGroup(examId);
  if (!group) return null;
  for (const [key, value] of Object.entries(scoreMap)) {
    if (resolveExamSaveGroup(key) === group && value) return value;
  }
  return null;
}

export function StudentModal({
  isOpen,
  mode,
  student,
  initialExamId = null,
  initialLoginStatus = "active",
  branches,
  mockExams,
  physicalTests,
  physicalRecords,
  saving,
  onClose,
  onSave,
  onSaveExamScores,
  onSavePhysicalRecord,
}: StudentModalProps) {
  const [form, setForm] = useState<Student>(emptyForm);
  const [loginStatus, setLoginStatus] = useState("active");
  const [examScores, setExamScores] = useState<Record<string, Partial<Student>>>({});
  const [currentExamId, setCurrentExamId] = useState<string>("");
  const [hasUnsavedExamChanges, setHasUnsavedExamChanges] = useState(false);
  const [savingExam, setSavingExam] = useState(false);
  const [selectedPhysicalTestId, setSelectedPhysicalTestId] = useState<string>("");
  const [physicalForm, setPhysicalForm] = useState(emptyPhysicalForm);
  const [hasUnsavedPhysicalChanges, setHasUnsavedPhysicalChanges] = useState(false);
  const [savingPhysical, setSavingPhysical] = useState(false);
  const [saveNotice, setSaveNotice] = useState<SaveNotice | null>(null);
  const leftPanelRef = useRef<HTMLDivElement | null>(null);
  const examScrollPositionsRef = useRef<Record<string, number>>({});
  const saveNoticeTimeoutRef = useRef<number | null>(null);

  const examOptions = useMemo(() => {
    const source = mockExams.length > 0 ? mockExams : fallbackMockExams;
    const seen = new Set<string>();

    return source
      .filter((exam) => {
        const status = s(exam.status).trim().toLowerCase();
        return !status || status === "active";
      })
      .map((exam) => ({
        examId: s(exam.exam_id).trim(),
        examLabel: s(exam.exam_name).trim() || s(exam.exam_id).trim(),
      }))
      .filter((exam) => {
        if (!exam.examId || seen.has(exam.examId)) {
          return false;
        }
        seen.add(exam.examId);
        return true;
      });
  }, [mockExams]);

  const examLabelMap = useMemo(() => {
    return examOptions.reduce<Record<string, string>>((accumulator, exam) => {
      accumulator[exam.examId] = exam.examLabel;
      return accumulator;
    }, {});
  }, [examOptions]);

  const examAliasMap = useMemo(() => {
    const map = examOptions.reduce<Record<string, string>>((accumulator, exam) => {
      accumulator[exam.examId] = exam.examId;
      accumulator[exam.examLabel] = exam.examId;
      return accumulator;
    }, {});

    // Also map old canonical group IDs ("3mo", "suneung") and display labels ("3모", "수능")
    // so that stale student.exam_id values resolve to the current sheet exam ID.
    examOptions.forEach((exam) => {
      const group = resolveExamSaveGroup(exam.examId);
      if (!group) return;
      const oldCanonical = EXAM_TYPE_MAP[group]; // "3mo", "6mo", "9mo", "suneung"
      if (oldCanonical && !map[oldCanonical]) map[oldCanonical] = exam.examId;
      const displayLabel = EXAM_LABELS[group]; // "3모", "6모", "9모", "수능"
      if (displayLabel && !map[displayLabel]) map[displayLabel] = exam.examId;
    });

    return map;
  }, [examOptions]);

  const getResolvedExamId = useCallback((examId: string) => {
    return examAliasMap[examId] || examId;
  }, [examAliasMap]);

  const clearSaveNoticeTimer = useCallback(() => {
    if (saveNoticeTimeoutRef.current !== null) {
      window.clearTimeout(saveNoticeTimeoutRef.current);
      saveNoticeTimeoutRef.current = null;
    }
  }, []);

  const showTransientSaveSuccess = useCallback((message: string) => {
    clearSaveNoticeTimer();
    setSaveNotice({ type: "success", message });
    saveNoticeTimeoutRef.current = window.setTimeout(() => {
      setSaveNotice((previous) => (previous?.type === "success" ? null : previous));
      saveNoticeTimeoutRef.current = null;
    }, 2500);
  }, [clearSaveNoticeTimer]);

  const getCurrentStudentId = useCallback(() => {
    return s(student?.student_id || form.student_id);
  }, [form.student_id, student]);

  const getCurrentStudentSnapshot = useCallback(() => {
    return {
      student_id: s(student?.student_id || form.student_id).trim(),
      name: s(student?.name || form.name).trim(),
      branch_id: s(student?.branch_id || form.branch_id).trim(),
    };
  }, [form.branch_id, form.name, form.student_id, student]);

  const getCurrentCampusCandidates = useCallback(() => {
    const currentBranchId = s(student?.branch_id || form.branch_id).trim();
    const branchName = s(
      branches.find((branch) => s(branch.branch_id) === currentBranchId)?.branch_name || ""
    ).trim();

    return [currentBranchId, branchName]
      .map((value) => normalizeCompareText(value))
      .filter(Boolean);
  }, [branches, form.branch_id, student]);

  const matchesPhysicalRecordToCurrentStudent = useCallback((record: PhysicalRecord) => {
    const currentStudentId = s(getCurrentStudentId()).trim();
    const recordStudentId = s(record.student_id).trim();

    if (currentStudentId && recordStudentId) {
      return recordStudentId === currentStudentId;
    }

    const currentStudentName = normalizeCompareText(student?.name || form.name);
    const currentCampusCandidates = getCurrentCampusCandidates();
    const recordStudentName = normalizeCompareText(
      getRecordField(record, "student_name") || getRecordField(record, "name")
    );
    const recordCampus = normalizeCompareText(
      getRecordField(record, "campus") ||
      getRecordField(record, "campus_name") ||
      getRecordField(record, "branch_name") ||
      getRecordField(record, "branch_id")
    );

    return !!currentStudentName && !!recordStudentName && currentStudentName === recordStudentName && currentCampusCandidates.includes(recordCampus);
  }, [form.name, getCurrentCampusCandidates, getCurrentStudentId, student]);

  const getPhysicalRecordForTest = useCallback((testId: string) => {
    const studentId = getCurrentStudentId();
    if (!studentId || !testId) {
      return null;
    }

    return (
      physicalRecords.find(
        (record) =>
          s(record.student_id) === studentId &&
          s(record.test_id) === s(testId)
      ) || null
    );
  }, [getCurrentStudentId, physicalRecords]);

  const loadPhysicalRecord = useCallback((testId: string) => {
    const record = getPhysicalRecordForTest(testId);

    setPhysicalForm({
      back_strength_value: s(record?.back_strength_value),
      run_10m_value: s(record?.run_10m_value),
      medicine_ball_value: s(record?.medicine_ball_value),
      sit_reach_value: s(record?.sit_reach_value),
      standing_jump_value: s(record?.standing_jump_value),
      run_20m_value: s(record?.run_20m_value),
    });
    setHasUnsavedPhysicalChanges(false);
  }, [getPhysicalRecordForTest]);

  const currentPhysicalRecord = useMemo(() => {
    return getPhysicalRecordForTest(selectedPhysicalTestId);
  }, [getPhysicalRecordForTest, selectedPhysicalTestId]);

  const practicalHistoryItems = useMemo(() => {
    const studentId = getCurrentStudentId();
    if (!studentId) {
      return [];
    }

    const testsById = new Map(physicalTests.map((test) => [s(test.test_id), test]));

    return physicalRecords
      .filter((record) => s(record.student_id) === studentId)
      .map((record) => {
        const test = testsById.get(s(record.test_id));
        const testDate = s(test?.test_date).trim();
        const parsedDate = testDate.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
        const sortableDate = parsedDate
          ? Number(`${parsedDate[1]}${parsedDate[2].padStart(2, "0")}${parsedDate[3].padStart(2, "0")}`)
          : -1;

        return {
          record,
          testId: s(record.test_id),
          label: test ? buildPhysicalTestLabel(test) : s(record.test_id) || "실기 테스트",
          sortableDate,
        };
      })
      .sort((left, right) => {
        if (right.sortableDate !== left.sortableDate) {
          return right.sortableDate - left.sortableDate;
        }

        return s(right.record.updated_at).localeCompare(s(left.record.updated_at));
      });
  }, [getCurrentStudentId, physicalRecords, physicalTests]);

  const practicalScoreChartData = useMemo(() => {
    const testsById = new Map(physicalTests.map((test) => [s(test.test_id), test]));

    return physicalRecords
      .filter((record) => matchesPhysicalRecordToCurrentStudent(record))
      .map((record) => {
        const test = testsById.get(s(record.test_id));
        const testDate = s(test?.test_date || getRecordField(record, "test_date") || getRecordField(record, "exam_date")).trim();
        const totalScoreRaw = s(record.total_score).trim();
        const totalScoreNumber = Number(totalScoreRaw);

        return {
          testId: s(record.test_id),
          label: test ? buildPhysicalTestLabel(test) : s(record.test_id) || "실기 테스트",
          dateLabel: testDate || "날짜 없음",
          sortDate: getSortableDateValue(testDate),
          totalScore: totalScoreRaw,
          totalScoreValue: Number.isFinite(totalScoreNumber) ? totalScoreNumber : null,
        };
      })
      .sort((left, right) => left.sortDate - right.sortDate);
  }, [matchesPhysicalRecordToCurrentStudent, physicalRecords, physicalTests]);

  const getPhysicalRecordDisplayValue = useCallback((value: unknown) => {
    const normalized = s(value).trim();
    return normalized || "-";
  }, []);

  const handlePhysicalFieldChange = useCallback((field: keyof typeof emptyPhysicalForm, value: string) => {
    setPhysicalForm((prev) => ({
      ...prev,
      [field]: value,
    }));
    setHasUnsavedPhysicalChanges(true);
  }, []);

  const handlePhysicalTestChange = useCallback((newTestId: string) => {
    if (newTestId === selectedPhysicalTestId) {
      return;
    }

    if (hasUnsavedPhysicalChanges && selectedPhysicalTestId) {
      const confirmed = window.confirm(
        "현재 실기테스트 기록이 저장되지 않았습니다. 저장하지 않고 다른 테스트로 이동하시겠습니까?"
      );
      if (!confirmed) {
        return;
      }
    }

    setSelectedPhysicalTestId(newTestId);
    loadPhysicalRecord(newTestId);
  }, [hasUnsavedPhysicalChanges, loadPhysicalRecord, selectedPhysicalTestId]);

  const handlePhysicalSave = async () => {
    if (!selectedPhysicalTestId) {
      setSaveNotice({ type: "error", message: "실기 테스트를 선택하세요." });
      return;
    }

    const studentId = getCurrentStudentId();
    if (!studentId) {
      setSaveNotice({ type: "error", message: "학생 저장 후 실기 기록을 저장할 수 있습니다." });
      return;
    }

    if (!onSavePhysicalRecord) {
      setSaveNotice({ type: "error", message: "실기 기록 저장 기능을 사용할 수 없습니다." });
      return;
    }

    try {
      setSavingPhysical(true);

      const existingRecord = getPhysicalRecordForTest(selectedPhysicalTestId);
      const nextRecord: PhysicalRecord = {
        student_id: studentId,
        test_id: selectedPhysicalTestId,
        back_strength_value: s(physicalForm.back_strength_value),
        run_10m_value: s(physicalForm.run_10m_value),
        medicine_ball_value: s(physicalForm.medicine_ball_value),
        sit_reach_value: s(physicalForm.sit_reach_value),
        standing_jump_value: s(physicalForm.standing_jump_value),
        run_20m_value: s(physicalForm.run_20m_value),
        created_at: existingRecord?.created_at,
        updated_at: new Date().toISOString(),
      };

      await onSavePhysicalRecord(nextRecord, {
        suppressFeedback: true,
      });
      setOpenSections((prev) => ({
        ...prev,
        physical: true,
      }));
      setHasUnsavedPhysicalChanges(false);
      setSaveNotice({ type: "success", message: "실기 기록을 저장했습니다." });
    } catch (error) {
      console.error("Physical save failed:", error);
      setSaveNotice({
        type: "error",
        message: error instanceof Error ? error.message : "실기 기록 저장 중 오류가 발생했습니다.",
      });
    } finally {
      setSavingPhysical(false);
    }
  };

  const getDraftStudentId = useCallback(() => {
    return s(form.student_id || student?.student_id || "new");
  }, [form.student_id, student]);

  const getExamDraftKey = useCallback((studentId: string, examId: string) => {
    return `${EXAM_DRAFT_KEY_PREFIX}_${studentId}_${examId}`;
  }, []);

  const getCurrentExamFields = useCallback((): Partial<Student> => {
    return pickExamFields(form);
  }, [form]);

  const readExamDraft = useCallback((studentId: string, examId: string) => {
    try {
      const rawDraft = localStorage.getItem(getExamDraftKey(studentId, examId));
      if (!rawDraft) {
        return null;
      }

      const parsed = JSON.parse(rawDraft) as {
        updatedAt?: number;
        fields?: Partial<Student>;
      };

      return {
        updatedAt: Number(parsed.updatedAt || 0),
        fields: parsed.fields || {},
      };
    } catch {
      return null;
    }
  }, [getExamDraftKey]);

  const writeExamDraft = useCallback((studentId: string, examId: string, fields: Partial<Student>) => {
    try {
      localStorage.setItem(
        getExamDraftKey(studentId, examId),
        JSON.stringify({
          updatedAt: Date.now(),
          fields,
        })
      );
    } catch {}
  }, [getExamDraftKey]);

  const clearExamDraft = useCallback((studentId: string, examId: string) => {
    try {
      localStorage.removeItem(getExamDraftKey(studentId, examId));
    } catch {}
  }, [getExamDraftKey]);

  const clearAllExamDrafts = useCallback((studentId: string) => {
    try {
      Object.keys(examScores).forEach((examId) => {
        clearExamDraft(studentId, examId);
      });
      if (currentExamId) {
        clearExamDraft(studentId, currentExamId);
      }
    } catch {}
  }, [clearExamDraft, currentExamId, examScores]);

  const saveExamScrollPosition = useCallback((examId: string) => {
    if (!examId || !leftPanelRef.current) {
      return;
    }

    examScrollPositionsRef.current[examId] = leftPanelRef.current.scrollTop;
  }, []);

  const restoreExamScrollPosition = useCallback((examId: string) => {
    if (!leftPanelRef.current) {
      return;
    }

    leftPanelRef.current.scrollTop = examId
      ? examScrollPositionsRef.current[examId] ?? 0
      : 0;
  }, []);

  const handleLeftPanelScroll = useCallback(() => {
    if (!currentExamId || !leftPanelRef.current) {
      return;
    }

    examScrollPositionsRef.current[currentExamId] = leftPanelRef.current.scrollTop;
  }, [currentExamId]);

  const getExamScoreFields = (examId: string) => {
    const resolvedExamId = getResolvedExamId(examId);
    if (examScores[resolvedExamId]) return examScores[resolvedExamId];
    if (examScores[examId]) return examScores[examId];

    // Group-based fallback: find scores saved under any alias of the same exam
    // (e.g. exam button "EXAM202511" should load scores stored under "suneung")
    const group = resolveExamSaveGroup(resolvedExamId || examId);
    if (group) {
      for (const [key, value] of Object.entries(examScores)) {
        if (resolveExamSaveGroup(key) === group && value) return value;
      }
    }

    return {};
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

    if (examId === currentExamId) {
      setHasUnsavedExamChanges(true);
    }
  };

  // Helper to load exam scores when switching exams
  const loadExamScores = useCallback((examId: string) => {
    const resolvedExamId = getResolvedExamId(examId);
    const scores = getExamScoreFields(resolvedExamId);
    const studentId = getDraftStudentId();
    const draft = readExamDraft(studentId, resolvedExamId);
    const serverUpdatedAt = Number(new Date(student?.updated_at || 0).getTime() || 0);
    const hasStoredScores = MOCK_SCORE_FIELD_KEYS.some(
      (key) => Boolean(scores[key as keyof Student])
    );
    const shouldUseDraft = Boolean(
      draft && (!hasStoredScores || draft.updatedAt > serverUpdatedAt)
    );
    const nextScores = shouldUseDraft
      ? {
          ...scores,
          ...draft?.fields,
        }
      : scores;

    if (process.env.NODE_ENV !== "production") {
      console.info("[StudentModal] loadExamScores", {
        student_id: studentId,
        requestedExamId: examId,
        resolvedExamId,
        scores,
        nextScores,
      });
    }

    setForm(prev => ({
      ...prev,
      exam_id: resolvedExamId,
      korean_name: normalizeSubjectName(nextScores.korean_name),
      korean_raw: s(nextScores.korean_raw),
      korean_std: s(nextScores.korean_std),
      korean_pct: s(nextScores.korean_pct),
      korean_grade: s(nextScores.korean_grade),
      math_name: normalizeSubjectName(nextScores.math_name),
      math_raw: s(nextScores.math_raw),
      math_std: s(nextScores.math_std),
      math_pct: s(nextScores.math_pct),
      math_grade: s(nextScores.math_grade),
      english_raw: s(nextScores.english_raw),
      english_grade: s(nextScores.english_grade),
      inquiry1_name: s(nextScores.inquiry1_name),
      inquiry1_raw: s(nextScores.inquiry1_raw),
      inquiry1_std: s(nextScores.inquiry1_std),
      inquiry1_pct: s(nextScores.inquiry1_pct),
      inquiry1_grade: s(nextScores.inquiry1_grade),
      inquiry2_name: s(nextScores.inquiry2_name),
      inquiry2_raw: s(nextScores.inquiry2_raw),
      inquiry2_std: s(nextScores.inquiry2_std),
      inquiry2_pct: s(nextScores.inquiry2_pct),
      inquiry2_grade: s(nextScores.inquiry2_grade),
      history_raw: s(nextScores.history_raw),
      history_grade: s(nextScores.history_grade),
    }));
  }, [examScores, getDraftStudentId, readExamDraft, student, getExamScoreFields]);

  // Handle exam change with warning for unsaved changes
  const handleExamChange = useCallback((newExamId: string) => {
    const resolvedExamId = getResolvedExamId(newExamId);
    if (resolvedExamId === currentExamId) return;

    if (hasUnsavedExamChanges && currentExamId) {
      const confirmed = window.confirm(
        "현재 시험 성적이 저장되지 않았습니다. 저장하지 않고 다른 시험으로 이동하시겠습니까?"
      );
      if (!confirmed) return;
    }

    // Save current visible exam fields into examScores before switching
    if (currentExamId) {
      saveExamScrollPosition(currentExamId);

      const currentExamFields = pickExamFields(form);
      setExamScores(prev => ({
        ...prev,
        [currentExamId]: {
          ...(prev[currentExamId] || {}),
          ...currentExamFields
        }
      }));
    }

    if (process.env.NODE_ENV !== "production") {
      console.info("[StudentModal] handleExamChange", {
        student_id: s(student?.student_id || form.student_id).trim(),
        previousExamId: currentExamId,
        nextExamId: resolvedExamId,
      });
    }

    setCurrentExamId(resolvedExamId);
    setForm((prev) => ({
      ...prev,
      exam_id: resolvedExamId,
    }));
    setHasUnsavedExamChanges(false);
    loadExamScores(resolvedExamId);
  }, [currentExamId, form, getResolvedExamId, hasUnsavedExamChanges, loadExamScores, saveExamScrollPosition, student]);

  const handleExamSelect = useCallback((examId: string) => {
    handleExamChange(getResolvedExamId(examId));
  }, [handleExamChange]);

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

  // Helper to check if an exam has any entered data
  const hasExamData = (examId: string): boolean => {
    const resolvedExamId = getResolvedExamId(examId);
    const examGroup = resolveExamSaveGroup(resolvedExamId);

    if (!examGroup) {
      return false;
    }

    return hasExamSaved({ exam_scores: examScores }, examGroup);
  };

  // Helper to get exam status display
  const getExamStatus = (examId: string): string => {
    const resolvedExamId = getResolvedExamId(examId);
    if (resolvedExamId === currentExamId && hasUnsavedExamChanges) return "● 미저장";
    if (hasExamData(examId)) return "✔ 저장됨";
    return "-";
  };

  const getExamStatusClassName = (examId: string) => {
    const status = getExamStatus(examId);
    if (status === "● 미저장") return classes.examCardDirty;
    if (status === "✔ 저장됨") return classes.examCardFilled;
    return classes.examCardEmpty;
  };

  // Helper to get data for the currently selected exam.
  const getSelectedExamData = (): Partial<Student> => {
    return getCurrentExamFields();
  };

  // Helper to get exam summary for display
  const getExamSummary = (examId: string): string => {
    const scores = getExamScoreFields(examId);
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
      setForm({
        ...emptyForm,
        branch_id: branches.length === 1 ? s(branches[0]?.branch_id) : "",
        exam_id: "",
      });
      setLoginStatus("active");
      setExamScores({});
      setCurrentExamId("");
      setHasUnsavedExamChanges(false);
      setSelectedPhysicalTestId(s(physicalTests[0]?.test_id));
      setPhysicalForm(emptyPhysicalForm);
      setHasUnsavedPhysicalChanges(false);
      examScrollPositionsRef.current = {};
    } else if (student) {
      setOpenSections((prev) => ({
        basic: true,
        korean: true,
        math: true,
        english: true,
        inquiry1: true,
        inquiry2: true,
        history: true,
        physical: prev.physical,
      }));
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
        status: normalizeStudentStatus(student.status),
        memo: s(student.memo),
        exam_id: s(student.exam_id),
        korean_name: normalizeSubjectName(student.korean_name),
        korean_raw: s(student.korean_raw),
        korean_std: s(student.korean_std),
        korean_pct: s(student.korean_pct),
        korean_grade: s(student.korean_grade),
        math_name: normalizeSubjectName(student.math_name),
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
      setLoginStatus(
        normalizeLoginStatus(initialLoginStatus)
      );

      // On initial modal load, if saved exam data exists, restore
      const studentWithExamScores = student as StudentWithExamScores;

      if (studentWithExamScores.exam_scores) {
        setExamScores(studentWithExamScores.exam_scores);
      } else {
        // Initialize exam scores with current student data
        const initialExamId = getResolvedExamId(s(student.exam_id));
        if (initialExamId) {
          setExamScores({
            [initialExamId]: {
              korean_name: normalizeSubjectName(student.korean_name),
              korean_raw: s(student.korean_raw),
              korean_std: s(student.korean_std),
              korean_pct: s(student.korean_pct),
              korean_grade: s(student.korean_grade),
              math_name: normalizeSubjectName(student.math_name),
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

      const storedExamIds = Object.keys((student as StudentWithExamScores).exam_scores || {});
      const nextInitialExamSourceId = s(initialExamId || student.exam_id || storedExamIds[0]).trim();
      const nextInitialExamId = getResolvedExamId(nextInitialExamSourceId);
      if (nextInitialExamId) {
        setCurrentExamId(nextInitialExamId);

        // Load score fields from the correct exam's data.
        // student.math_pct etc. at top level come from primaryScore which may be
        // a different exam. Override with the specific exam's scores here.
        const examSpecificScores = findExamScoresFromMap(
          (student as StudentWithExamScores).exam_scores,
          nextInitialExamId
        );
        if (examSpecificScores) {
          setForm((prev) => ({
            ...prev,
            exam_id: nextInitialExamId,
            korean_name: normalizeSubjectName(examSpecificScores.korean_name),
            korean_raw: s(examSpecificScores.korean_raw),
            korean_std: s(examSpecificScores.korean_std),
            korean_pct: s(examSpecificScores.korean_pct),
            korean_grade: s(examSpecificScores.korean_grade),
            math_name: normalizeSubjectName(examSpecificScores.math_name),
            math_raw: s(examSpecificScores.math_raw),
            math_std: s(examSpecificScores.math_std),
            math_pct: s(examSpecificScores.math_pct),
            math_grade: s(examSpecificScores.math_grade),
            english_raw: s(examSpecificScores.english_raw),
            english_grade: s(examSpecificScores.english_grade),
            inquiry1_name: s(examSpecificScores.inquiry1_name),
            inquiry1_raw: s(examSpecificScores.inquiry1_raw),
            inquiry1_std: s(examSpecificScores.inquiry1_std),
            inquiry1_pct: s(examSpecificScores.inquiry1_pct),
            inquiry1_grade: s(examSpecificScores.inquiry1_grade),
            inquiry2_name: s(examSpecificScores.inquiry2_name),
            inquiry2_raw: s(examSpecificScores.inquiry2_raw),
            inquiry2_std: s(examSpecificScores.inquiry2_std),
            inquiry2_pct: s(examSpecificScores.inquiry2_pct),
            inquiry2_grade: s(examSpecificScores.inquiry2_grade),
            history_raw: s(examSpecificScores.history_raw),
            history_grade: s(examSpecificScores.history_grade),
          }));
        } else {
          setForm((prev) => ({ ...prev, exam_id: nextInitialExamId }));
        }

        setHasUnsavedExamChanges(false);
        if (process.env.NODE_ENV !== "production") {
          console.info("[StudentModal] initial exam sync", {
            student_id: s(student.student_id).trim(),
            initialExamId: nextInitialExamSourceId,
            resolvedExamId: nextInitialExamId,
            examSpecificScores,
          });
        }
      }

      const initialPhysicalRecord = physicalRecords.find(
        (record) => s(record.student_id) === s(student.student_id)
      );
      const fallbackPhysicalTestId = s(initialPhysicalRecord?.test_id || physicalTests[0]?.test_id);
      const nextPhysicalTestId = s(selectedPhysicalTestId || fallbackPhysicalTestId);
      setSelectedPhysicalTestId(nextPhysicalTestId);
      loadPhysicalRecord(nextPhysicalTestId);
    }
  }, [branches, initialExamId, initialLoginStatus, isOpen, loadPhysicalRecord, mode, physicalRecords, physicalTests, selectedPhysicalTestId, student]);

  useEffect(() => {
    if (!isOpen) {
      clearSaveNoticeTimer();
      setSaveNotice(null);
      return;
    }

    clearSaveNoticeTimer();
    setSaveNotice(null);
  }, [clearSaveNoticeTimer, currentExamId, isOpen, student?.student_id]);

  useEffect(() => {
    return () => {
      clearSaveNoticeTimer();
    };
  }, [clearSaveNoticeTimer]);

  useEffect(() => {
    if (!isOpen || !leftPanelRef.current) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      restoreExamScrollPosition(currentExamId);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [currentExamId, isOpen, restoreExamScrollPosition]);

  useEffect(() => {
    if (!isOpen || !currentExamId || !hasUnsavedExamChanges) {
      return;
    }

    const studentId = getDraftStudentId();
    const currentExamFields = getCurrentExamFields();
    const timeoutId = window.setTimeout(() => {
      writeExamDraft(studentId, currentExamId, currentExamFields);
    }, EXAM_DRAFT_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [currentExamId, getCurrentExamFields, getDraftStudentId, hasUnsavedExamChanges, isOpen, writeExamDraft]);

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
    setSaveNotice(null);
    if (!form.name || !form.school_name || !form.grade || !form.branch_id) {
      setSaveNotice({ type: "error", message: "이름, 학교, 학년, 지점은 필수입니다." });
      return;
    }

    try {
      clearSaveNoticeTimer();
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

      const currentExamFields = pickExamFields(form);
      const nextExamScores = currentExamId
        ? {
            ...examScores,
            [currentExamId]: {
              ...(examScores[currentExamId] || {}),
              ...currentExamFields,
            },
          }
        : examScores;

      // Add all exam drafts to the payload
      const payloadWithExamScores: StudentWithExamScores = {
        ...payload,
        exam_scores: nextExamScores,
        loginStatus: normalizeLoginStatus(loginStatus),
      };

      const savedStudent = await onSave(payloadWithExamScores);
      if (!savedStudent) {
        setSaveNotice((prev) => prev ?? { type: "error", message: "학생 정보를 저장하지 못했습니다." });
        if (process.env.NODE_ENV !== "production") {
          console.debug("[StudentModal] basic save failed or cancelled", {
            student_id: payload.student_id,
            name: payload.name,
          });
        }
        return;
      }

      const savedStudentContext = {
        student_id: s(savedStudent.student_id).trim(),
        name: s(savedStudent.name).trim(),
        branch_id: s(savedStudent.branch_id).trim(),
      };

      setForm((prev) => ({
        ...prev,
        student_id: savedStudentContext.student_id,
        name: savedStudentContext.name || prev.name,
        branch_id: savedStudentContext.branch_id || prev.branch_id,
      }));

      clearAllExamDrafts(getDraftStudentId());

      let hasSavedExamScores = false;

      // Save all exam scores without intermediate refresh or duplicate success banners.
      if (onSaveExamScores) {
        for (const [examId, scores] of Object.entries(nextExamScores)) {
          if (examId && Object.keys(scores).length > 0) {
            hasSavedExamScores = true;
            await onSaveExamScores(examId, scores, savedStudentContext, {
              skipRefresh: true,
              suppressFeedback: true,
            });
          }
        }
      }

      setExamScores(nextExamScores);
      setHasUnsavedExamChanges(false);
      setSaveNotice({
        type: "success",
        message:
          mode === "add"
            ? "학생을 추가했습니다."
            : hasSavedExamScores
            ? "학생 정보와 성적을 저장했습니다."
            : "학생 정보를 저장했습니다.",
      });
      onClose();
    } catch (error) {
      console.error("Save failed:", error);
      setSaveNotice({
        type: "error",
        message: error instanceof Error ? error.message : "저장 중 오류가 발생했습니다.",
      });
    } finally {
      setSavingExam(false);
    }
  };

  const handleExamSave = async () => {
    if (!currentExamId) {
      return;
    }

    if (!onSaveExamScores) {
      clearSaveNoticeTimer();
      setSaveNotice({ type: "error", message: "시험 성적만 저장하는 기능을 사용할 수 없습니다." });
      return;
    }

    try {
      clearSaveNoticeTimer();
      setSavingExam(true);
      const currentStudentSnapshot = getCurrentStudentSnapshot();

      if (!currentStudentSnapshot.student_id) {
        clearSaveNoticeTimer();
        setSaveNotice({ type: "error", message: "학생 기본 정보를 먼저 저장하세요." });
        return;
      }

      const currentExamFields = pickExamFields(form);
      if (process.env.NODE_ENV !== "production") {
        console.log("[EXAM SAVE] start", {
          student_id: currentStudentSnapshot.student_id,
          branch_id: currentStudentSnapshot.branch_id,
          currentExamId,
          currentExamFields,
          examScores,
          hasOnSaveExamScores: !!onSaveExamScores,
          currentStudentSnapshot,
        });
      }

      const studentWithExamScores = student as StudentWithExamScores | null;
      const existingExamScores = {
        ...(studentWithExamScores?.exam_scores || {}),
        ...examScores,
      };

      const nextExamScores = {
        ...existingExamScores,
        [currentExamId]: {
          ...(existingExamScores[currentExamId] || {}),
          ...currentExamFields,
        },
      };

      setExamScores(nextExamScores);

      const savedExamFields = await onSaveExamScores(currentExamId, currentExamFields, currentStudentSnapshot, {
        suppressFeedback: true,
      });
      const syncedExamFields = pickExamFields(savedExamFields || currentExamFields);
      setExamScores((prev) => ({
        ...prev,
        [currentExamId]: syncedExamFields,
      }));
      setForm((prev) => ({
        ...prev,
        exam_id: currentExamId,
        ...syncedExamFields,
      }));
      if (process.env.NODE_ENV !== "production") {
        console.info("[StudentModal] handleExamSave:success", {
          student_id: currentStudentSnapshot.student_id,
          currentExamId,
        });
      }
      clearExamDraft(getDraftStudentId(), currentExamId);
      setHasUnsavedExamChanges(false);
      showTransientSaveSuccess("시험 성적을 저장했습니다.");
    } catch (error) {
      console.error("Exam save failed:", error);
      clearSaveNoticeTimer();
      setSaveNotice({
        type: "error",
        message: error instanceof Error ? error.message : "시험 성적 저장 중 오류가 발생했습니다.",
      });
    } finally {
      setSavingExam(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modalBox}>
        <div
          ref={leftPanelRef}
          onScroll={handleLeftPanelScroll}
          style={styles.leftPanel}
          className={classes.scoreInputPanel}
        >
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
                <label style={styles.formLabel}>로그인여부</label>
                <select
                  style={styles.formInput}
                  value={loginStatus}
                  onChange={(e) => setLoginStatus(e.target.value)}
                >
                  <option value="active">active</option>
                  <option value="inactive">inactive</option>
                </select>
              </div>
              <div style={styles.formField}>
                <label style={styles.formLabel}>상태</label>
                <select
                  style={styles.formInput}
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  <option value="등록">등록</option>
                  <option value="휴원">휴원</option>
                  <option value="졸업">졸업</option>
                  <option value="퇴원">퇴원</option>
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
              value={currentExamId}
              onChange={(e) => handleExamChange(e.target.value)}
            >
              <option value="">시험 유형 선택</option>
              {examOptions.map((exam) => (
                <option key={exam.examId} value={exam.examId}>
                  {exam.examLabel}
                </option>
              ))}
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
                  <option value="화법과작문">화법과작문</option>
                  <option value="언어와매체">언어와매체</option>
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
                  <option value="확률과통계">확률과통계</option>
                  <option value="미적분">미적분</option>
                  <option value="기하">기하</option>
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

        {renderSectionToggle("physical", "실기테스트")}
        {openSections.physical && (
          <div className={classes.practicalSection}>
            <div style={styles.formFieldWide} className={classes.practicalSelectField}>
              <label style={styles.formLabel}>실기 테스트 선택</label>
              <select
                style={styles.formInput}
                value={selectedPhysicalTestId}
                onChange={(e) => handlePhysicalTestChange(e.target.value)}
              >
                {physicalTests.length === 0 ? (
                  <option value="">실기 테스트 없음</option>
                ) : (
                  <>
                    <option value="">실기 테스트 선택</option>
                    {physicalTests.map((test) => (
                      <option key={s(test.test_id)} value={s(test.test_id)}>
                        {buildPhysicalTestLabel(test)}
                      </option>
                    ))}
                  </>
                )}
              </select>
            </div>
            <div className={classes.practicalItemsGrid}>
              <div style={styles.formField} className={classes.practicalItemCard}>
                <label style={styles.formLabel} className={classes.practicalItemLabel}>배근력</label>
                <input
                  style={styles.formInput}
                  value={physicalForm.back_strength_value}
                  onChange={(e) => handlePhysicalFieldChange("back_strength_value", e.target.value)}
                  placeholder="배근력 측정값"
                />
                <div className={classes.practicalScoreText}>
                  배근력 점수: <span className={getPhysicalRecordDisplayValue(currentPhysicalRecord?.back_strength_score) === "-" ? classes.practicalScoreValueEmpty : classes.practicalScoreValueFilled}>{getPhysicalRecordDisplayValue(currentPhysicalRecord?.back_strength_score)}</span>
                </div>
              </div>
              <div style={styles.formField} className={classes.practicalItemCard}>
                <label style={styles.formLabel} className={classes.practicalItemLabel}>10m 달리기</label>
                <input
                  style={styles.formInput}
                  value={physicalForm.run_10m_value}
                  onChange={(e) => handlePhysicalFieldChange("run_10m_value", e.target.value)}
                  placeholder="10m 달리기 기록"
                />
                <div className={classes.practicalScoreText}>
                  10m 달리기 점수: <span className={getPhysicalRecordDisplayValue(currentPhysicalRecord?.run_10m_score) === "-" ? classes.practicalScoreValueEmpty : classes.practicalScoreValueFilled}>{getPhysicalRecordDisplayValue(currentPhysicalRecord?.run_10m_score)}</span>
                </div>
              </div>
              <div style={styles.formField} className={classes.practicalItemCard}>
                <label style={styles.formLabel} className={classes.practicalItemLabel}>메디신볼</label>
                <input
                  style={styles.formInput}
                  value={physicalForm.medicine_ball_value}
                  onChange={(e) => handlePhysicalFieldChange("medicine_ball_value", e.target.value)}
                  placeholder="메디신볼 거리"
                />
                <div className={classes.practicalScoreText}>
                  메디신볼 점수: <span className={getPhysicalRecordDisplayValue(currentPhysicalRecord?.medicine_ball_score) === "-" ? classes.practicalScoreValueEmpty : classes.practicalScoreValueFilled}>{getPhysicalRecordDisplayValue(currentPhysicalRecord?.medicine_ball_score)}</span>
                </div>
              </div>
              <div style={styles.formField} className={classes.practicalItemCard}>
                <label style={styles.formLabel} className={classes.practicalItemLabel}>좌전굴</label>
                <input
                  style={styles.formInput}
                  value={physicalForm.sit_reach_value}
                  onChange={(e) => handlePhysicalFieldChange("sit_reach_value", e.target.value)}
                  placeholder="좌전굴 거리"
                />
                <div className={classes.practicalScoreText}>
                  좌전굴 점수: <span className={getPhysicalRecordDisplayValue(currentPhysicalRecord?.sit_reach_score) === "-" ? classes.practicalScoreValueEmpty : classes.practicalScoreValueFilled}>{getPhysicalRecordDisplayValue(currentPhysicalRecord?.sit_reach_score)}</span>
                </div>
              </div>
              <div style={styles.formField} className={classes.practicalItemCard}>
                <label style={styles.formLabel} className={classes.practicalItemLabel}>제자리멀리뛰기</label>
                <input
                  style={styles.formInput}
                  value={physicalForm.standing_jump_value}
                  onChange={(e) => handlePhysicalFieldChange("standing_jump_value", e.target.value)}
                  placeholder="제자리멀리뛰기 거리"
                />
                <div className={classes.practicalScoreText}>
                  제자리멀리뛰기 점수: <span className={getPhysicalRecordDisplayValue(currentPhysicalRecord?.standing_jump_score) === "-" ? classes.practicalScoreValueEmpty : classes.practicalScoreValueFilled}>{getPhysicalRecordDisplayValue(currentPhysicalRecord?.standing_jump_score)}</span>
                </div>
              </div>
              <div style={styles.formField} className={classes.practicalItemCard}>
                <label style={styles.formLabel} className={classes.practicalItemLabel}>20m 달리기</label>
                <input
                  style={styles.formInput}
                  value={physicalForm.run_20m_value}
                  onChange={(e) => handlePhysicalFieldChange("run_20m_value", e.target.value)}
                  placeholder="20m 달리기 기록"
                />
                <div className={classes.practicalScoreText}>
                  20m 달리기 점수: <span className={getPhysicalRecordDisplayValue(currentPhysicalRecord?.run_20m_score) === "-" ? classes.practicalScoreValueEmpty : classes.practicalScoreValueFilled}>{getPhysicalRecordDisplayValue(currentPhysicalRecord?.run_20m_score)}</span>
                </div>
              </div>
            </div>
            <div style={styles.formFieldWide} className={classes.practicalSummaryWrap}>
              <div className={classes.practicalSummaryCard}>
                <div style={styles.examDetailRow} className={classes.practicalSummaryRow}>
                  <span className={classes.practicalSummaryLabel}>총점</span>
                  <span className={getPhysicalRecordDisplayValue(currentPhysicalRecord?.total_score) === "-" ? classes.practicalSummaryValueEmpty : classes.practicalSummaryValue}>{getPhysicalRecordDisplayValue(currentPhysicalRecord?.total_score)}</span>
                </div>
                <div style={styles.examDetailRow} className={classes.practicalSummaryRow}>
                  <span className={classes.practicalSummaryLabel}>전체 순위</span>
                  <span className={getPhysicalRecordDisplayValue(currentPhysicalRecord?.rank_no) === "-" ? classes.practicalSummaryValueEmpty : classes.practicalSummaryValue}>{getPhysicalRecordDisplayValue(currentPhysicalRecord?.rank_no)}</span>
                </div>
              </div>
            </div>
            <div style={styles.formFieldWide}>
              <div style={{
                border: "1px solid #dbe7f3",
                borderRadius: 14,
                background: "#ffffff",
                padding: 14,
                boxShadow: "0 10px 22px rgba(15, 23, 42, 0.04)",
              }}>
                <div style={{
                  fontSize: 13,
                  fontWeight: 800,
                  color: "#0f172a",
                  marginBottom: 12,
                }}>
                  실기 총점 변화
                </div>
                {practicalScoreChartData.length === 0 ? (
                  <div style={{
                    padding: "20px 12px",
                    borderRadius: 12,
                    background: "#f8fafc",
                    color: "#64748b",
                    fontSize: 13,
                    textAlign: "center",
                  }}>
                    표시할 실기 총점 기록이 없습니다.
                  </div>
                ) : (
                  <div style={{ width: "100%", height: 220 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={practicalScoreChartData} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
                        <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                        <XAxis dataKey="dateLabel" tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={{ stroke: "#cbd5e1" }} />
                        <YAxis tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={{ stroke: "#cbd5e1" }} allowDecimals={false} />
                        <Tooltip
                          labelFormatter={(
                            _: unknown,
                            payload?: Array<{ payload?: { label?: string; dateLabel?: string } }>
                          ) => {
                            const item = payload?.[0]?.payload;
                            if (!item) {
                              return "";
                            }

                            return `${item.label || "실기 테스트"} / ${item.dateLabel || "날짜 없음"}`;
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="totalScoreValue"
                          name="총점"
                          stroke="#16a34a"
                          strokeWidth={3}
                          dot={{ r: 4, strokeWidth: 2, fill: "#ffffff" }}
                          activeDot={{ r: 6 }}
                          connectNulls={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>
            <div style={styles.formFieldWide} className={classes.practicalHistorySection}>
              <div className={classes.practicalHistoryHeader}>실기 기록 히스토리</div>
              {practicalHistoryItems.length === 0 ? (
                <div className={classes.practicalHistoryEmpty}>실기 기록이 없습니다.</div>
              ) : (
                <div className={classes.practicalHistoryList}>
                  {practicalHistoryItems.map(({ record, testId, label }) => {
                    const totalScore = getPhysicalRecordDisplayValue(record.total_score);
                    const rankNo = getPhysicalRecordDisplayValue(record.rank_no);
                    const updatedAt = getPhysicalRecordDisplayValue(record.updated_at);
                    const isActive = selectedPhysicalTestId === testId;

                    return (
                      <button
                        key={`${testId}-${s(record.updated_at)}`}
                        type="button"
                        className={`${classes.practicalHistoryItem} ${isActive ? classes.practicalHistoryItemActive : ""}`}
                        onClick={() => handlePhysicalTestChange(testId)}
                      >
                        <div className={classes.practicalHistoryItemTop}>
                          <span className={classes.practicalHistoryLabel}>{label}</span>
                          {isActive ? <span className={classes.practicalHistoryBadge}>선택됨</span> : null}
                        </div>
                        <div className={classes.practicalHistoryMeta}>
                          <span>총점 {totalScore}</span>
                          <span>순위 {rankNo}</span>
                          <span>업데이트 {updatedAt}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <div style={styles.formFieldWide} className={classes.practicalSaveWrap}>
              <button
                style={styles.examSaveButton}
                className={classes.practicalSaveButton}
                type="button"
                onClick={handlePhysicalSave}
                disabled={savingPhysical || !selectedPhysicalTestId || !hasUnsavedPhysicalChanges}
              >
                {savingPhysical ? "실기 저장 중..." : hasUnsavedPhysicalChanges ? "실기 기록 저장" : "실기 기록 저장됨"}
              </button>
            </div>
          </div>
        )}

        </div>

        <div style={styles.rightPanel} className={classes.examCardPanel}>
          <div style={styles.examPanelColumn} className={classes.examPanelColumn}>
            {/* Exam Summary Cards */}
            <div style={styles.examSummaryContainer} className={classes.examCardList}>
              {examOptions.map((exam) => (
                <div
                  key={exam.examId}
                  className={`${classes.examCard} ${getExamStatusClassName(exam.examId)} ${getResolvedExamId(exam.examId) === currentExamId ? classes.examCardActive : ""}`}
                  style={{
                    ...styles.examSummaryCard,
                    ...(getResolvedExamId(exam.examId) === currentExamId ? styles.examSummaryCardSelected : {}),
                  }}
                  onClick={() => handleExamSelect(exam.examId)}
                >
                  <div style={styles.examSummaryLabel}>{exam.examLabel}</div>
                  <div style={styles.examSummaryGrades} className={getExamStatusClassName(exam.examId)}>{getExamStatus(exam.examId)}</div>
                  <div style={styles.examSummaryStatus} />
                </div>
              ))}
            </div>

            {/* Selected Exam Detail Section */}
            <div style={styles.examDetailSection}>
              <h4 style={styles.examDetailTitle}>
                {examLabelMap[currentExamId] || currentExamId} - 성적 상세
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

        <div style={styles.modalFooter} className={classes.actionBar}>
          {saveNotice ? (
            <div
              style={{
                ...styles.noticeBox,
                ...(saveNotice.type === "success" ? styles.noticeSuccess : styles.noticeError),
              }}
            >
              {saveNotice.message}
            </div>
          ) : null}
          <button style={styles.secondaryButton} onClick={onClose} disabled={saving}>
            닫기
          </button>
          {currentExamId && hasUnsavedExamChanges && (
            <button
              style={styles.examSaveButton}
              onClick={handleExamSave}
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
    flexWrap: "wrap",
    justifyContent: "flex-end",
    gap: "10px",
    marginTop: "24px",
  },
  noticeBox: {
    flex: "1 1 100%",
    borderRadius: "12px",
    padding: "12px 14px",
    fontSize: "13px",
    fontWeight: 700,
  },
  noticeSuccess: {
    background: "#dcfce7",
    color: "#166534",
    border: "1px solid #86efac",
  },
  noticeError: {
    background: "#fee2e2",
    color: "#991b1b",
    border: "1px solid #fecaca",
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
