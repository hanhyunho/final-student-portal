import {
  getConfiguredSheetId,
  getSheetDebugInfo,
  getYogangCardsSheet,
  getYogangDetailsSheet,
  getYogangSilgiSheet,
} from "@/lib/sheets";

export const dynamic = "force-dynamic";

function s(value: unknown) {
  return String(value ?? "").trim();
}

function dedupeByCardId<T extends { card_id: string }>(rows: T[]) {
  const map = new Map<string, T>();

  rows.forEach((row) => {
    const cardId = s(row.card_id);
    if (!cardId) {
      return;
    }
    map.set(cardId, { ...row, card_id: cardId });
  });

  return Array.from(map.values());
}

export async function GET() {
  try {
    const [cards, details, silgiRows, cardsDebug, detailsDebug, silgiDebug] = await Promise.all([
      getYogangCardsSheet(),
      getYogangDetailsSheet(),
      getYogangSilgiSheet(),
      getSheetDebugInfo("yogang_cards"),
      getSheetDebugInfo("yogang_details"),
      getSheetDebugInfo("yogang_silgi"),
    ]);

    return Response.json({
      ok: true,
      success: true,
      spreadsheetId: getConfiguredSheetId(),
      sheetNames: ["yogang_cards", "yogang_details", "yogang_silgi", "로고주소"],
      cardsHeader: cardsDebug.normalizedHeader,
      detailsHeader: detailsDebug.normalizedHeader,
      silgiHeader: silgiDebug.normalizedHeader,
      cardsRawHeader: cardsDebug.rawHeader,
      detailsRawHeader: detailsDebug.rawHeader,
      silgiRawHeader: silgiDebug.rawHeader,
      cardsRowCount: cardsDebug.rowCount,
      detailsRowCount: detailsDebug.rowCount,
      silgiRowCount: silgiDebug.rowCount,
      cardsFilteredCount: cards.length,
      detailsFilteredCount: details.length,
      silgiFilteredCount: silgiRows.length,
      cards: dedupeByCardId(cards),
      details: dedupeByCardId(details),
      silgiRows: silgiRows.map((row) => ({
        ...row,
        card_id: s(row.card_id),
        event_order: Number(row.event_order || 0),
      })),
    });
  } catch (error: unknown) {
    return Response.json(
      {
        ok: false,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        spreadsheetId: getConfiguredSheetId(),
        sheetNames: ["yogang_cards", "yogang_details", "yogang_silgi", "로고주소"],
        cards: [],
        details: [],
        silgiRows: [],
      },
      { status: 500 }
    );
  }
}
