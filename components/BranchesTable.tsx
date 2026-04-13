import React, { memo } from "react";
import type { Branch } from "@/lib/dataService";
import { portalButtonStyles, portalTheme } from "@/lib/theme";

type BranchesTableProps = {
  branches: Branch[];
  countsLoading: boolean;
  studentCounts: Record<string, number>;
  saving: boolean;
  onEdit: (branch: Branch) => void;
  onDelete: (branch: Branch) => void;
};

function stringValue(value: unknown) {
  return String(value ?? "").trim();
}

function BranchesTableComponent({
  branches,
  countsLoading,
  studentCounts,
  saving,
  onEdit,
  onDelete,
}: BranchesTableProps) {
  const getStudentCount = (branchId: string) => studentCounts[stringValue(branchId)] || 0;

  const rows = branches.map((branch) => {
    const branchId = stringValue(branch.branch_id);
    const normalizedStatus = stringValue(branch.status).toLowerCase() || "active";

    return (
      <tr key={branchId} style={styles.row}>
        <td style={styles.tdStrong}>{stringValue(branch.branch_name)}</td>
        <td style={styles.tdCode}>{stringValue(branch.branch_code) || "-"}</td>
        <td style={styles.td}>
          <span
            style={{
              ...styles.statusBadge,
              background: normalizedStatus === "active" ? portalTheme.colors.successBg : portalTheme.colors.surfacePanel,
              color: normalizedStatus === "active" ? portalTheme.colors.successText : portalTheme.colors.textPrimary,
              borderColor: normalizedStatus === "active" ? portalTheme.colors.successLine : portalTheme.colors.line,
            }}
          >
            {normalizedStatus}
          </span>
        </td>
        <td style={styles.tdNumber}>
          {countsLoading && !(branchId in studentCounts) ? "계산 중..." : getStudentCount(branchId)}
        </td>
        <td style={styles.tdAction}>
          <div style={styles.actionGroup}>
            <button style={styles.editButton} onClick={() => onEdit(branch)} disabled={saving}>
              수정
            </button>
            <button style={styles.deleteButton} onClick={() => onDelete(branch)} disabled={saving}>
              삭제
            </button>
          </div>
        </td>
      </tr>
    );
  });

  return (
    <table style={styles.table}>
      <thead>
        <tr>
          <th style={styles.th}>지점명</th>
          <th style={styles.th}>코드</th>
          <th style={styles.th}>상태</th>
          <th style={styles.th}>학생 수</th>
          <th style={styles.th}>작업</th>
        </tr>
      </thead>
      <tbody>{rows}</tbody>
    </table>
  );
}

export const BranchesTable = memo(BranchesTableComponent);

const styles: { [key: string]: React.CSSProperties } = {
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  th: {
    padding: "14px 12px",
    borderBottom: `2px solid ${portalTheme.colors.lineStrong}`,
    background: portalTheme.colors.surfacePanel,
    textAlign: "center",
    fontSize: "14px",
    color: portalTheme.colors.textPrimary,
    fontWeight: 800,
    letterSpacing: "0.01em",
    verticalAlign: "middle",
  },
  td: {
    padding: "14px 12px",
    borderBottom: `1px solid ${portalTheme.colors.lineTable}`,
    fontSize: "14px",
    color: portalTheme.colors.textPrimary,
    textAlign: "center",
    verticalAlign: "middle",
  },
  tdStrong: {
    padding: "14px 12px",
    borderBottom: `1px solid ${portalTheme.colors.lineTable}`,
    fontSize: "14px",
    fontWeight: 800,
    color: portalTheme.colors.textStrong,
    textAlign: "left",
    verticalAlign: "middle",
  },
  tdCode: {
    padding: "14px 12px",
    borderBottom: `1px solid ${portalTheme.colors.lineTable}`,
    fontSize: "13px",
    fontWeight: 700,
    color: portalTheme.colors.cyan,
    textAlign: "center",
    verticalAlign: "middle",
  },
  tdNumber: {
    padding: "14px 12px",
    borderBottom: `1px solid ${portalTheme.colors.lineTable}`,
    fontSize: "14px",
    fontWeight: 800,
    color: portalTheme.colors.textStrong,
    textAlign: "center",
    fontVariantNumeric: "tabular-nums",
    verticalAlign: "middle",
  },
  tdAction: {
    padding: "14px 12px",
    borderBottom: `1px solid ${portalTheme.colors.lineTable}`,
    textAlign: "center",
    verticalAlign: "middle",
  },
  row: {
    cursor: "pointer",
    transition: "background 0.15s ease",
  },
  statusBadge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "5px 10px",
    borderRadius: portalTheme.radius.pill,
    fontSize: "12px",
    fontWeight: 700,
    border: "1px solid transparent",
  },
  actionGroup: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
  },
  editButton: {
    ...portalButtonStyles.success,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "8px 12px",
    fontSize: "12px",
    fontWeight: 700,
    cursor: "pointer",
  },
  deleteButton: {
    ...portalButtonStyles.warning,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "8px 12px",
    fontSize: "12px",
    fontWeight: 700,
    cursor: "pointer",
  },
};