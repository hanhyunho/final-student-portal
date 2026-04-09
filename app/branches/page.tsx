"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  getBranches,
  getStudents,
  createBranch,
  updateBranch,
  deleteBranch,
  type Branch,
  type Student,
} from "@/lib/dataService";

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [form, setForm] = useState({ branch_id: "", branch_name: "" });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [branchesRes, studentsRes] = await Promise.all([
        getBranches(),
        getStudents(),
      ]);
      
      if (branchesRes.ok && branchesRes.data) {
        setBranches(branchesRes.data);
      }
      if (studentsRes.ok && studentsRes.data) {
        setStudents(studentsRes.data);
      }
    } catch (error) {
      showMessage("error", "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const openAddModal = () => {
    setEditingBranch(null);
    setForm({ branch_id: "", branch_name: "" });
    setIsModalOpen(true);
  };

  const openEditModal = (branch: Branch) => {
    setEditingBranch(branch);
    setForm({
      branch_id: String(branch.branch_id),
      branch_name: String(branch.branch_name),
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.branch_name.trim()) {
      showMessage("error", "Branch name is required");
      return;
    }

    try {
      setSaving(true);
      const result = editingBranch
        ? await updateBranch(form as Branch)
        : await createBranch(form as Branch);

      if (!result.ok) {
        showMessage("error", result.error || "Operation failed");
        return;
      }

      setIsModalOpen(false);
      setForm({ branch_id: "", branch_name: "" });
      showMessage("success", editingBranch ? "Branch updated" : "Branch created");
      await loadData();
    } catch (error) {
      showMessage("error", "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (branch: Branch) => {
    const branchName = String(branch.branch_name);
    if (!confirm(`Delete "${branchName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setSaving(true);
      const result = await deleteBranch(String(branch.branch_id));

      if (!result.ok) {
        showMessage("error", result.error || "Failed to delete branch");
        return;
      }

      showMessage("success", "Branch deleted");
      await loadData();
    } catch (error) {
      showMessage("error", "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  const getStudentCount = (branchId: string) => {
    return students.filter((st) => String(st.branch_id) === String(branchId)).length;
  };

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        {/* Header */}
        <header style={styles.header}>
          <div>
            <p style={styles.badge}>FINAL 관리자 시스템</p>
            <h1 style={styles.title}>지점 관리</h1>
            <p style={styles.subtitle}>학원 지점을 관리하고 조회합니다.</p>
          </div>
          <Link href="/" style={styles.backLink}>
            ← 대시보드로 돌아가기
          </Link>
        </header>

        {/* Message */}
        {message && (
          <div
            style={{
              ...styles.messageBox,
              background: message.type === "success" ? "#dcfce7" : "#fee2e2",
              color: message.type === "success" ? "#166534" : "#b91c1c",
            }}
          >
            {message.text}
          </div>
        )}

        {/* Add Button */}
        <button style={styles.addButton} onClick={openAddModal} disabled={loading}>
          + 새 지점 추가
        </button>

        {/* Branches Table */}
        <div style={styles.tableWrap}>
          {loading ? (
            <div style={styles.stateBox}>데이터를 불러오는 중입니다...</div>
          ) : branches.length === 0 ? (
            <div style={styles.stateBox}>지점이 없습니다. 새 지점을 추가하세요.</div>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>지점명</th>
                  <th style={styles.th}>학생 수</th>
                  <th style={styles.th}>작업</th>
                </tr>
              </thead>
              <tbody>
                {branches.map((branch) => (
                  <tr key={String(branch.branch_id)} style={styles.row}>
                    <td style={styles.tdStrong}>{String(branch.branch_name)}</td>
                    <td style={styles.td}>{getStudentCount(String(branch.branch_id))}</td>
                    <td style={styles.td}>
                      <button
                        style={styles.editButton}
                        onClick={() => openEditModal(branch)}
                        disabled={saving}
                      >
                        수정
                      </button>
                      <button
                        style={styles.deleteButton}
                        onClick={() => handleDelete(branch)}
                        disabled={saving}
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalBox}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>
                {editingBranch ? "지점 수정" : "지점 추가"}
              </h3>
              <button
                style={styles.closeButton}
                onClick={() => setIsModalOpen(false)}
                disabled={saving}
              >
                ✕
              </button>
            </div>

            <div style={styles.formGrid}>
              <div style={styles.formField}>
                <label style={styles.formLabel}>지점 ID</label>
                <input
                  style={{ ...styles.formInput, opacity: editingBranch ? 0.6 : 1 }}
                  value={form.branch_id}
                  onChange={(e) => setForm({ ...form, branch_id: e.target.value })}
                  placeholder="자동생성됨"
                  disabled={!!editingBranch}
                />
              </div>
              <div style={styles.formField}>
                <label style={styles.formLabel}>지점명 *</label>
                <input
                  style={styles.formInput}
                  value={form.branch_name}
                  onChange={(e) => setForm({ ...form, branch_name: e.target.value })}
                  placeholder="지점 이름"
                  autoFocus
                />
              </div>
            </div>

            <div style={styles.modalFooter}>
              <button
                style={styles.secondaryButton}
                onClick={() => setIsModalOpen(false)}
                disabled={saving}
              >
                취소
              </button>
              <button
                style={styles.primaryButton}
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "저장 중..." : editingBranch ? "수정" : "추가"}
              </button>
            </div>
          </div>
        </div>
      )}
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
    maxWidth: "1200px",
    margin: "0 auto",
  },
  header: {
    marginBottom: "24px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
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
    fontSize: "36px",
    fontWeight: 900,
    color: "#0f172a",
  },
  subtitle: {
    margin: 0,
    color: "#64748b",
    fontSize: "14px",
  },
  backLink: {
    padding: "12px 16px",
    background: "#ffffff",
    color: "#0f766e",
    textDecoration: "none",
    borderRadius: "12px",
    fontSize: "14px",
    fontWeight: 700,
    border: "1px solid #cbd5e1",
    cursor: "pointer",
  },
  messageBox: {
    padding: "16px",
    borderRadius: "12px",
    marginBottom: "20px",
    fontSize: "14px",
    fontWeight: 700,
  },
  addButton: {
    background: "#2563eb",
    color: "#ffffff",
    border: "none",
    padding: "12px 16px",
    borderRadius: "12px",
    fontSize: "14px",
    fontWeight: 700,
    cursor: "pointer",
    marginBottom: "20px",
  },
  tableWrap: {
    background: "#ffffff",
    borderRadius: "18px",
    padding: "20px",
    boxShadow: "0 10px 24px rgba(15, 23, 42, 0.05)",
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
    fontWeight: 700,
  },
  td: {
    padding: "14px 12px",
    borderBottom: "1px solid #edf2f7",
    fontSize: "14px",
    color: "#334155",
  },
  tdStrong: {
    padding: "14px 12px",
    borderBottom: "1px solid #edf2f7",
    fontSize: "14px",
    fontWeight: 800,
    color: "#0f172a",
  },
  row: {
    cursor: "pointer",
    transition: "background 0.15s ease",
  },
  stateBox: {
    textAlign: "center",
    padding: "40px 20px",
    color: "#64748b",
    fontSize: "14px",
  },
  editButton: {
    background: "#0f766e",
    color: "#ffffff",
    border: "none",
    padding: "8px 12px",
    borderRadius: "8px",
    fontSize: "12px",
    fontWeight: 700,
    cursor: "pointer",
    marginRight: "8px",
  },
  deleteButton: {
    background: "#dc2626",
    color: "#ffffff",
    border: "none",
    padding: "8px 12px",
    borderRadius: "8px",
    fontSize: "12px",
    fontWeight: 700,
    cursor: "pointer",
  },
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15, 23, 42, 0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modalBox: {
    width: "100%",
    maxWidth: "500px",
    background: "#ffffff",
    borderRadius: "20px",
    padding: "24px",
    boxShadow: "0 20px 50px rgba(15, 23, 42, 0.25)",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
  },
  modalTitle: {
    margin: 0,
    fontSize: "20px",
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
    gridTemplateColumns: "1fr",
    gap: "14px",
    marginBottom: "20px",
  },
  formField: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
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
  modalFooter: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
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
