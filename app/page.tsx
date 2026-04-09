"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { Student, Branch } from "@/lib/dataService";
import { StudentModal } from "@/components/StudentModal";
import { StudentDetailPanel } from "@/components/StudentDetailPanel";

type SortType =
  | "default"
  | "name"
  | "studentNo"
  | "avgDesc"
  | "koreanDesc"
  | "mathDesc"
  | "englishDesc";

type ModalMode = "add" | "edit";

const CACHE_KEY_PREFIX = "student_cache_v30";
const CACHE_TIME_KEY_PREFIX = "student_cache_time_v30";
const CACHE_DURATION = 2000;
const SCORE_CACHE_KEY = "student_scores_cache_v1";
const PHYSICAL_CACHE_KEY = "student_physical_cache_v1";

function getCacheKey(examId: string) {
  return `${CACHE_KEY_PREFIX}_${examId || "all"}`;
}

function getCacheTimeKey(examId: string) {
  return `${CACHE_TIME_KEY_PREFIX}_${examId || "all"}`;
}

// Helper to extract score fields from a student
function getScoreFields(student: Student) {
  return {
    korean_name: student.korean_name,
    korean_raw: student.korean_raw,
    korean_std: student.korean_std,
    korean_pct: student.korean_pct,
    korean_grade: student.korean_grade,
    math_name: student.math_name,
    math_raw: student.math_raw,
    math_std: student.math_std,
    math_pct: student.math_pct,
    math_grade: student.math_grade,
    english_raw: student.english_raw,
    english_grade: student.english_grade,
    inquiry1_name: student.inquiry1_name,
    inquiry1_raw: student.inquiry1_raw,
    inquiry1_std: student.inquiry1_std,
    inquiry1_pct: student.inquiry1_pct,
    inquiry1_grade: student.inquiry1_grade,
    inquiry2_name: student.inquiry2_name,
    inquiry2_raw: student.inquiry2_raw,
    inquiry2_std: student.inquiry2_std,
    inquiry2_pct: student.inquiry2_pct,
    inquiry2_grade: student.inquiry2_grade,
    history_raw: student.history_raw,
    history_grade: student.history_grade,
  };
}

// Helper to extract physical test fields from a student
function getPhysicalFields(student: Student) {
  return {
    back_strength: student.back_strength,
    run_10m: student.run_10m,
    medicine_ball: student.medicine_ball,
    sit_reach: student.sit_reach,
    standing_jump: student.standing_jump,
    run_20m: student.run_20m,
    physical_total_score: student.physical_total_score,
    physical_memo: student.physical_memo,
  };
}

// Save score data to local cache
function saveScoresToCache(student: Student) {
  try {
    const cache = JSON.parse(localStorage.getItem(SCORE_CACHE_KEY) || "{}") as Record<string, any>;
    cache[s(student.student_id)] = getScoreFields(student);
    localStorage.setItem(SCORE_CACHE_KEY, JSON.stringify(cache));
  } catch {}
}

// Save physical test data to local cache
function savePhysicalToCache(student: Student) {
  try {
    const cache = JSON.parse(localStorage.getItem(PHYSICAL_CACHE_KEY) || "{}") as Record<string, any>;
    cache[s(student.student_id)] = getPhysicalFields(student);
    localStorage.setItem(PHYSICAL_CACHE_KEY, JSON.stringify(cache));
  } catch {}
}

// Merge cached scores into student data
function mergeScoresFromCache(students: Student[]): Student[] {
  try {
    const scoreCache = JSON.parse(localStorage.getItem(SCORE_CACHE_KEY) || "{}") as Record<string, any>;
    const physicalCache = JSON.parse(localStorage.getItem(PHYSICAL_CACHE_KEY) || "{}") as Record<string, any>;
    return students.map((st) => {
      let merged = { ...st };
      
      // Merge academic scores
      const scores = scoreCache[s(st.student_id)];
      if (scores) {
        Object.keys(scores).forEach((key) => {
          const apiValue = merged[key as keyof Student];
          if (apiValue === undefined || apiValue === null || apiValue === "") {
            (merged as any)[key] = scores[key];
          }
        });
      }
      
      // Merge physical records
      const physical = physicalCache[s(st.student_id)];
      if (physical) {
        Object.keys(physical).forEach((key) => {
          const apiValue = merged[key as keyof Student];
          if (apiValue === undefined || apiValue === null || apiValue === "") {
            (merged as any)[key] = physical[key];
          }
        });
      }
      
      return merged;
    });
  } catch {
    return students;
  }
}

function s(value: unknown) {
  return String(value ?? "");
}

function getScoreNumber(value: string | number | undefined) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function getAverageNumber(student: Student) {
  const scores = [
    getScoreNumber(student.korean_raw),
    getScoreNumber(student.math_raw),
    getScoreNumber(student.english_raw),
    getScoreNumber(student.inquiry1_raw),
    getScoreNumber(student.inquiry2_raw),
  ].filter((v) => v > 0);

  if (scores.length === 0) return 0;
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

function getStatusStyle(status: string | undefined): React.CSSProperties {
  if ((status || "").toLowerCase() === "active") {
    return { background: "#dcfce7", color: "#166534" };
  }
  return { background: "#e5e7eb", color: "#374151" };
}

function getGradeBadgeStyle(grade: string | number | undefined): React.CSSProperties {
  const g = Number(grade || 0);
  if (g === 1 || g === 2) return { background: "#dcfce7", color: "#166534" };
  if (g === 3 || g === 4) return { background: "#dbeafe", color: "#1d4ed8" };
  if (g === 5 || g === 6) return { background: "#fef3c7", color: "#92400e" };
  return { background: "#fee2e2", color: "#b91c1c" };
}

function getBarWidth(value: string | number | undefined) {
  const score = getScoreNumber(value);
  return `${Math.max(0, Math.min(100, score))}%`;
}

async function safeJson(res: Response) {
  const text = await res.text();
  if (!text || !text.trim()) {
    return { ok: false, error: "서버 응답이 비어 있습니다." };
  }
  try {
    return JSON.parse(text);
  } catch {
    return { ok: false, error: `JSON이 아닌 응답입니다: ${text}` };
  }
}

function csvEscape(value: unknown) {
  const str = String(value ?? "");
  if (str.includes('"') || str.includes(",") || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export default function Home() {
  const [students, setStudents] = useState<Student[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortType, setSortType] = useState<SortType>("default");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailPopupOpen, setIsDetailPopupOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("add");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 200);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const getBranchLabel = (branchId: string | undefined) => {
    const found = branches.find((b) => s(b.branch_id) === s(branchId));
    return found ? s(found.branch_name) : branchId || "-";
  };

  const clearStudentCache = () => {
    try {
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith(CACHE_KEY_PREFIX) || key.startsWith(CACHE_TIME_KEY_PREFIX)) {
          localStorage.removeItem(key);
        }
      });
    } catch {}
  };

  const loadBranches = async () => {
    try {
      const res = await fetch(`/api/branches?_ts=${Date.now()}`, {
        method: "GET",
        cache: "no-store",
      });
      const result = await safeJson(res);
      if (!res.ok || !result.ok) {
        setBranches([]);
        return;
      }
      setBranches(Array.isArray(result.branches) ? result.branches : []);
    } catch {
      setBranches([]);
    }
  };

  const loadStudents = async (force = false, focusStudentId?: string) => {
    setLoading(true);

    const cacheKey = getCacheKey("");
    const cacheTimeKey = getCacheTimeKey("");

    if (!force) {
      try {
        const cachedData = localStorage.getItem(cacheKey);
        const cachedTime = localStorage.getItem(cacheTimeKey);
        if (cachedData && cachedTime && Date.now() - Number(cachedTime) < CACHE_DURATION) {
          const parsed = JSON.parse(cachedData) as Student[];
          const withScores = mergeScoresFromCache(parsed);
          setStudents(withScores);
          setSelectedStudentId((prev) => {
            if (focusStudentId && withScores.some((st) => s(st.student_id) === s(focusStudentId))) return focusStudentId;
            if (prev && withScores.some((st) => s(st.student_id) === s(prev))) return prev;
            return withScores[0]?.student_id ? s(withScores[0].student_id) : null;
          });
          setLoading(false);
          return;
        }
      } catch {}
    }

    try {
      const res = await fetch(`/api/students?_ts=${Date.now()}`, {
        method: "GET",
        cache: "no-store",
      });
      const result = await safeJson(res);
      const studentData = Array.isArray(result.students)
        ? result.students
        : Array.isArray(result.data)
        ? result.data
        : result.data && Array.isArray(result.data.students)
        ? result.data.students
        : [];

      if (!res.ok || (result.ok === false && studentData.length === 0)) {
        setStudents([]);
        setSelectedStudentId(null);
        return;
      }

      let data = studentData;
      // Merge scores from cache into API data
      data = mergeScoresFromCache(data);
      
      try {
        localStorage.setItem(cacheKey, JSON.stringify(data));
        localStorage.setItem(cacheTimeKey, String(Date.now()));
      } catch {}

      setStudents(data);
      setSelectedStudentId((prev) => {
        if (focusStudentId && data.some((st: Student) => s(st.student_id) === s(focusStudentId))) return focusStudentId;
        if (prev && data.some((st: Student) => s(st.student_id) === s(prev))) return prev;
        return data[0]?.student_id ? s(data[0].student_id) : null;
      });
    } catch {
      setStudents([]);
      setSelectedStudentId(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBranches();
    loadStudents(true);
  }, []);

  const selectedStudent = useMemo(
    () => students.find((st) => s(st.student_id) === s(selectedStudentId)) || null,
    [students, selectedStudentId]
  );

  const branchOptions = useMemo(
    () => ["ALL", ...branches.map((b) => s(b.branch_id)).filter(Boolean)],
    [branches]
  );

  const filteredStudents = useMemo(() => {
    const keyword = search.trim();

    const filtered = students.filter((st) => {
      const matchesSearch =
        keyword === "" ||
        s(st.name).includes(keyword) ||
        s(st.school_name).includes(keyword) ||
        s(st.student_no).includes(keyword);

      const matchesBranch = branchFilter === "ALL" || s(st.branch_id) === branchFilter;
      const matchesStatus = statusFilter === "ALL" || s(st.status) === statusFilter;
      return matchesSearch && matchesBranch && matchesStatus;
    });

    const sorted = [...filtered];
    switch (sortType) {
      case "name":
        sorted.sort((a, b) => s(a.name).localeCompare(s(b.name), "ko"));
        break;
      case "studentNo":
        sorted.sort((a, b) => s(a.student_no).localeCompare(s(b.student_no), "ko"));
        break;
      case "avgDesc":
        sorted.sort((a, b) => getAverageNumber(b) - getAverageNumber(a));
        break;
      case "koreanDesc":
        sorted.sort((a, b) => getScoreNumber(b.korean_raw) - getScoreNumber(a.korean_raw));
        break;
      case "mathDesc":
        sorted.sort((a, b) => getScoreNumber(b.math_raw) - getScoreNumber(a.math_raw));
        break;
      case "englishDesc":
        sorted.sort((a, b) => getScoreNumber(b.english_raw) - getScoreNumber(a.english_raw));
        break;
      default:
        break;
    }
    return sorted;
  }, [students, search, branchFilter, statusFilter, sortType]);

  useEffect(() => {
    if (!selectedStudentId && filteredStudents.length > 0) {
      setSelectedStudentId(s(filteredStudents[0].student_id));
      return;
    }
    if (
      selectedStudentId &&
      !filteredStudents.some((st) => s(st.student_id) === s(selectedStudentId))
    ) {
      setSelectedStudentId(filteredStudents[0]?.student_id ? s(filteredStudents[0].student_id) : null);
    }
  }, [filteredStudents, selectedStudentId]);

  const summary = useMemo(() => {
    if (filteredStudents.length === 0) return { count: 0, avgScore: "0.0", topAvg: "0.0", activeCount: 0 };
    const avgScore =
      filteredStudents.reduce((acc, cur) => acc + getAverageNumber(cur), 0) / filteredStudents.length;
    const topAvg = Math.max(...filteredStudents.map((st) => getAverageNumber(st)));
    const activeCount = filteredStudents.filter((st) => s(st.status).toLowerCase() === "active").length;
    return {
      count: filteredStudents.length,
      avgScore: avgScore.toFixed(1),
      topAvg: topAvg.toFixed(1),
      activeCount,
    };
  }, [filteredStudents]);

  const quickStats = useMemo(() => {
    const avg80 = filteredStudents.filter((st) => getAverageNumber(st) >= 80).length;
    const koreanTop = filteredStudents.filter((st) => {
      const g = Number(st.korean_grade || 0);
      return g === 1 || g === 2;
    }).length;
    const mathTop = filteredStudents.filter((st) => {
      const g = Number(st.math_grade || 0);
      return g === 1 || g === 2;
    }).length;
    const active = filteredStudents.filter((st) => s(st.status).toLowerCase() === "active").length;
    return { avg80, koreanTop, mathTop, active };
  }, [filteredStudents]);

  const branchStats = useMemo(() => {
    return branches.map((branch) => {
      const studentsInBranch = students.filter((st) => s(st.branch_id) === s(branch.branch_id));
      const count = studentsInBranch.length;
      const avg = count === 0 ? 0 : studentsInBranch.reduce((acc, cur) => acc + getAverageNumber(cur), 0) / count;
      return {
        branch_id: s(branch.branch_id),
        branch_name: s(branch.branch_name),
        count,
        avg: avg.toFixed(1),
      };
    });
  }, [branches, students]);

  const subjectStats = useMemo(() => {
    const avgOf = (key: keyof Student) => {
      const values = students
        .map((st) => {
          const rawValue = st[key];
          return getScoreNumber(rawValue as string | number | undefined);
        })
        .filter((v) => v > 0);
      if (values.length === 0) return "0.0";
      return (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1);
    };
    return {
      korean: avgOf("korean_raw"),
      math: avgOf("math_raw"),
      english: avgOf("english_raw"),
      inquiry1: avgOf("inquiry1_raw"),
      inquiry2: avgOf("inquiry2_raw"),
      history: avgOf("history_raw"),
    };
  }, [students]);

  const topStudents = useMemo(
    () => {
      // Sort all students by average (including those with 0 average) and take top 5
      const sorted = [...students].sort((a, b) => getAverageNumber(b) - getAverageNumber(a));
      // Filter to only include students with at least one score
      return sorted.filter((st) => getAverageNumber(st) > 0).slice(0, 5);
    },
    [students]
  );

  const selectedAverage = selectedStudent ? getAverageNumber(selectedStudent).toFixed(1) : "-";

  const selectedIndex = useMemo(
    () => filteredStudents.findIndex((st) => s(st.student_id) === s(selectedStudentId)),
    [filteredStudents, selectedStudentId]
  );

  const moveSelection = (direction: "prev" | "next") => {
    if (filteredStudents.length === 0) return;
    if (selectedIndex === -1) {
      setSelectedStudentId(s(filteredStudents[0].student_id));
      return;
    }
    const nextIndex =
      direction === "prev"
        ? Math.max(0, selectedIndex - 1)
        : Math.min(filteredStudents.length - 1, selectedIndex + 1);
    setSelectedStudentId(s(filteredStudents[nextIndex].student_id));
  };

  const openAddModal = () => {
    setModalMode("add");
    setIsModalOpen(true);
  };

  const openEditModal = () => {
    if (!selectedStudent) {
      alert("수정할 학생을 먼저 선택하세요.");
      return;
    }
    setModalMode("edit");
    setIsModalOpen(true);
  };

  const handleModalSave = async (student: Student) => {
    // Validation
    if (!student.name || !student.school_name || !student.grade || !student.branch_id || !student.exam_id) {
      alert("이름, 학교, 학년, 지점, 시험 유형은 필수입니다.");
      return;
    }

    try {
      setSaving(true);
      const method = modalMode === "add" ? "POST" : "PUT";
      const res = await fetch("/api/students", {
        method,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
        },
        body: JSON.stringify(student),
      });
      const result = await safeJson(res);

      if (!res.ok || !result.ok) {
        alert(result.error || "저장에 실패했습니다.");
        return;
      }

      setIsModalOpen(false);
      clearStudentCache();

      // Immediately update the students array and select the new student
      if (modalMode === "add") {
        // For new students, use the returned student data if available, otherwise use sent data
        const newStudent = result.student || {
          ...student,
          student_id: result.student_id || student.student_id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        // Save scores and physical records to cache for persistence
        saveScoresToCache(newStudent);
        savePhysicalToCache(newStudent);
        setStudents(prev => [...prev, newStudent]);
        setSelectedStudentId(s(newStudent.student_id));
      } else {
        // For updates, use the returned student data if available, otherwise use sent data
        const updatedStudent = result.student || {
          ...student,
          updated_at: new Date().toISOString()
        };
        // Save scores and physical records to cache for persistence
        saveScoresToCache(updatedStudent);
        savePhysicalToCache(updatedStudent);
        setStudents(prev => prev.map(st =>
          s(st.student_id) === s(student.student_id) ? updatedStudent : st
        ));
        // Keep the same selected student
      }

      // Data is already updated with the response from save operation
    } catch (error) {
      console.error(error);
      alert("저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedStudent) {
      alert("삭제할 학생을 먼저 선택하세요.");
      return;
    }
    const ok = confirm(`${s(selectedStudent.name)} 학생을 삭제할까요?`);
    if (!ok) return;

    try {
      setSaving(true);
      const res = await fetch("/api/students", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
        },
        body: JSON.stringify({
          student_id: s(selectedStudent.student_id),
        }),
      });
      const result = await safeJson(res);

      if (!res.ok || !result.ok) {
        alert(result.error || "삭제에 실패했습니다.");
        return;
      }

      clearStudentCache();
      // Also clear from score and physical caches
      try {
        const scoreCache = JSON.parse(localStorage.getItem(SCORE_CACHE_KEY) || "{}") as Record<string, any>;
        delete scoreCache[s(selectedStudent.student_id)];
        localStorage.setItem(SCORE_CACHE_KEY, JSON.stringify(scoreCache));
      } catch {}
      try {
        const physicalCache = JSON.parse(localStorage.getItem(PHYSICAL_CACHE_KEY) || "{}") as Record<string, any>;
        delete physicalCache[s(selectedStudent.student_id)];
        localStorage.setItem(PHYSICAL_CACHE_KEY, JSON.stringify(physicalCache));
      } catch {}
      
      await new Promise((resolve) => setTimeout(resolve, 500));
      await loadStudents(true);
      setIsDetailPopupOpen(false);
    } catch (error) {
      console.error(error);
      alert("삭제 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const downloadCsv = (rows: Student[], filename: string) => {
    const headers = [
      "student_id",
      "student_no",
      "name",
      "branch_name",
      "school_name",
      "grade",
      "class_name",
      "phone",
      "parent_phone",
      "status",
      "korean_name",
      "korean_raw",
      "korean_std",
      "korean_pct",
      "korean_grade",
      "math_name",
      "math_raw",
      "math_std",
      "math_pct",
      "math_grade",
      "english_raw",
      "english_grade",
      "inquiry1_name",
      "inquiry1_raw",
      "inquiry1_std",
      "inquiry1_pct",
      "inquiry1_grade",
      "inquiry2_name",
      "inquiry2_raw",
      "inquiry2_std",
      "inquiry2_pct",
      "inquiry2_grade",
      "history_raw",
      "history_grade",
      "average",
    ];

    const lines = [
      headers.join(","),
      ...rows.map((st) =>
        [
          st.student_id,
          st.student_no,
          st.name,
          getBranchLabel(s(st.branch_id)),
          st.school_name,
          st.grade,
          st.class_name,
          st.phone,
          st.parent_phone,
          st.status,
          st.korean_name,
          st.korean_raw,
          st.korean_std,
          st.korean_pct,
          st.korean_grade,
          st.math_name,
          st.math_raw,
          st.math_std,
          st.math_pct,
          st.math_grade,
          st.english_raw,
          st.english_grade,
          st.inquiry1_name,
          st.inquiry1_raw,
          st.inquiry1_std,
          st.inquiry1_pct,
          st.inquiry1_grade,
          st.inquiry2_name,
          st.inquiry2_raw,
          st.inquiry2_std,
          st.inquiry2_pct,
          st.inquiry2_grade,
          st.history_raw,
          st.history_grade,
          getAverageNumber(st).toFixed(1),
        ]
          .map(csvEscape)
          .join(",")
      ),
    ];

    const blob = new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportAllCsv = () => {
    downloadCsv(filteredStudents, "students_filtered.csv");
  };

  const handleExportBranchCsv = () => {
    const filename =
      branchFilter === "ALL"
        ? "students_all_branches.csv"
        : `students_${getBranchLabel(branchFilter)}.csv`;
    downloadCsv(filteredStudents, filename);
  };

  const handlePrint = () => {
    window.print();
  };

  const handlePrintSelected = () => {
    if (!selectedStudent) {
      alert("학생을 먼저 선택하세요.");
      return;
    }
    const printWindow = window.open("", "_blank", "width=900,height=1000");
    if (!printWindow) return;

    const html = `
      <html>
        <head>
          <title>${s(selectedStudent.name)} 학생 출력</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #111827; }
            h1 { margin-bottom: 8px; }
            h2 { margin-top: 28px; margin-bottom: 12px; }
            .box { border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; margin-bottom: 14px; }
            .row { display:flex; justify-content:space-between; gap:16px; padding:6px 0; border-bottom:1px solid #f3f4f6; }
            .row:last-child { border-bottom:none; }
          </style>
        </head>
        <body>
          <h1>${s(selectedStudent.name)}</h1>
          <div>${s(selectedStudent.school_name)} / ${s(selectedStudent.grade)}학년 / ${getBranchLabel(s(selectedStudent.branch_id))}</div>

          <h2>기본 정보</h2>
          <div class="box">
            <div class="row"><span>학번</span><span>${s(selectedStudent.student_no)}</span></div>
            <div class="row"><span>성별</span><span>${s(selectedStudent.gender)}</span></div>
            <div class="row"><span>생년월일</span><span>${s(selectedStudent.birth_date)}</span></div>
            <div class="row"><span>연락처</span><span>${s(selectedStudent.phone)}</span></div>
            <div class="row"><span>학부모연락처</span><span>${s(selectedStudent.parent_phone)}</span></div>
            <div class="row"><span>상태</span><span>${s(selectedStudent.status)}</span></div>
            <div class="row"><span>평균</span><span>${getAverageNumber(selectedStudent).toFixed(1)}</span></div>
          </div>

          <h2>성적</h2>
          <div class="box">
            <div class="row"><span>국어</span><span>${s(selectedStudent.korean_raw)} / ${s(selectedStudent.korean_grade)}등급</span></div>
            <div class="row"><span>수학</span><span>${s(selectedStudent.math_raw)} / ${s(selectedStudent.math_grade)}등급</span></div>
            <div class="row"><span>영어</span><span>${s(selectedStudent.english_raw)} / ${s(selectedStudent.english_grade)}등급</span></div>
            <div class="row"><span>탐구1</span><span>${s(selectedStudent.inquiry1_raw)} / ${s(selectedStudent.inquiry1_grade)}등급</span></div>
            <div class="row"><span>탐구2</span><span>${s(selectedStudent.inquiry2_raw)} / ${s(selectedStudent.inquiry2_grade)}등급</span></div>
            <div class="row"><span>한국사</span><span>${s(selectedStudent.history_raw)} / ${s(selectedStudent.history_grade)}등급</span></div>
          </div>

          <h2>메모</h2>
          <div class="box">${s(selectedStudent.memo) || "-"}</div>
        </body>
      </html>
    `;
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <header style={styles.header}>
          <div>
            <p style={styles.badge}>FINAL 관리자 시스템</p>
            <h1 style={styles.title}>학생 성적 대시보드</h1>
            <p style={styles.subtitle}>지점, 학생정보, 성적, 평균, 통계를 한 화면에서 관리합니다.</p>
          </div>
          <div style={styles.headerActions}>
            <a href="/branches" style={styles.navLink}>
              지점 관리 →
            </a>
          </div>
        </header>

        <section style={styles.summaryGrid}>
          <div style={styles.summaryCard}>
            <span style={styles.summaryLabel}>표시 학생 수</span>
            <strong style={styles.summaryValue}>{summary.count}명</strong>
          </div>
          <div style={styles.summaryCard}>
            <span style={styles.summaryLabel}>활성 학생 수</span>
            <strong style={styles.summaryValue}>{summary.activeCount}명</strong>
          </div>
          <div style={styles.summaryCard}>
            <span style={styles.summaryLabel}>전체 평균</span>
            <strong style={styles.summaryValue}>{summary.avgScore}</strong>
          </div>
          <div style={styles.summaryCard}>
            <span style={styles.summaryLabel}>최고 평균</span>
            <strong style={styles.summaryValue}>{summary.topAvg}</strong>
          </div>
        </section>

        <section style={styles.quickStatsWrap}>
          <div style={styles.quickChip}>평균 80↑ {quickStats.avg80}명</div>
          <div style={styles.quickChip}>국어 1~2등급 {quickStats.koreanTop}명</div>
          <div style={styles.quickChip}>수학 1~2등급 {quickStats.mathTop}명</div>
          <div style={styles.quickChip}>활성 학생 {quickStats.active}명</div>
        </section>

        <section style={styles.statsSection}>
          <div style={styles.statsCard}>
            <h3 style={styles.statsTitle}>지점별 현황</h3>
            {branchStats.length === 0 ? (
              <div style={styles.stateBox}>지점 데이터가 없습니다.</div>
            ) : (
              branchStats.map((item) => (
                <div key={item.branch_id} style={styles.statsRow}>
                  <span>{item.branch_name}</span>
                  <span>{item.count}명 / 평균 {item.avg}</span>
                </div>
              ))
            )}
          </div>

          <div style={styles.statsCard}>
            <h3 style={styles.statsTitle}>과목별 평균</h3>
            <div style={styles.statsRow}><span>국어</span><span>{subjectStats.korean}</span></div>
            <div style={styles.statsRow}><span>수학</span><span>{subjectStats.math}</span></div>
            <div style={styles.statsRow}><span>영어</span><span>{subjectStats.english}</span></div>
            <div style={styles.statsRow}><span>탐구1</span><span>{subjectStats.inquiry1}</span></div>
            <div style={styles.statsRow}><span>탐구2</span><span>{subjectStats.inquiry2}</span></div>
            <div style={styles.statsRow}><span>한국사</span><span>{subjectStats.history}</span></div>
          </div>

          <div style={styles.statsCard}>
            <h3 style={styles.statsTitle}>상위 평균 학생 TOP 5</h3>
            {topStudents.length === 0 ? (
              <div style={styles.stateBox}>학생 데이터가 없습니다.</div>
            ) : (
              topStudents.map((st, idx) => (
                <div key={s(st.student_id)} style={styles.statsRow}>
                  <span>{idx + 1}. {s(st.name)}</span>
                  <span>{getAverageNumber(st).toFixed(1)}</span>
                </div>
              ))
            )}
          </div>
        </section>

        <section style={styles.chartGrid}>
          <div style={styles.chartPanel}>
            <h3 style={styles.chartPanelTitle}>지점별 평균 차트</h3>
            {branchStats.length === 0 ? (
              <div style={styles.stateBox}>차트 데이터가 없습니다.</div>
            ) : (
              branchStats.map((item) => (
                <div key={item.branch_id} style={styles.branchChartRow}>
                  <div style={styles.branchChartLabel}>
                    <span>{item.branch_name}</span>
                    <span>{item.avg}</span>
                  </div>
                  <div style={styles.branchChartTrack}>
                    <div
                      style={{
                        ...styles.branchChartBar,
                        width: `${Math.max(0, Math.min(100, Number(item.avg)))}%`,
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section style={styles.filterBar}>
          <input
            type="text"
            placeholder="이름 / 학교 / 학번 검색"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            style={styles.searchInput}
          />

          <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)} style={styles.select}>
            {branchOptions.map((branch) => (
              <option key={branch} value={branch}>
                {branch === "ALL" ? "전체 지점" : getBranchLabel(branch)}
              </option>
            ))}
          </select>

          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={styles.select}>
            <option value="ALL">전체 상태</option>
            <option value="active">active</option>
            <option value="inactive">inactive</option>
          </select>

          <select value={sortType} onChange={(e) => setSortType(e.target.value as SortType)} style={styles.select}>
            <option value="default">기본순</option>
            <option value="name">이름순</option>
            <option value="studentNo">학번순</option>
            <option value="avgDesc">평균 높은순</option>
            <option value="koreanDesc">국어 높은순</option>
            <option value="mathDesc">수학 높은순</option>
            <option value="englishDesc">영어 높은순</option>
          </select>
        </section>

        {selectedStudent && (
          <section style={styles.chartSection}>
            <div style={styles.chartHeader}>
              <h3 style={styles.chartTitle}>선택 학생 성적 그래프</h3>
              <p style={styles.chartDesc}>{s(selectedStudent.name)} 학생의 주요 과목 점수</p>
            </div>

            <div style={styles.chartCard}>
              {[
                ["국어", selectedStudent.korean_raw, styles.koreanBar],
                ["수학", selectedStudent.math_raw, styles.mathBar],
                ["영어", selectedStudent.english_raw, styles.englishBar],
                ["탐구1", selectedStudent.inquiry1_raw, styles.koreanBar],
                ["탐구2", selectedStudent.inquiry2_raw, styles.mathBar],
              ].map(([label, value, barStyle]) => (
                <div key={String(label)} style={styles.chartRow}>
                  <div style={styles.chartLabelWrap}>
                    <span style={styles.chartLabel}>{String(label)}</span>
                    <span style={styles.chartValue}>{s(value) || "-"}</span>
                  </div>
                  <div style={styles.chartTrack}>
                    <div
                      style={{
                        ...styles.chartBar,
                        ...(barStyle as React.CSSProperties),
                        width: getBarWidth(value as string | number | undefined),
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section style={styles.contentGrid}>
          <div style={styles.leftPanel}>
            <div style={styles.stickyActionBar}>
              <div style={styles.selectedStudentChip}>
                <span style={styles.selectedStudentLabel}>선택학생</span>
                <strong style={styles.selectedStudentText}>
                  {selectedStudent ? s(selectedStudent.name) : "학생을 선택하세요"}
                </strong>
              </div>

              <div style={styles.buttonGroup}>
                <button style={styles.navButton} onClick={() => moveSelection("prev")} disabled={filteredStudents.length === 0 || selectedIndex <= 0}>
                  이전
                </button>
                <button
                  style={styles.navButton}
                  onClick={() => moveSelection("next")}
                  disabled={filteredStudents.length === 0 || selectedIndex === -1 || selectedIndex >= filteredStudents.length - 1}
                >
                  다음
                </button>
                <button style={styles.navButton} onClick={() => selectedStudent && setIsDetailPopupOpen(true)} disabled={!selectedStudent}>
                  상세보기
                </button>
                <button style={styles.navButton} onClick={handleExportAllCsv}>
                  CSV
                </button>
                <button style={styles.navButton} onClick={handleExportBranchCsv}>
                  지점 CSV
                </button>
                <button style={styles.navButton} onClick={handlePrint}>
                  목록 인쇄
                </button>
                <button style={styles.navButton} onClick={handlePrintSelected} disabled={!selectedStudent}>
                  학생 인쇄
                </button>
                <button style={styles.editButton} onClick={openEditModal}>수정</button>
                <button style={styles.deleteButton} onClick={handleDelete}>삭제</button>
                <button style={styles.addButton} onClick={openAddModal}>+ 학생 추가</button>
              </div>
            </div>

            <div style={styles.panelHeader}>
              <div>
                <h3 style={styles.panelTitle}>학생 목록</h3>
                <p style={styles.panelDesc}>검색, 지점, 상태, 평균 정렬이 적용된 결과입니다.</p>
              </div>
            </div>

            <div style={styles.tableWrap}>
              {loading ? (
                <div style={styles.stateBox}>데이터를 불러오는 중입니다...</div>
              ) : filteredStudents.length === 0 ? (
                <div style={styles.stateBox}>검색 결과가 없습니다.</div>
              ) : (
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>이름</th>
                      <th style={styles.th}>학번</th>
                      <th style={styles.th}>지점</th>
                      <th style={styles.th}>학교</th>
                      <th style={styles.th}>학년</th>
                      <th style={styles.th}>상태</th>
                      <th style={styles.th}>평균</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((st) => {
                      const isSelected = s(selectedStudentId) === s(st.student_id);

                      return (
                        <tr
                          key={s(st.student_id)}
                          onClick={() => setSelectedStudentId(s(st.student_id))}
                          onDoubleClick={() => {
                            setSelectedStudentId(s(st.student_id));
                            setIsDetailPopupOpen(true);
                          }}
                          style={{ ...styles.row, ...(isSelected ? styles.selectedRow : {}) }}
                        >
                          <td style={styles.tdStrong}>{s(st.name)}</td>
                          <td style={styles.td}>{s(st.student_no) || "-"}</td>
                          <td style={styles.td}>{getBranchLabel(s(st.branch_id))}</td>
                          <td style={styles.td}>{s(st.school_name)}</td>
                          <td style={styles.td}>{s(st.grade)}</td>
                          <td style={styles.td}>
                            <span style={{ ...styles.gradeBadge, ...getStatusStyle(s(st.status)) }}>
                              {s(st.status) || "-"}
                            </span>
                          </td>
                          <td style={styles.td}>{getAverageNumber(st).toFixed(1)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div style={styles.detailCard}>
            {selectedStudent ? (
              <StudentDetailPanel
                student={selectedStudent}
                branches={branches}
                onEdit={openEditModal}
                onDelete={handleDelete}
                onShowDetail={() => setIsDetailPopupOpen(true)}
                getAverageNumber={getAverageNumber}
                getGradeBadgeStyle={getGradeBadgeStyle}
                getBranchLabel={getBranchLabel}
                s={s}
              />
            ) : (
              <div style={styles.stateBox}>학생을 선택하세요.</div>
            )}
          </div>
        </section>
      </div>

      {isDetailPopupOpen && selectedStudent && (
        <div style={styles.modalOverlay}>
          <div style={styles.detailPopupBox}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>학생 상세 보기</h3>
              <button style={styles.closeButton} onClick={() => setIsDetailPopupOpen(false)}>✕</button>
            </div>
            <StudentDetailPanel
              student={selectedStudent}
              branches={branches}
              onEdit={() => {
                setIsDetailPopupOpen(false);
                openEditModal();
              }}
              onDelete={handleDelete}
              onShowDetail={() => {}} // Already in detail view
              getAverageNumber={getAverageNumber}
              getGradeBadgeStyle={getGradeBadgeStyle}
              getBranchLabel={getBranchLabel}
              s={s}
            />
            <div style={styles.modalFooter}>
              <button style={styles.secondaryButton} onClick={() => setIsDetailPopupOpen(false)}>
                닫기
              </button>
              <button style={styles.navButton} onClick={handlePrintSelected}>
                학생 인쇄
              </button>
            </div>
          </div>
        </div>
      )}

      <StudentModal
        isOpen={isModalOpen}
        mode={modalMode}
        student={modalMode === "edit" ? selectedStudent : null}
        branches={branches}
        saving={saving}
        onClose={() => setIsModalOpen(false)}
        onSave={handleModalSave}
      />
    </main>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(180deg, #edf3f9 0%, #e8eff7 100%)",
    padding: "32px 20px 40px",
    fontFamily: "Arial, sans-serif",
  },
  container: {
    maxWidth: "1440px",
    margin: "0 auto",
  },
  header: {
    marginBottom: "20px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "20px",
  },
  navLink: {
    padding: "12px 16px",
    background: "#0f766e",
    color: "#ffffff",
    textDecoration: "none",
    borderRadius: "12px",
    fontSize: "14px",
    fontWeight: 700,
    whiteSpace: "nowrap",
  },
  headerActions: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: "12px",
  },
  examSelector: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  examLabel: {
    fontSize: "14px",
    fontWeight: 600,
    color: "#374151",
  },
  examSelect: {
    padding: "8px 12px",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    fontSize: "14px",
    background: "#ffffff",
    minWidth: "200px",
  },
  badge: {
    display: "inline-block",
    padding: "7px 12px",
    borderRadius: "999px",
    background: "#dbeafe",
    color: "#1d4ed8",
    fontSize: "12px",
    fontWeight: 700,
    marginBottom: "12px",
  },
  title: {
    margin: "0 0 10px 0",
    fontSize: "42px",
    fontWeight: 900,
    color: "#0f172a",
    letterSpacing: "-0.5px",
  },
  subtitle: {
    margin: 0,
    color: "#64748b",
    fontSize: "15px",
    lineHeight: 1.6,
  },
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "16px",
    marginBottom: "20px",
  },
  summaryCard: {
    background: "#ffffff",
    borderRadius: "18px",
    padding: "18px 20px",
    boxShadow: "0 10px 24px rgba(15, 23, 42, 0.05)",
    border: "1px solid #eef2f7",
  },
  summaryLabel: {
    display: "block",
    fontSize: "13px",
    color: "#64748b",
    marginBottom: "10px",
  },
  summaryValue: {
    fontSize: "30px",
    fontWeight: 900,
    color: "#0f172a",
  },
  quickStatsWrap: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    marginBottom: "20px",
  },
  quickChip: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    boxShadow: "0 8px 20px rgba(15,23,42,0.04)",
    color: "#0f172a",
    borderRadius: "999px",
    padding: "10px 14px",
    fontSize: "13px",
    fontWeight: 800,
  },
  statsSection: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "16px",
    marginBottom: "20px",
  },
  statsCard: {
    background: "#ffffff",
    borderRadius: "18px",
    padding: "18px 20px",
    boxShadow: "0 10px 24px rgba(15, 23, 42, 0.05)",
    border: "1px solid #eef2f7",
  },
  statsTitle: {
    margin: "0 0 14px 0",
    fontSize: "18px",
    fontWeight: 900,
    color: "#0f172a",
  },
  statsRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    padding: "8px 0",
    borderBottom: "1px solid #f1f5f9",
    fontSize: "14px",
    color: "#334155",
  },
  chartGrid: {
    marginBottom: "20px",
  },
  chartPanel: {
    background: "#ffffff",
    borderRadius: "18px",
    padding: "18px 20px",
    boxShadow: "0 10px 24px rgba(15, 23, 42, 0.05)",
    border: "1px solid #eef2f7",
  },
  chartPanelTitle: {
    margin: "0 0 14px 0",
    fontSize: "18px",
    fontWeight: 900,
    color: "#0f172a",
  },
  branchChartRow: {
    marginBottom: "12px",
  },
  branchChartLabel: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "14px",
    color: "#334155",
    marginBottom: "6px",
  },
  branchChartTrack: {
    width: "100%",
    height: "14px",
    borderRadius: "999px",
    background: "#e2e8f0",
    overflow: "hidden",
  },
  branchChartBar: {
    height: "100%",
    borderRadius: "999px",
    background: "linear-gradient(90deg, #2563eb 0%, #60a5fa 100%)",
  },
  filterBar: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
    marginBottom: "20px",
  },
  searchInput: {
    width: "320px",
    maxWidth: "100%",
    padding: "12px 14px",
    borderRadius: "12px",
    border: "1px solid #cbd5e1",
    fontSize: "14px",
    background: "#ffffff",
    outline: "none",
  },
  select: {
    minWidth: "170px",
    padding: "12px 14px",
    borderRadius: "12px",
    border: "1px solid #cbd5e1",
    fontSize: "14px",
    background: "#ffffff",
    outline: "none",
  },
  chartSection: {
    background: "#ffffff",
    borderRadius: "20px",
    padding: "20px",
    boxShadow: "0 10px 24px rgba(15, 23, 42, 0.05)",
    marginBottom: "20px",
  },
  chartHeader: {
    marginBottom: "16px",
  },
  chartTitle: {
    margin: "0 0 6px 0",
    fontSize: "20px",
    fontWeight: 900,
    color: "#0f172a",
  },
  chartDesc: {
    margin: 0,
    color: "#64748b",
    fontSize: "13px",
  },
  chartCard: {
    display: "flex",
    flexDirection: "column",
    gap: "18px",
  },
  chartRow: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
  },
  chartLabelWrap: {
    width: "90px",
    flexShrink: 0,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: "14px",
    fontWeight: 700,
    color: "#334155",
  },
  chartLabel: {
    color: "#334155",
  },
  chartValue: {
    color: "#0f172a",
    fontWeight: 800,
  },
  chartTrack: {
    flex: 1,
    height: "18px",
    background: "#e2e8f0",
    borderRadius: "999px",
    overflow: "hidden",
  },
  chartBar: {
    height: "100%",
    borderRadius: "999px",
  },
  koreanBar: {
    background: "linear-gradient(90deg, #3b82f6 0%, #60a5fa 100%)",
  },
  mathBar: {
    background: "linear-gradient(90deg, #22c55e 0%, #4ade80 100%)",
  },
  englishBar: {
    background: "linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%)",
  },
  contentGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 2fr) minmax(320px, 1fr)",
    gap: "20px",
    alignItems: "start",
  },
  leftPanel: {
    background: "#ffffff",
    borderRadius: "20px",
    padding: "20px",
    boxShadow: "0 10px 24px rgba(15, 23, 42, 0.05)",
  },
  stickyActionBar: {
    position: "sticky",
    top: "14px",
    zIndex: 20,
    background: "rgba(255,255,255,0.96)",
    backdropFilter: "blur(6px)",
    border: "1px solid #e2e8f0",
    borderRadius: "16px",
    padding: "12px 14px",
    marginBottom: "16px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
    boxShadow: "0 10px 24px rgba(15, 23, 42, 0.08)",
  },
  selectedStudentChip: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    background: "#f8fafc",
    borderRadius: "999px",
    padding: "10px 14px",
  },
  selectedStudentLabel: {
    fontSize: "12px",
    fontWeight: 700,
    color: "#64748b",
  },
  selectedStudentText: {
    fontSize: "14px",
    fontWeight: 900,
    color: "#0f172a",
  },
  panelHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    marginBottom: "16px",
    flexWrap: "wrap",
  },
  panelTitle: {
    margin: "0 0 6px 0",
    fontSize: "20px",
    fontWeight: 900,
    color: "#0f172a",
  },
  panelDesc: {
    margin: 0,
    color: "#64748b",
    fontSize: "13px",
  },
  buttonGroup: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
  },
  addButton: {
    border: "none",
    background: "#2563eb",
    color: "#ffffff",
    padding: "12px 16px",
    borderRadius: "12px",
    fontSize: "14px",
    fontWeight: 700,
    cursor: "pointer",
  },
  editButton: {
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
    border: "none",
    background: "#dc2626",
    color: "#ffffff",
    padding: "12px 16px",
    borderRadius: "12px",
    fontSize: "14px",
    fontWeight: 700,
    cursor: "pointer",
  },
  navButton: {
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    color: "#334155",
    padding: "12px 14px",
    borderRadius: "12px",
    fontSize: "14px",
    fontWeight: 700,
    cursor: "pointer",
  },
  tableWrap: {
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  th: {
    padding: "14px 12px",
    borderBottom: "2px solid #e2e8f0",
    background: "#f8fafc",
    textAlign: "left",
    fontSize: "14px",
    color: "#334155",
    whiteSpace: "nowrap",
  },
  td: {
    padding: "14px 12px",
    borderBottom: "1px solid #edf2f7",
    fontSize: "14px",
    color: "#334155",
    whiteSpace: "nowrap",
  },
  tdStrong: {
    padding: "14px 12px",
    borderBottom: "1px solid #edf2f7",
    fontSize: "14px",
    fontWeight: 800,
    color: "#0f172a",
    whiteSpace: "nowrap",
  },
  row: {
    cursor: "pointer",
    transition: "background 0.15s ease",
  },
  selectedRow: {
    background: "#eaf2ff",
    boxShadow: "inset 4px 0 0 #2563eb",
  },
  detailCard: {
    background: "#ffffff",
    padding: "24px",
    borderRadius: "20px",
    boxShadow: "0 10px 24px rgba(15, 23, 42, 0.06)",
    position: "sticky",
    top: "20px",
  },
  detailPopupBox: {
    width: "100%",
    maxWidth: "860px",
    background: "#ffffff",
    borderRadius: "20px",
    padding: "24px",
    boxShadow: "0 20px 50px rgba(15, 23, 42, 0.25)",
    maxHeight: "90vh",
    overflowY: "auto",
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
  stateBox: {
    background: "#f8fafc",
    borderRadius: "14px",
    padding: "24px",
    fontSize: "14px",
    color: "#64748b",
    textAlign: "center",
  },
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
    maxWidth: "980px",
    background: "#ffffff",
    borderRadius: "20px",
    padding: "24px",
    boxShadow: "0 20px 50px rgba(15, 23, 42, 0.25)",
    maxHeight: "90vh",
    overflowY: "auto",
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
};