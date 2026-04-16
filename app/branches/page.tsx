"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AdminHeader } from "@/components/AdminHeader";
import { BranchesTable } from "@/components/BranchesTable";
import {
  createBranch,
  deleteBranch,
  getBranches,
  updateBranch,
  type Branch,
  type Student,
} from "@/lib/dataService";
import {
  usePortalSharedBranches,
  usePortalSharedStudents,
} from "@/lib/portalStore";
import { portalButtonStyles, portalLayout, portalTheme } from "@/lib/theme";

function stringValue(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeBranch(branch: Branch): Branch {
  return {
    ...branch,
    branch_id: stringValue(branch.branch_id),
    branch_code: stringValue(branch.branch_code),
    branch_name: stringValue(branch.branch_name),
    status: stringValue(branch.status) || "active",
    created_at: stringValue(branch.created_at),
    updated_at: stringValue(branch.updated_at),
  };
}

function parseBranchSequence(branchId: string) {
  const match = branchId.match(/^BR(\d+)$/i);

  if (!match) {
    return 0;
  }

  return Number(match[1] || 0);
}

function buildNextBranchId(branches: Branch[]) {
  const maxSequence = branches.reduce((currentMax, branch) => {
    return Math.max(currentMax, parseBranchSequence(stringValue(branch.branch_id)));
  }, 0);

  return `BR${String(maxSequence + 1).padStart(3, "0")}`;
}

const HANGUL_BASE = 0xac00;
const HANGUL_LAST = 0xd7a3;
const HANGUL_INITIALS = ["g", "kk", "n", "d", "tt", "r", "m", "b", "pp", "s", "ss", "", "j", "jj", "ch", "k", "t", "p", "h"];
const HANGUL_VOWELS = ["a", "ae", "ya", "yae", "eo", "e", "yeo", "ye", "o", "wa", "wae", "oe", "yo", "u", "wo", "we", "wi", "yu", "eu", "ui", "i"];
const HANGUL_FINALS = ["", "k", "k", "ks", "n", "nj", "nh", "t", "l", "lk", "lm", "lb", "ls", "lt", "lp", "lh", "m", "p", "ps", "t", "t", "ng", "t", "t", "k", "t", "p", "h"];

function romanizeHangulCharacter(character: string) {
  const codePoint = character.charCodeAt(0);

  if (codePoint < HANGUL_BASE || codePoint > HANGUL_LAST) {
    return character;
  }

  const syllableIndex = codePoint - HANGUL_BASE;
  const initialIndex = Math.floor(syllableIndex / (21 * 28));
  const vowelIndex = Math.floor((syllableIndex % (21 * 28)) / 28);
  const finalIndex = syllableIndex % 28;

  return `${HANGUL_INITIALS[initialIndex]}${HANGUL_VOWELS[vowelIndex]}${HANGUL_FINALS[finalIndex]}`;
}

function romanizeBranchName(branchName: string) {
  return Array.from(branchName)
    .map((character) => romanizeHangulCharacter(character))
    .join("")
    .replace(/[^a-zA-Z0-9]+/g, "")
    .toUpperCase();
}

function buildBaseBranchCode(branchName: string) {
  const romanizedBranchName = romanizeBranchName(branchName);

  if (romanizedBranchName) {
    return romanizedBranchName.slice(0, 3);
  }

  return "BRN";
}

function buildUniqueBranchCode(branchName: string, branches: Branch[], branchId: string) {
  const baseCode = buildBaseBranchCode(branchName);
  const usedCodes = new Set(
    branches
      .filter((branch) => stringValue(branch.branch_id) !== branchId)
      .map((branch) => stringValue(branch.branch_code).toUpperCase())
      .filter(Boolean)
  );

  if (!usedCodes.has(baseCode)) {
    return baseCode;
  }

  let suffix = 2;
  let candidateCode = `${baseCode}${suffix}`;

  while (usedCodes.has(candidateCode)) {
    suffix += 1;
    candidateCode = `${baseCode}${suffix}`;
  }

  return candidateCode;
}

function buildCreateBranchPayload(branches: Branch[], branchName: string): Branch {
  const now = new Date().toISOString();
  const branchId = buildNextBranchId(branches);

  return {
    branch_id: branchId,
    branch_name: branchName,
    branch_code: buildUniqueBranchCode(branchName, branches, branchId),
    status: "active",
    created_at: now,
    updated_at: now,
  };
}

function buildUpdateBranchPayload(existingBranch: Branch, branchName: string, branches: Branch[]): Branch {
  return {
    ...existingBranch,
    branch_id: stringValue(existingBranch.branch_id),
    branch_name: branchName,
    branch_code:
      stringValue(existingBranch.branch_code) ||
      buildUniqueBranchCode(branchName, branches, stringValue(existingBranch.branch_id)),
    status: stringValue(existingBranch.status) || "active",
    created_at: stringValue(existingBranch.created_at),
    updated_at: new Date().toISOString(),
  };
}

function countStudentsByBranch(students: Student[]) {
  return students.reduce<Record<string, number>>((accumulator, student) => {
    const branchId = stringValue(student.branch_id);

    if (!branchId) {
      return accumulator;
    }

    accumulator[branchId] = (accumulator[branchId] || 0) + 1;
    return accumulator;
  }, {});
}

function upsertBranchInList(branches: Branch[], nextBranch: Branch) {
  const nextBranchId = stringValue(nextBranch.branch_id);

  if (!nextBranchId) {
    return branches;
  }

  const existingIndex = branches.findIndex((branch) => stringValue(branch.branch_id) === nextBranchId);

  if (existingIndex === -1) {
    return [...branches, nextBranch];
  }

  return branches.map((branch, index) => (index === existingIndex ? normalizeBranch(nextBranch) : branch));
}

function removeBranchFromList(branches: Branch[], branchId: string) {
  const normalizedBranchId = stringValue(branchId);
  return branches.filter((branch) => stringValue(branch.branch_id) !== normalizedBranchId);
}

export default function BranchesPage() {
  const branchesSnapshot = usePortalSharedBranches();
  const studentsSnapshot = usePortalSharedStudents();
  const safeBranchesSnapshot = useMemo(
    () => (Array.isArray(branchesSnapshot) ? branchesSnapshot : []),
    [branchesSnapshot]
  );
  const safeStudentsSnapshot = useMemo(
    () => (Array.isArray(studentsSnapshot) ? studentsSnapshot : []),
    [studentsSnapshot]
  );
  const timerRef = useRef<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [form, setForm] = useState({ branch_id: "", branch_name: "" });
  const [saving, setSaving] = useState(false);
  const [isFetchingBranches, setIsFetchingBranches] = useState(false);
  const [hasFetchedBranches, setHasFetchedBranches] = useState(false);
  const [fallbackBranches, setFallbackBranches] = useState<Branch[]>([]);
  const [branchSource, setBranchSource] = useState<"store" | "fallback">("store");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showMessage = useCallback((type: "success" | "error", text: string) => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
    }

    setMessage({ type, text });
    timerRef.current = window.setTimeout(() => setMessage(null), 3000);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  const branches = useMemo(
    () => {
      const normalizedStoreBranches = safeBranchesSnapshot.map(normalizeBranch);

      if (branchSource === "store" && normalizedStoreBranches.length > 0) {
        return normalizedStoreBranches;
      }

      if (branchSource === "store" && !hasFetchedBranches) {
        return normalizedStoreBranches;
      }

      return fallbackBranches.map(normalizeBranch);
    },
    [branchSource, fallbackBranches, hasFetchedBranches, safeBranchesSnapshot]
  );

  const studentCounts = useMemo(
    () => countStudentsByBranch(safeStudentsSnapshot),
    [safeStudentsSnapshot]
  );

  useEffect(() => {
    if (safeBranchesSnapshot.length > 0 && branchSource === "store") {
      return;
    }

    if (hasFetchedBranches) {
      return;
    }

    let cancelled = false;

    async function loadBranches() {
      try {
        setIsFetchingBranches(true);
        const result = await getBranches();

        if (cancelled) {
          return;
        }

        if (result.ok) {
          setFallbackBranches(Array.isArray(result.data) ? result.data.map(normalizeBranch) : []);
          setBranchSource("fallback");
        } else {
          setFallbackBranches([]);
          setBranchSource("fallback");
          showMessage("error", result.error || "지점 목록을 불러오지 못했습니다.");
        }
      } catch (error) {
        if (cancelled) {
          return;
        }

        setFallbackBranches([]);
        setBranchSource("fallback");
        showMessage("error", error instanceof Error ? error.message : "지점 목록을 불러오지 못했습니다.");
      } finally {
        if (!cancelled) {
          setHasFetchedBranches(true);
          setIsFetchingBranches(false);
        }
      }
    }

    loadBranches();

    return () => {
      cancelled = true;
    };
  }, [branchSource, hasFetchedBranches, safeBranchesSnapshot.length, showMessage]);

  const openAddModal = useCallback(() => {
    setEditingBranch(null);
    setForm({ branch_id: "", branch_name: "" });
    setIsModalOpen(true);
  }, []);

  const openEditModal = useCallback((branch: Branch) => {
    setEditingBranch(branch);
    setForm({
      branch_id: stringValue(branch.branch_id),
      branch_name: stringValue(branch.branch_name),
    });
    setIsModalOpen(true);
  }, []);

  const handleSave = useCallback(async () => {
    const normalizedBranchName = form.branch_name.trim();

    if (!normalizedBranchName) {
      showMessage("error", "지점명은 필수입니다.");
      return;
    }

    try {
      setSaving(true);

      const payload = editingBranch
        ? buildUpdateBranchPayload(editingBranch, normalizedBranchName, branches)
        : buildCreateBranchPayload(branches, normalizedBranchName);
      const result = editingBranch ? await updateBranch(payload) : await createBranch(payload);

      if (!result.ok) {
        showMessage("error", result.error || "지점 저장에 실패했습니다.");
        return;
      }

      const savedBranch = normalizeBranch((result.data as Branch | undefined) || payload);
      setFallbackBranches((prev) => upsertBranchInList(prev, savedBranch));

      setIsModalOpen(false);
      setForm({ branch_id: "", branch_name: "" });
      showMessage("success", editingBranch ? "지점을 수정했습니다." : "지점을 추가했습니다.");
    } catch (error) {
      showMessage("error", error instanceof Error ? error.message : "지점 저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  }, [branches, editingBranch, form.branch_name, showMessage]);

  const handleDelete = useCallback(async (branch: Branch) => {
    const branchName = stringValue(branch.branch_name);

    if (!window.confirm(`Delete "${branchName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setSaving(true);
      const branchId = stringValue(branch.branch_id);
      const result = await deleteBranch(branchId);

      if (!result.ok) {
        showMessage("error", result.error || "지점 삭제에 실패했습니다.");
        return;
      }

      setFallbackBranches((prev) => removeBranchFromList(prev, branchId));
      showMessage("success", "지점을 삭제했습니다.");
    } catch (error) {
      showMessage("error", error instanceof Error ? error.message : "지점 삭제 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  }, [showMessage]);

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <AdminHeader isSuperAdmin fallbackActiveKey="branch-management" />

        <header style={styles.header}>
          <div>
            <p style={styles.badge}>메인 / 지점관리</p>
            <h1 style={styles.title}>지점관리</h1>
            <p style={styles.subtitle}>지점을 추가, 수정, 삭제하고 학생 수를 빠르게 확인합니다.</p>
          </div>
          <div style={styles.headerActions}>
            <button style={styles.addButton} onClick={openAddModal}>
              + 새 지점 추가
            </button>
          </div>
        </header>

        {message ? (
          <div style={{ ...styles.messageBox, ...(message.type === "success" ? styles.successBox : styles.errorBox) }}>
            {message.text}
          </div>
        ) : null}

        <div style={styles.tableWrap}>
          {isFetchingBranches && branches.length === 0 ? (
            <div style={styles.stateBox}>지점 목록을 불러오는 중입니다.</div>
          ) : branches.length === 0 ? (
            <div style={styles.stateBox}>지점이 없습니다. 새 지점을 추가하세요.</div>
          ) : (
            <BranchesTable
              branches={branches}
              countsLoading={false}
              studentCounts={studentCounts}
              saving={saving}
              onEdit={openEditModal}
              onDelete={handleDelete}
            />
          )}
        </div>
      </div>

      {isModalOpen ? (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>{editingBranch ? "지점 수정" : "지점 추가"}</h2>
              <button style={styles.closeButton} onClick={() => setIsModalOpen(false)}>
                ✕
              </button>
            </div>

            <div style={styles.formGrid}>
              <label style={styles.label}>
                지점명
                <input
                  style={styles.input}
                  value={form.branch_name}
                  onChange={(event) => setForm((prev) => ({ ...prev, branch_name: event.target.value }))}
                  placeholder="예: 강남 본원"
                />
              </label>
            </div>

            <div style={styles.modalFooter}>
              <button style={styles.secondaryButton} onClick={() => setIsModalOpen(false)} disabled={saving}>
                취소
              </button>
              <button style={styles.addButton} onClick={handleSave} disabled={saving}>
                {saving ? "저장 중..." : editingBranch ? "수정" : "추가"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  page: {
    minHeight: "100vh",
    background: portalTheme.gradients.page,
    padding: portalLayout.pagePaddingWide,
    fontFamily: "Arial, sans-serif",
  },
  container: {
    maxWidth: portalLayout.containerMaxWidth,
    margin: "0 auto",
    paddingTop: portalLayout.containerPaddingTop,
    display: "flex",
    flexDirection: "column",
    gap: portalLayout.sectionGap,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "24px",
    padding: portalLayout.cardPadding,
    borderRadius: "24px",
    background: portalTheme.gradients.card,
    border: `1px solid ${portalTheme.colors.line}`,
    boxShadow: portalTheme.shadows.panel,
  },
  headerActions: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    alignItems: "flex-end",
  },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    padding: "7px 12px",
    borderRadius: "999px",
    background: portalTheme.colors.primarySoft,
    color: portalTheme.colors.primary,
    fontSize: "12px",
    fontWeight: 800,
    marginBottom: "12px",
    letterSpacing: "0.08em",
  },
  title: {
    margin: "0 0 10px 0",
    fontSize: "clamp(40px, 6vw, 58px)",
    fontWeight: 900,
    color: portalTheme.colors.textStrong,
    lineHeight: 1.04,
    letterSpacing: "-0.05em",
  },
  subtitle: {
    margin: 0,
    color: portalTheme.colors.textMuted,
    fontSize: "15px",
    lineHeight: 1.6,
  },
  addButton: {
    ...portalButtonStyles.primary,
    padding: "12px 16px",
    fontSize: "14px",
    cursor: "pointer",
  },
  secondaryButton: {
    ...portalButtonStyles.secondary,
    padding: "12px 16px",
    fontSize: "14px",
    cursor: "pointer",
  },
  messageBox: {
    borderRadius: "14px",
    padding: "14px 16px",
    fontSize: "14px",
    fontWeight: 700,
    marginBottom: "18px",
  },
  successBox: {
    background: portalTheme.colors.successBg,
    color: portalTheme.colors.successText,
    border: `1px solid ${portalTheme.colors.successLine}`,
  },
  errorBox: {
    background: portalTheme.colors.dangerBg,
    color: portalTheme.colors.dangerText,
    border: `1px solid ${portalTheme.colors.dangerLine}`,
  },
  tableWrap: {
    background: portalTheme.gradients.card,
    borderRadius: "20px",
    border: `1px solid ${portalTheme.colors.line}`,
    boxShadow: portalTheme.shadows.card,
    overflowX: "auto",
    width: "100%",
  },
  stateBox: {
    textAlign: "center",
    padding: "40px 20px",
    color: portalTheme.colors.textMuted,
    fontSize: "14px",
  },
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(10, 30, 58, 0.48)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    zIndex: 50,
  },
  modalCard: {
    width: "100%",
    maxWidth: "520px",
    background: portalTheme.gradients.card,
    borderRadius: "20px",
    padding: "22px",
    boxShadow: portalTheme.shadows.modal,
    border: `1px solid ${portalTheme.colors.line}`,
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    marginBottom: "18px",
  },
  modalTitle: {
    margin: 0,
    color: portalTheme.colors.textStrong,
    fontSize: "24px",
    fontWeight: 900,
  },
  closeButton: {
    border: "none",
    background: "transparent",
    color: portalTheme.colors.textPrimary,
    fontSize: "22px",
    cursor: "pointer",
  },
  formGrid: {
    display: "grid",
    gap: "16px",
  },
  label: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    color: portalTheme.colors.textPrimary,
    fontSize: "14px",
    fontWeight: 700,
  },
  input: {
    border: `1px solid ${portalTheme.colors.lineStrong}`,
    borderRadius: "12px",
    padding: "13px 14px",
    fontSize: "14px",
    color: portalTheme.colors.textStrong,
    background: portalTheme.colors.surfaceCardAlt,
  },
  modalFooter: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
    marginTop: "22px",
  },
};
