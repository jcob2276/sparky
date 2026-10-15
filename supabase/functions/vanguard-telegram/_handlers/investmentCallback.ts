import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { editMessageText, answerCallbackQuery } from "../../_shared/telegram.ts";
import { getRecentInsiderTrades, syncInsiderTrades, type InsiderTrade } from "../../_shared/insiderTrades.ts";
import { buildInwestycjeMessage, INWESTYCJE_KEYBOARD } from "../_commands/inwestycje.ts";

export async function handleInvestmentCallback(
  data: string,
  callbackId: string,
  chatId: number,
  messageId: number,
  supabase: SupabaseClient,
  telegramToken: string,
): Promise<void> {
  await answerCallbackQuery(telegramToken, callbackId, { text: "⏳ Ładuję dane..." });

  let title = "Ostatnie ruchy Kongresu USA";
  let trades: InsiderTrade[] = [];

  if (data === "inv_trump") {
    title = "Transakcje: Donald J Trump";
    trades = await getRecentInsiderTrades(supabase, { filerName: "Trump", limit: 6 });
  } else if (data === "inv_pelosi") {
    title = "Transakcje: Nancy Pelosi";
    trades = await getRecentInsiderTrades(supabase, { filerName: "Pelosi", limit: 6 });
  } else if (data === "inv_buys") {
    title = "Najnowsze duże ZAKUPY akcji";
    trades = await getRecentInsiderTrades(supabase, { transactionType: "Purchase", limit: 6 });
  } else if (data === "inv_tech") {
    title = "Big Tech (NVDA / AAPL / MSFT / AMZN)";
    const all = await getRecentInsiderTrades(supabase, { limit: 100 });
    trades = all.filter((t) => ["NVDA", "AAPL", "MSFT", "AMZN", "GOOGL", "META", "TSLA"].includes(t.ticker || "")).slice(0, 6);
  } else if (data === "inv_refresh") {
    title = "Zaktualizowano z feedu rządowego USA";
    await syncInsiderTrades(supabase, { limit: 300 });
    trades = await getRecentInsiderTrades(supabase, { limit: 6 });
  }

  const message = buildInwestycjeMessage(trades, title);
  await editMessageText(telegramToken, chatId, messageId, message, INWESTYCJE_KEYBOARD.inline_keyboard, { direct: true });
}
