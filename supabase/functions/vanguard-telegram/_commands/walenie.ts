import { safeSendTelegram } from "../_utils/helpers.ts";
import { getWarsawDateString } from "../../_shared/time.ts";
import { DEFAULT_REPLY_KEYBOARD } from "../_utils/constants.ts";
import { fetchWorldState } from "../../_shared/worldState.ts";
import { recordLenieEpisode } from "../../_shared/repos/habitLogsRepo.ts";

export async function handleWalenieCommand(
  text: string,
  chatId: number,
  telegramToken: string,
  supabase: any,
  vanguardUserId: string,
): Promise<void> {
  try {
    let dateStr = getWarsawDateString();
    let note = text.replace(/^\/(?:w|walenie|pmo)\s*/i, '').trim() || null;

    if (note) {
      const firstWord = note.split(/\s+/)[0].toLowerCase();
      if (firstWord === 'wczoraj') {
        const dYesterday = new Date(dateStr);
        dYesterday.setDate(dYesterday.getDate() - 1);
        dateStr = dYesterday.toISOString().split('T')[0];
        note = note.slice('wczoraj'.length).trim() || null;
      } else if (firstWord === 'dzis' || firstWord === 'dziś') {
        note = note.slice(firstWord.length).trim() || null;
      } else if (/^\d{4}-\d{2}-\d{2}$/.test(firstWord)) {
        dateStr = firstWord;
        note = note.slice(10).trim() || null;
      }
    }

    // habit_logs („Lenie”) is the only write path; no stream mirror.
    await recordLenieEpisode(supabase, vanguardUserId, dateStr, { contextNote: note });

    fetchWorldState(supabase, vanguardUserId, dateStr, undefined, true).catch((e: unknown) => {
      console.error('[telegram] fetchWorldState forceRefresh failed:', e);
    });

    await safeSendTelegram(
      chatId,
      `💧 Zanotowano epizod PMO / ejakulacji (${dateStr}).${note ? `\nNotatka: ${note}` : ''}`,
      telegramToken,
      { disable_notification: true, reply_markup: DEFAULT_REPLY_KEYBOARD }
    );
  } catch (err) {
    console.error('[commands] /walenie failed:', err);
    await safeSendTelegram(chatId, '! Nie udało się zapisać epizodu.', telegramToken);
  }
}
