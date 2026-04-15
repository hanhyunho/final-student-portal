"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  CONSULT_TYPES,
  CONSULT_TYPE_LABELS,
  type ConsultType,
} from "@/lib/consult-data";
import classes from "./ConsultPanel.module.css";

export interface ConsultStudentInfo {
  name: string;
  branch: string;
  school: string;
  grade: string;
}

interface ConsultPanelProps {
  studentId: string;
  studentInfo: ConsultStudentInfo;
  initialConsultType: ConsultType;
  onClose: () => void;
  onFilledTypesChange?: (studentId: string, filledTypes: ConsultType[]) => void;
}

type SectionMeta = {
  saving: boolean;
  saved: boolean;
};

type ConsultRecordMap = Partial<Record<ConsultType, Record<string, string>>>;

const CONSULT_CACHE_TTL_MS = 5 * 60 * 1000;
const consultRecordsCache = new Map<
  string,
  {
    fetchedAt: number;
    records: ConsultRecordMap;
  }
>();

function initSectionMap<T>(value: () => T): Record<ConsultType, T> {
  const result = {} as Record<ConsultType, T>;
  for (const type of CONSULT_TYPES) result[type] = value();
  return result;
}

function hydrateConsultStateFromRecords(
  records: ConsultRecordMap,
  setMemos: React.Dispatch<React.SetStateAction<Record<ConsultType, string>>>
) {
  setMemos((prev) => {
    const next = { ...prev };
    for (const type of CONSULT_TYPES) {
      next[type] = records[type]?.consult_memo ?? "";
    }
    return next;
  });
}

function getFilledConsultTypes(records: ConsultRecordMap) {
  return CONSULT_TYPES.filter((type) => (records[type]?.consult_memo ?? "").trim());
}

export function ConsultPanel({
  studentId,
  studentInfo,
  initialConsultType,
  onClose,
  onFilledTypesChange,
}: ConsultPanelProps) {
  const [mounted, setMounted] = useState(false);
  const [openSections, setOpenSections] = useState<Set<ConsultType>>(
    () => new Set([initialConsultType])
  );
  const [memos, setMemos] = useState<Record<ConsultType, string>>(() =>
    initSectionMap(() => "")
  );
  const [meta, setMeta] = useState<Record<ConsultType, SectionMeta>>(() =>
    initSectionMap(() => ({ saving: false, saved: false }))
  );
  const [isLoading, setIsLoading] = useState(true);
  const [size, setSize] = useState({ width: 640, height: 500 });
  const [position, setPosition] = useState({ x: 80, y: 60 });
  const [isMinimized, setIsMinimized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const panelRef = useRef<HTMLDivElement>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const fetchedRef = useRef(false);
  const filledTypesRef = useRef<ConsultType[]>([]);
  const resizeRef = useRef<{
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
  } | null>(null);
  const sizeRef = useRef(size);
  sizeRef.current = size;

  useEffect(() => {
    setMounted(true);
    setPosition({
      x: Math.max(20, Math.floor((window.innerWidth - 640) / 2)),
      y: 60,
    });
  }, []);

  useEffect(() => {
    setOpenSections(new Set([initialConsultType]));
  }, [initialConsultType, studentId]);

  useEffect(() => {
    if (!mounted || fetchedRef.current) return;
    fetchedRef.current = true;

    const load = async () => {
      const cached = consultRecordsCache.get(studentId);
      const isCacheFresh = !!cached && Date.now() - cached.fetchedAt < CONSULT_CACHE_TTL_MS;

      if (cached) {
        hydrateConsultStateFromRecords(cached.records, setMemos);
        const filled = getFilledConsultTypes(cached.records);
        filledTypesRef.current = filled;
        onFilledTypesChange?.(studentId, filled);
        setIsLoading(false);
      }

      if (isCacheFresh) {
        return;
      }

      try {
        const res = await fetch(
          `/api/consult?student_id=${encodeURIComponent(studentId)}&all=true`,
          { cache: "no-store" }
        );
        const json = await res.json();

        if (json.ok && json.records) {
          const records = json.records as ConsultRecordMap;
          consultRecordsCache.set(studentId, {
            fetchedAt: Date.now(),
            records,
          });
          hydrateConsultStateFromRecords(records, setMemos);
          const filled = getFilledConsultTypes(records);
          filledTypesRef.current = filled;
          onFilledTypesChange?.(studentId, filled);
        }
      } catch {
        // Keep the panel usable even if the refresh request fails.
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [mounted, onFilledTypesChange, studentId]);

  const handleSectionToggle = useCallback((type: ConsultType) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }, []);

  const handleExpandAll = useCallback(() => setOpenSections(new Set(CONSULT_TYPES)), []);
  const handleCollapseAll = useCallback(() => setOpenSections(new Set()), []);

  const handleSave = useCallback(
    async (type: ConsultType) => {
      setMeta((prev) => ({ ...prev, [type]: { saving: true, saved: false } }));

      try {
        const payload = {
          student_id: studentId,
          student_name: studentInfo.name,
          branch: studentInfo.branch,
          school: studentInfo.school,
          grade: studentInfo.grade,
          consult_type: type,
          consult_type_label: CONSULT_TYPE_LABELS[type],
          consult_memo: memos[type],
        };

        const res = await fetch("/api/consult", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (json.ok === false) throw new Error(json.error ?? "저장 실패");

        const cached = consultRecordsCache.get(studentId)?.records ?? {};
        consultRecordsCache.set(studentId, {
          fetchedAt: Date.now(),
          records: {
            ...cached,
            [type]: {
              ...(cached[type] ?? {}),
              ...payload,
            },
          },
        });

        setMeta((prev) => ({ ...prev, [type]: { saving: false, saved: true } }));

        const updatedFilledTypes = (memos[type] ?? "").trim()
          ? Array.from(new Set([...filledTypesRef.current, type]))
          : filledTypesRef.current.filter((currentType) => currentType !== type);
        filledTypesRef.current = updatedFilledTypes;
        onFilledTypesChange?.(studentId, updatedFilledTypes);

        setTimeout(() => {
          setMeta((prev) => ({ ...prev, [type]: { ...prev[type], saved: false } }));
        }, 2500);
      } catch (error) {
        console.error("[ConsultPanel] save error", error);
        setMeta((prev) => ({ ...prev, [type]: { saving: false, saved: false } }));
        alert("저장 중 오류가 발생했습니다.");
      }
    },
    [memos, onFilledTypesChange, studentId, studentInfo]
  );

  const handleTitleMouseDown = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const rect = panelRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragOffsetRef.current = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    setIsDragging(true);
    event.preventDefault();
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const onMove = (event: MouseEvent) => {
      setPosition({
        x: Math.max(0, event.clientX - dragOffsetRef.current.x),
        y: Math.max(0, event.clientY - dragOffsetRef.current.y),
      });
    };
    const onUp = () => setIsDragging(false);

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, [isDragging]);

  const handleResizeMouseDown = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    resizeRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      startWidth: sizeRef.current.width,
      startHeight: sizeRef.current.height,
    };
  }, []);

  useEffect(() => {
    const onMove = (event: MouseEvent) => {
      if (!resizeRef.current) return;
      const { startX, startY, startWidth, startHeight } = resizeRef.current;
      setSize({
        width: Math.max(400, startWidth + (event.clientX - startX)),
        height: Math.max(300, startHeight + (event.clientY - startY)),
      });
    };
    const onUp = () => {
      resizeRef.current = null;
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, []);

  if (!mounted) return null;

  const panel = (
    <div
      ref={panelRef}
      className={`${classes.panel} ${isMinimized ? classes.minimized : ""}`}
      style={{
        left: position.x,
        top: position.y,
        width: size.width,
        ...(isMinimized ? {} : { height: size.height }),
      }}
    >
      <div
        className={`${classes.titleBar} ${isDragging ? classes.dragging : ""}`}
        onMouseDown={handleTitleMouseDown}
      >
        <div className={classes.titleLeft}>
          <span className={classes.titleText}>상담내역</span>
        </div>

        <div className={classes.actions}>
          {!isMinimized && !isLoading ? (
            <>
              <button
                type="button"
                className={classes.actionBtn}
                onMouseDown={(event) => event.stopPropagation()}
                onClick={handleCollapseAll}
              >
                모두 닫기
              </button>
              <button
                type="button"
                className={classes.actionBtn}
                onMouseDown={(event) => event.stopPropagation()}
                onClick={handleExpandAll}
              >
                모두 펼치기
              </button>
            </>
          ) : null}
          <button
            type="button"
            className={classes.actionBtn}
            onMouseDown={(event) => event.stopPropagation()}
            onClick={() => setIsMinimized((value) => !value)}
            title={isMinimized ? "펼치기" : "최소화"}
          >
            {isMinimized ? "+" : "-"}
          </button>
          <button
            type="button"
            className={`${classes.actionBtn} ${classes.closeBtn}`}
            onMouseDown={(event) => event.stopPropagation()}
            onClick={onClose}
            title="닫기"
          >
            x
          </button>
        </div>
      </div>

      {!isMinimized ? (
        <div className={classes.body}>
          <div className={classes.studentInfo}>
            <span className={classes.studentName}>{studentInfo.name}</span>
            {studentInfo.branch ? <span className={classes.infoBadge}>{studentInfo.branch}</span> : null}
            {studentInfo.school ? <span className={classes.infoBadge}>{studentInfo.school}</span> : null}
            {studentInfo.grade ? <span className={classes.infoBadge}>{studentInfo.grade}학년</span> : null}
          </div>

          {isLoading ? (
            <div className={classes.globalLoading}>상담 내역을 불러오는 중...</div>
          ) : (
            <div className={classes.sections}>
              {CONSULT_TYPES.map((type) => {
                const isOpen = openSections.has(type);
                const sectionMeta = meta[type];

                return (
                  <div
                    key={type}
                    className={`${classes.section} ${isOpen ? classes.sectionOpen : ""}`}
                  >
                    <button
                      type="button"
                      className={classes.sectionHeader}
                      onClick={() => handleSectionToggle(type)}
                    >
                      <span className={classes.sectionTitle}>{CONSULT_TYPE_LABELS[type]}</span>
                      <span className={`${classes.chevron} ${isOpen ? classes.chevronOpen : ""}`}>
                        {isOpen ? "▲" : "▼"}
                      </span>
                    </button>

                    {isOpen ? (
                      <div className={classes.sectionBody}>
                        <textarea
                          className={classes.textarea}
                          value={memos[type]}
                          onChange={(event) =>
                            setMemos((prev) => ({ ...prev, [type]: event.target.value }))
                          }
                          placeholder="상담 내용을 입력하세요..."
                        />
                        <div className={classes.sectionFooter}>
                          <button
                            type="button"
                            className={`${classes.sectionSaveBtn} ${sectionMeta.saved ? classes.sectionSavedBtn : ""}`}
                            onClick={() => void handleSave(type)}
                            disabled={sectionMeta.saving}
                          >
                            {sectionMeta.saving
                              ? "저장 중..."
                              : sectionMeta.saved
                              ? "저장됨"
                              : "저장하기"}
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : null}

      {!isMinimized ? (
        <div className={classes.resizeHandle} onMouseDown={handleResizeMouseDown} />
      ) : null}
    </div>
  );

  return createPortal(panel, document.body);
}
