/**
 * _commands/inwestycje.ts — Obsługa komendy /inwestycje i /insiderzy w Telegramie.
 * Wyświetla najnowsze transakcje polityków USA (STOCK Act) i insiderów.
 */

import { safeSendTelegram } from "../_utils/helpers.ts";
import { getRecentInsiderTrades, syncInsiderTrades, InsiderTrade } from "../../_shared/insiderTrades.ts";

export const INWESTYCJE_KEYBOARD = {
  inline_keyboard: [
    [
      { text: "🇺🇸 Donald Trump", callback_data: "inv_trump" },
      { text: "🏛 Nancy Pelosi", callback_data: "inv_pelosi" },
    ],
    [
      { text: "🟢 Tylko Kupna", callback_data: "inv_buys" },
      { text: "💻 Big Tech (NVDA/AAPL/MSFT)", callback_data: "inv_tech" },
    ],
    [
      { text: "🔄 Odśwież dane z feedu", callback_data: "inv_refresh" },
    ],
  ],
};

function formatTradeItem(t: InsiderTrade): string {
  const isBuy = t.transaction_type.toLowerCase().includes("purchase") || t.transaction_type.toLowerCase().includes("buy");
  const icon = isBuy ? "🟢" : "🔴";
  const actionName = isBuy ? "Kupno" : "Sprzedaż";
  const partyInfo = t.party ? ` (${t.party}${t.state ? `-${t.state}` : ""})` : "";
  const delayStr = typeof t.days_to_file === "number" ? ` | opóźnienie: ${t.days_to_file} dni` : "";
  const tickerStr = t.ticker ? `**${t.ticker}**` : (t.asset_name ? `**${t.asset_name.slice(0, 30)}**` : "Akcje");
  const docLink = t.doc_url ? ` · [Raport PDF](${t.doc_url})` : "";

  return (
    `👤 **${t.filer_name}**${partyInfo}\n` +
    `${icon} ${actionName}: ${tickerStr} · \`${t.amount_label || "Brak kwoty"}\`\n` +
    `📅 Zgłoszono: ${t.filing_date || "N/A"}${delayStr}${docLink}`
  );
}

export function buildInwestycjeMessage(trades: InsiderTrade[], title = "Transakcje Kongresu & Insiderów"): string {
  if (trades.length === 0) {
    return (
      `🏛️ **${title}**\n\n` +
      `Brak zarejestrowanych transakcji dla tego kryterium.\n` +
      `Kliknij *Odśwież dane z feedu* lub wpisz np. \`/inwestycje trump\`.`
    );
  }

  const items = trades.slice(0, 6).map(formatTradeItem).join("\n\n");
  return (
    `🏛️ **${title}**\n` +
    `_Publiczne dane STOCK Act / SEC (odpowiednik OrcaFolio, 100% za 0 zł)_\n\n` +
    `${items}`
  );
}

export async function handleInwestycjeCommand(
  text: string,
  chatId: number,
  telegramToken: string,
  supabase: any,
): Promise<void> {
  const query = text.replace(/^\/(?:inwestycje|insiderzy|stocks)\s*/i, "").trim().toLowerCase();

  // If table is completely empty, trigger quick auto-sync
  const { count } = await supabase.from("insider_trades").select("id", { count: "exact", head: true });
  if (!count || count === 0) {
    await safeSendTelegram(chatId, "⏳ Synchronizuję najnowsze dane ze źródeł rządowych USA...", telegramToken);
    await syncInsiderTrades(supabase, { limit: 300 });
  }

  let trades: InsiderTrade[] = [];
  let title = "Ostatnie ruchy Kongresu USA";

  if (query.includes("trump")) {
    title = "Transakcje: Donald J Trump";
    trades = await getRecentInsiderTrades(supabase, { filerName: "Trump", limit: 6 });
  } else if (query.includes("pelosi")) {
    title = "Transakcje: Nancy Pelosi";
    trades = await getRecentInsiderTrades(supabase, { filerName: "Pelosi", limit: 6 });
  } else if (query.includes("kupn") || query.includes("buy")) {
    title = "Najnowsze duże ZAKUPY akcji";
    trades = await getRecentInsiderTrades(supabase, { transactionType: "Purchase", limit: 6 });
  } else if (query.length > 0 && query.length <= 5) {
    title = `Transakcje dla spółki: ${query.toUpperCase()}`;
    trades = await getRecentInsiderTrades(supabase, { ticker: query.toUpperCase(), limit: 6 });
  } else if (query.length > 5) {
    title = `Wyniki wyszukiwania: "${query}"`;
    trades = await getRecentInsiderTrades(supabase, { filerName: query, limit: 6 });
  } else {
    trades = await getRecentInsiderTrades(supabase, { limit: 6 });
  }

  const message = buildInwestycjeMessage(trades, title);

  await safeSendTelegram(chatId, message, telegramToken, {
    reply_markup: INWESTYCJE_KEYBOARD,
    parse_mode: "Markdown",
  });
}
