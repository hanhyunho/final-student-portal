import React from "react";
import { AdminHeader, type AdminNavKey } from "@/components/AdminHeader";
import { portalTheme } from "@/lib/theme";

type FilterConfig = {
  label: string;
  type: "select" | "input";
  placeholder?: string;
  options?: string[];
};

interface DataBrowserPageProps {
  title: string;
  subtitle: string;
  filters: FilterConfig[];
  columns: string[];
  rows: Array<Record<string, string | number>>;
  accent: "blue" | "green";
  headerActiveKey: AdminNavKey;
}

const ACCENT_STYLES = {
  blue: {
    border: "#2563eb",
    tint: "rgba(37, 99, 235, 0.06)",
    tintStrong: "rgba(37, 99, 235, 0.1)",
    chip: "#dbeafe",
    chipText: "#1d4ed8",
  },
  green: {
    border: "#16a34a",
    tint: "rgba(22, 163, 74, 0.06)",
    tintStrong: "rgba(22, 163, 74, 0.1)",
    chip: "#dcfce7",
    chipText: "#15803d",
  },
} as const;

export function DataBrowserPage({ title, subtitle, filters, columns, rows, accent, headerActiveKey }: DataBrowserPageProps) {
  const accentStyle = ACCENT_STYLES[accent];

  return (
    <main
      style={{
        minHeight: "100vh",
        background: portalTheme.gradients.page,
        padding: "0 20px 40px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div style={{ maxWidth: "1360px", margin: "0 auto", paddingTop: "16px", display: "flex", flexDirection: "column", gap: "18px" }}>
        <AdminHeader isSuperAdmin fallbackActiveKey={headerActiveKey} />

        <section
          style={{
            background: portalTheme.gradients.card,
            border: `1px solid ${portalTheme.colors.line}`,
            borderLeft: `5px solid ${accentStyle.border}`,
            borderRadius: portalTheme.radius.lg,
            padding: "28px 26px 24px",
            boxShadow: portalTheme.shadows.panel,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxWidth: "760px" }}>
            <span
              style={{
                display: "inline-flex",
                width: "fit-content",
                alignItems: "center",
                padding: "6px 12px",
                borderRadius: portalTheme.radius.pill,
                background: accentStyle.tintStrong,
                color: accentStyle.chipText,
                fontSize: "12px",
                fontWeight: 900,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              DATA Browser
            </span>
            <div>
              <h1 style={{ margin: 0, fontSize: "clamp(40px, 6vw, 56px)", fontWeight: 900, lineHeight: 1.04, color: portalTheme.colors.textStrong, letterSpacing: "-0.05em" }}>
                {title}
              </h1>
              <p style={{ margin: "12px 0 0 0", fontSize: "16px", lineHeight: 1.7, color: portalTheme.colors.textMuted }}>{subtitle}</p>
            </div>
          </div>
        </section>

        <section
          style={{
            background: portalTheme.gradients.card,
            border: `1px solid ${portalTheme.colors.line}`,
            borderRadius: portalTheme.radius.lg,
            padding: "18px",
            boxShadow: portalTheme.shadows.panel,
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
            {filters.map((filter) => (
              <label
                key={filter.label}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                  minWidth: "180px",
                  flex: "1 1 180px",
                }}
              >
                <span style={{ fontSize: "12px", fontWeight: 800, color: portalTheme.colors.textMuted }}>{filter.label}</span>
                {filter.type === "select" ? (
                  <select
                    defaultValue={filter.options?.[0] || ""}
                    style={{
                      width: "100%",
                      padding: "11px 12px",
                      borderRadius: portalTheme.radius.sm,
                      border: `1px solid ${portalTheme.colors.lineStrong}`,
                      background: accentStyle.tint,
                      color: portalTheme.colors.textStrong,
                      fontSize: "14px",
                      outline: "none",
                    }}
                  >
                    {(filter.options || []).map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    defaultValue={filter.placeholder || ""}
                    placeholder={filter.placeholder}
                    style={{
                      width: "100%",
                      padding: "11px 12px",
                      borderRadius: portalTheme.radius.sm,
                      border: `1px solid ${portalTheme.colors.lineStrong}`,
                      background: accentStyle.tint,
                      color: portalTheme.colors.textStrong,
                      fontSize: "14px",
                      outline: "none",
                    }}
                  />
                )}
              </label>
            ))}
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
            <span style={{ padding: "7px 12px", borderRadius: portalTheme.radius.pill, background: accentStyle.chip, color: accentStyle.chipText, fontSize: "12px", fontWeight: 800 }}>
              더미 데이터 {rows.length}건
            </span>
            <span style={{ padding: "7px 12px", borderRadius: portalTheme.radius.pill, background: portalTheme.colors.surfacePanel, color: portalTheme.colors.textMuted, fontSize: "12px", fontWeight: 800 }}>
              컬럼 {columns.length}개
            </span>
          </div>
        </section>

        <section
          style={{
            background: portalTheme.gradients.card,
            border: `1px solid ${portalTheme.colors.line}`,
            borderRadius: portalTheme.radius.lg,
            boxShadow: portalTheme.shadows.panel,
            overflow: "hidden",
          }}
        >
          <div style={{ overflow: "auto", maxHeight: "68vh" }}>
            <table style={{ width: "max-content", minWidth: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
              <thead>
                <tr>
                  {columns.map((column) => (
                    <th
                      key={column}
                      style={{
                        position: "sticky",
                        top: 0,
                        zIndex: 1,
                        background: "#f8fbff",
                        padding: "12px 14px",
                        borderBottom: `1px solid ${portalTheme.colors.lineStrong}`,
                        borderRight: `1px solid ${portalTheme.colors.lineSoft}`,
                        color: portalTheme.colors.textStrong,
                        fontSize: "13px",
                        fontWeight: 800,
                        whiteSpace: "nowrap",
                        textAlign: "left",
                      }}
                    >
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowIndex) => (
                  <tr key={`${title}-${rowIndex}`} style={{ background: rowIndex % 2 === 0 ? "#ffffff" : "#fbfcfe" }}>
                    {columns.map((column) => (
                      <td
                        key={`${rowIndex}-${column}`}
                        style={{
                          padding: "11px 14px",
                          borderBottom: `1px solid ${portalTheme.colors.lineSoft}`,
                          borderRight: `1px solid ${portalTheme.colors.lineSoft}`,
                          color: portalTheme.colors.textPrimary,
                          fontSize: "13px",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {String(row[column] ?? "-")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
