"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { AdminHeader } from "@/components/AdminHeader";
import styles from "@/components/YogangGuidePage.module.css";
import {
  getUniversityLogoMap,
  getUniversityLogoUrl,
  type UniversityLogoMap,
} from "@/lib/universityLogoMap";
import { getUniversityThemeColor } from "@/lib/universityThemeMap";
import type {
  YogangCard,
  YogangCategoryMain,
  YogangDataset,
  YogangDetail,
  YogangSilgiRow,
} from "@/lib/yogang-data";

type YogangGuidePageProps = {
  categoryMain: YogangCategoryMain;
};

type InfoField = {
  key: keyof YogangDetail;
  label: string;
};

type FilterOption = {
  label: string;
  value: string;
};

type EnrichedCard = YogangCard & {
  university: string;
  department: string;
};

const sectionFields: Array<{
  title: string;
  description: string;
  fields: InfoField[];
}> = [
  {
    title: "기본 정보",
    description: "대학, 학과, 전형 구분처럼 가장 먼저 확인해야 할 식별 정보를 정리했습니다.",
    fields: [
      { key: "university", label: "대학교" },
      { key: "department", label: "학과" },
      { key: "category_main", label: "대분류" },
      { key: "category_sub", label: "소분류" },
      { key: "admission_title", label: "전형명" },
    ],
  },
  {
    title: "지원 자격 / 전형 요약",
    description: "지원 가능 대상과 전형 흐름을 빠르게 읽을 수 있도록 묶었습니다.",
    fields: [
      { key: "eligibility", label: "지원 자격" },
      { key: "selection_summary", label: "전형 요약" },
    ],
  },
  {
    title: "반영 방식",
    description: "수능, 학생부, 면접, 논술, 실기 메모를 한 화면에서 비교할 수 있습니다.",
    fields: [
      { key: "csat_reflection", label: "수능 반영" },
      { key: "student_record_reflection", label: "학생부 반영" },
      { key: "interview", label: "면접" },
      { key: "essay", label: "논술" },
      { key: "silgi_note", label: "실기 비고" },
    ],
  },
  {
    title: "비고 / 출처",
    description: "추가 안내 문구와 원문 링크를 확인할 수 있습니다.",
    fields: [
      { key: "notes", label: "비고" },
      { key: "source_url", label: "출처 URL" },
    ],
  },
];

const scheduleFields: InfoField[] = [
  { key: "schedule_apply", label: "원서 접수" },
  { key: "schedule_doc", label: "서류 제출" },
  { key: "schedule_test", label: "고사 일정" },
  { key: "schedule_pass", label: "합격 발표" },
];

const EMPTY_DATASET: YogangDataset = {
  cards: [],
  details: [],
  silgiRows: [],
};

const categoryRoutes: Record<YogangCategoryMain, string> = {
  수시: "/guides/early",
  정시: "/guides/regular",
};

const mainFilterOptions: FilterOption[] = [
  { label: "정시", value: "정시" },
  { label: "수시", value: "수시" },
];

export function YogangGuidePage({ categoryMain }: YogangGuidePageProps) {
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [logoMap, setLogoMap] = useState<UniversityLogoMap>({});
  const [dataset, setDataset] = useState<YogangDataset>(EMPTY_DATASET);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [subFilter, setSubFilter] = useState("전체");
  const [regionFilter, setRegionFilter] = useState("전체");
  const [universityQuery, setUniversityQuery] = useState("");
  const [departmentQuery, setDepartmentQuery] = useState("");

  const deferredUniversityQuery = useDeferredValue(universityQuery.trim());
  const deferredDepartmentQuery = useDeferredValue(departmentQuery.trim());

  const detailsByCardId = useMemo(
    () => new Map(dataset.details.map((detail) => [detail.card_id, detail])),
    [dataset.details]
  );

  const cards = useMemo(
    () => dataset.cards.filter((card) => card.category_main === categoryMain),
    [categoryMain, dataset.cards]
  );

  const enrichedCards = useMemo<EnrichedCard[]>(
    () =>
      cards.map((card) => {
        const detail = detailsByCardId.get(card.card_id);

        return {
          ...card,
          university: detail?.university ?? "",
          department: detail?.department ?? card.card_title,
        };
      }),
    [cards, detailsByCardId]
  );

  const subOptions = useMemo<FilterOption[]>(
    () => [{ label: "전체", value: "전체" }, ...getSubFilterOptions(enrichedCards)],
    [enrichedCards]
  );

  const regionOptions = useMemo<FilterOption[]>(
    () => [{ label: "전체", value: "전체" }, ...getRegionFilterOptions(enrichedCards)],
    [enrichedCards]
  );

  const filteredCards = useMemo(
    () =>
      enrichedCards.filter((card) => {
        const matchesSub = subFilter === "전체" || card.category_sub === subFilter;
        const matchesRegion = regionFilter === "전체" || card.region === regionFilter;
        const matchesUniversity =
          deferredUniversityQuery === "" || card.university.includes(deferredUniversityQuery);
        const matchesDepartment =
          deferredDepartmentQuery === "" || card.department.includes(deferredDepartmentQuery);

        return matchesSub && matchesRegion && matchesUniversity && matchesDepartment;
      }),
    [deferredDepartmentQuery, deferredUniversityQuery, enrichedCards, regionFilter, subFilter]
  );

  const selectedDetail = selectedCardId ? detailsByCardId.get(selectedCardId) ?? null : null;
  const selectedCard =
    filteredCards.find((card) => card.card_id === selectedCardId)
    ?? enrichedCards.find((card) => card.card_id === selectedCardId)
    ?? null;

  const silgiRows = useMemo(
    () =>
      selectedCardId
        ? dataset.silgiRows
            .filter((row) => row.card_id === selectedCardId)
            .sort((left, right) => Number(left.event_order) - Number(right.event_order))
        : [],
    [dataset.silgiRows, selectedCardId]
  );

  const showSilgiTable =
    !!selectedDetail && (selectedDetail.category_sub === "실기" || selectedCard?.has_silgi === "Y");

  useEffect(() => {
    let active = true;

    Promise.all([
      getUniversityLogoMap(),
      fetch("/api/yogang", {
        method: "GET",
        cache: "no-store",
      }).then(async (response) => {
        if (!response.ok) {
          throw new Error(`입시요강 데이터를 불러오지 못했습니다. (${response.status})`);
        }

        const result = (await response.json()) as {
          ok?: boolean;
          error?: string;
          cards?: YogangCard[];
          details?: YogangDetail[];
          silgiRows?: YogangSilgiRow[];
        };

        if (!result.ok) {
          throw new Error(result.error || "입시요강 데이터를 불러오지 못했습니다.");
        }

        return {
          cards: Array.isArray(result.cards) ? result.cards : [],
          details: Array.isArray(result.details) ? result.details : [],
          silgiRows: Array.isArray(result.silgiRows) ? result.silgiRows : [],
        } satisfies YogangDataset;
      }),
    ])
      .then(([nextLogoMap, nextDataset]) => {
        if (!active) {
          return;
        }

        setLogoMap(nextLogoMap);
        setDataset(nextDataset);
        setLoadError("");
      })
      .catch((error) => {
        if (!active) {
          return;
        }

        setLogoMap({});
        setDataset(EMPTY_DATASET);
        setLoadError(error instanceof Error ? error.message : "입시요강 데이터를 불러오지 못했습니다.");
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedCardId) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedCardId(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [selectedCardId]);

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <AdminHeader
          isSuperAdmin
          fallbackActiveKey={categoryMain === "수시" ? "early-guide" : "regular-guide"}
        />

        <section className={styles.topPanel}>
          <div className={styles.filterPanel}>
            <div className={`${styles.filterRow} ${styles.mainFilterRow}`}>
              <span className={styles.filterLabel}>구분</span>
              <div className={styles.segmentedTabs}>
                {mainFilterOptions.map((option) => {
                  const isActive = option.value === categoryMain;

                  return (
                    <Link
                      key={option.value}
                      href={categoryRoutes[option.value as YogangCategoryMain]}
                      className={`${styles.segmentedTab} ${isActive ? styles.segmentedTabActive : ""}`}
                    >
                      {option.label}
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className={styles.filterRow}>
              <span className={styles.filterLabel}>모집</span>
              <div className={styles.chipWrap}>
                {subOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`${styles.filterChip} ${subFilter === option.value ? styles.filterChipActive : ""}`}
                    onClick={() => setSubFilter(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.filterRow}>
              <span className={styles.filterLabel}>지역</span>
              <div className={styles.chipWrap}>
                {regionOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`${styles.filterChip} ${regionFilter === option.value ? styles.filterChipActive : ""}`}
                    onClick={() => setRegionFilter(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.filterRow}>
              <span className={styles.filterLabel}>검색</span>
              <div className={styles.searchWrap}>
                <input
                  type="search"
                  value={universityQuery}
                  onChange={(event) => setUniversityQuery(event.target.value)}
                  className={styles.searchInput}
                  placeholder="대학명"
                />
                <input
                  type="search"
                  value={departmentQuery}
                  onChange={(event) => setDepartmentQuery(event.target.value)}
                  className={styles.searchInput}
                  placeholder="학과명"
                />
              </div>
            </div>
          </div>
        </section>

        {loadError ? <section className={styles.emptyState}>{loadError}</section> : null}

        {!loadError ? (
          <>
            <div className={styles.listHeader}>
              <h2 className={styles.listTitle}>대학 리스트</h2>
              <p className={styles.listMeta}>학과수 {isLoading ? "-" : filteredCards.length}</p>
            </div>

            <section className={styles.grid}>
              {filteredCards.map((card) => {
                const themeColor = getUniversityThemeColor(card.university);
                const logoUrl = logoMap[card.university] ?? getUniversityLogoUrl(card.university);

                return (
                  <button
                    key={card.card_id}
                    type="button"
                    className={styles.card}
                    onClick={() => setSelectedCardId(card.card_id)}
                    style={{ ["--card-accent" as string]: themeColor }}
                  >
                    {/* Colored gradient header */}
                    <div className={styles.cardHeader}>
                      <div className={styles.cardHeaderTop}>
                        <div className={styles.badgeGroup}>
                          <span className={`${styles.badge} ${styles.mainBadge}`}>{displayValue(card.category_main)}</span>
                          {card.category_sub ? (
                            <span className={`${styles.badge} ${styles.mainBadge}`}>{displayValue(card.category_sub)}</span>
                          ) : null}
                        </div>
                        <span className={styles.cardYearChip}>{extractYear(card.card_id)}</span>
                      </div>
                      <div className={styles.cardHeaderLogo}>
                        <UniversityLogo university={card.university} logoUrl={logoUrl} size="card" />
                      </div>
                    </div>

                    {/* Info below header */}
                    <div className={styles.cardBody}>
                      <h3 className={styles.schoolName}>{displayValue(card.university)}</h3>
                      <p className={styles.cardTitle}>{displayValue(card.department)}</p>
                    </div>

                    <div className={styles.cardFooter}>
                      <span className={styles.cardFooterLabel}>VIEW DETAIL</span>
                      <span className={styles.cardFooterArrow} aria-hidden="true">→</span>
                    </div>
                  </button>
                );
              })}
            </section>
          </>
        ) : null}

        {!isLoading && !loadError && filteredCards.length === 0 ? (
          <section className={styles.emptyState}>조건에 맞는 입시요강 카드가 없습니다.</section>
        ) : null}
      </div>

      {selectedCard && selectedDetail ? (
        <div
          className={styles.overlay}
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedCardId(null);
            }
          }}
        >
          <div
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="yogang-modal-title"
            style={{ ["--card-accent" as string]: getUniversityThemeColor(selectedDetail.university) }}
          >
            <div className={styles.modalInner}>
              <header className={styles.modalHeader}>
                <div className={styles.modalHeaderPattern} />
                <div className={styles.modalTitleWrap}>
                  <div className={styles.badgeGroup}>
                    <span className={`${styles.badge} ${styles.mainBadge}`}>{selectedDetail.category_main}</span>
                    {showSilgiTable ? (
                      <span className={`${styles.badge} ${styles.silgiBadge}`}>실기 포함</span>
                    ) : null}
                  </div>

                  <div className={styles.modalSchoolHeader}>
                    <UniversityLogo
                      university={selectedDetail.university}
                      logoUrl={logoMap[selectedDetail.university] ?? getUniversityLogoUrl(selectedDetail.university)}
                      size="modal"
                    />
                    <div className={styles.modalSchoolText}>
                      <p className={styles.modalUniversity}>{selectedDetail.category_sub}</p>
                      <h2 id="yogang-modal-title" className={styles.modalTitle}>
                        {selectedDetail.university}
                      </h2>
                      <p className={styles.modalSubtitle}>{displayValue(selectedDetail.department)}</p>
                      <div className={styles.modalMetaChips}>
                        <span className={styles.modalMetaChip}>모집인원 {displayValue(selectedCard.recruit_count)}</span>
                        <span className={styles.modalMetaChip}>지역 {displayValue(selectedCard.region)}</span>
                        <span className={styles.modalMetaChip}>캠퍼스 {displayValue(selectedCard.campus)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <button type="button" className={styles.closeButton} onClick={() => setSelectedCardId(null)} aria-label="닫기">
                  ×
                </button>
              </header>

              <div className={styles.modalBody}>
                <section className={styles.scheduleSection}>
                  <div className={styles.sectionHeading}>
                    <div>
                      <p className={styles.sectionEyebrow}>KEY TIMELINE</p>
                      <h3 className={styles.sectionTitle}>주요 일정</h3>
                    </div>
                    <p className={styles.sectionDescription}>중요한 일정을 먼저 확인할 수 있도록 상단에 따로 배치했습니다.</p>
                  </div>
                  <div className={styles.scheduleGrid}>
                    {scheduleFields.map((field) => (
                      <article key={field.key} className={styles.scheduleCard}>
                        <p className={styles.scheduleLabel}>{field.label}</p>
                        <p className={styles.scheduleValue}>{displayValue(selectedDetail[field.key])}</p>
                      </article>
                    ))}
                  </div>
                </section>

                <div className={styles.modalContentGrid}>
                  <div className={styles.modalMainColumn}>
                    {sectionFields.map((section) => (
                      <section key={section.title} className={styles.contentSection}>
                        <div className={styles.sectionHeading}>
                          <div>
                            <p className={styles.sectionEyebrow}>DETAIL SECTION</p>
                            <h3 className={styles.sectionTitle}>{section.title}</h3>
                          </div>
                          <p className={styles.sectionDescription}>{section.description}</p>
                        </div>

                        <div className={styles.sectionCardGrid}>
                          {section.fields.map((field) => (
                            <article key={field.key} className={styles.detailCard}>
                              <p className={styles.detailLabel}>{field.label}</p>
                              {field.key === "source_url" ? (
                                <p className={styles.detailValue}>
                                  {selectedDetail.source_url ? (
                                    <a
                                      className={styles.sourceLink}
                                      href={selectedDetail.source_url}
                                      target="_blank"
                                      rel="noreferrer"
                                    >
                                      {selectedDetail.source_url}
                                    </a>
                                  ) : (
                                    "-"
                                  )}
                                </p>
                              ) : (
                                <p className={styles.detailValue}>{displayValue(selectedDetail[field.key])}</p>
                              )}
                            </article>
                          ))}
                        </div>
                      </section>
                    ))}
                  </div>

                  <aside className={styles.modalSideColumn}>
                    <section className={styles.sidePanel}>
                      <p className={styles.sidePanelEyebrow}>AT A GLANCE</p>
                      <h3 className={styles.sidePanelTitle}>핵심 요약</h3>
                      <div className={styles.sideSummaryList}>
                        <div className={styles.sideSummaryItem}>
                          <span className={styles.sideSummaryLabel}>전형 구분</span>
                          <strong className={styles.sideSummaryValue}>
                            {selectedDetail.category_main} / {selectedDetail.category_sub}
                          </strong>
                        </div>
                        <div className={styles.sideSummaryItem}>
                          <span className={styles.sideSummaryLabel}>지원 자격</span>
                          <strong className={styles.sideSummaryValue}>{displayValue(selectedDetail.eligibility)}</strong>
                        </div>
                        <div className={styles.sideSummaryItem}>
                          <span className={styles.sideSummaryLabel}>전형 요약</span>
                          <strong className={styles.sideSummaryValue}>
                            {displayValue(selectedDetail.selection_summary)}
                          </strong>
                        </div>
                      </div>
                    </section>

                    {showSilgiTable ? (
                      <section className={styles.sidePanel}>
                        <p className={styles.sidePanelEyebrow}>PRACTICAL</p>
                        <h3 className={styles.sidePanelTitle}>실기 전형 안내</h3>
                        <p className={styles.sidePanelText}>
                          실기 반영 전형입니다. 하단 표에서 종목별 기준과 점수를 확인할 수 있습니다.
                        </p>
                      </section>
                    ) : null}
                  </aside>
                </div>

                {showSilgiTable ? (
                  <section className={styles.tableSection}>
                    <div className={styles.sectionHeading}>
                      <div>
                        <p className={styles.sectionEyebrow}>PRACTICAL EXAM</p>
                        <h3 className={styles.sectionTitle}>실기표</h3>
                      </div>
                      <p className={styles.sectionDescription}>실기 종목은 event_order 오름차순 기준으로 정렬됩니다.</p>
                    </div>

                    <div className={styles.tableWrap}>
                      <table className={styles.table}>
                        <thead>
                          <tr>
                            <th>종목명</th>
                            <th>기준 1</th>
                            <th>점수 1</th>
                            <th>기준 2</th>
                            <th>점수 2</th>
                            <th>기준 3</th>
                            <th>점수 3</th>
                            <th>비고</th>
                          </tr>
                        </thead>
                        <tbody>
                          {silgiRows.map((row) => (
                            <tr key={`${row.card_id}-${row.event_order}`}>
                              <td className={styles.eventNameCell}>{displayValue(row.event_name)}</td>
                              <td>{displayValue(row.criteria_1)}</td>
                              <td>{displayValue(row.score_1)}</td>
                              <td>{displayValue(row.criteria_2)}</td>
                              <td>{displayValue(row.score_2)}</td>
                              <td>{displayValue(row.criteria_3)}</td>
                              <td>{displayValue(row.score_3)}</td>
                              <td>{displayValue(row.remarks)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function UniversityLogo({
  university,
  logoUrl,
  size,
}: {
  university: string;
  logoUrl: string;
  size: "card" | "modal";
}) {
  const [imageVisible, setImageVisible] = useState(Boolean(logoUrl));

  useEffect(() => {
    setImageVisible(Boolean(logoUrl));
  }, [logoUrl]);

  const containerClassName = size === "modal" ? styles.logoWrapModal : styles.logoWrapCard;

  return (
    <div className={containerClassName} aria-hidden="true">
      {imageVisible ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt=""
          className={styles.logoImage}
          loading="lazy"
          onError={() => setImageVisible(false)}
        />
      ) : (
        <div className={styles.logoFallback}>
          <span className={styles.logoFallbackText}>{getUniversityFallback(university)}</span>
        </div>
      )}
    </div>
  );
}

function getSubFilterOptions(cards: EnrichedCard[]) {
  const uniqueValues = Array.from(new Set(cards.map((card) => card.category_sub).filter(Boolean)));

  return uniqueValues
    .sort((left, right) => getSubOrder(left) - getSubOrder(right) || left.localeCompare(right, "ko-KR"))
    .map((value) => ({ label: value, value }));
}

function getRegionFilterOptions(cards: EnrichedCard[]) {
  const uniqueValues = Array.from(new Set(cards.map((card) => card.region).filter(Boolean)));

  return uniqueValues
    .sort((left, right) => left.localeCompare(right, "ko-KR"))
    .map((value) => ({ label: value, value }));
}

function getSubOrder(categorySub: string) {
  const orderMap: Record<string, number> = {
    교과: 1,
    종합: 2,
    실기: 3,
    논술: 4,
    면접: 5,
    가군: 6,
    나군: 7,
    다군: 8,
  };

  return orderMap[categorySub] ?? 99;
}

function getUniversityFallback(university: string) {
  const normalized = university.trim();
  return normalized ? normalized.slice(0, 1) : "U";
}

function extractYear(cardId: string) {
  const match = cardId.match(/^(\d{4})/);
  return match ? match[1] : "-";
}

function displayValue(value: string | number | null | undefined) {
  const normalized = String(value ?? "").trim();
  return normalized === "" ? "-" : normalized;
}
