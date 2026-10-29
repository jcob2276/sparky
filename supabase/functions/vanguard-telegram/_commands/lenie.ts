import { safeSendTelegram } from "../_utils/helpers.ts";
import { getWarsawDateString } from "../../_shared/time.ts";
import { DEFAULT_REPLY_KEYBOARD } from "../_utils/constants.ts";
import { fetchWorldState } from "../../_shared/worldState.ts";
import { recordLenieEpisode } from "../../_shared/repos/habitLogsRepo.ts";

export async function handleLenieCommand(
  text: string,
  chatId: number,
  telegramToken: string,
  supabase: any,
  vanguardUserId: string,
): Promise<void> {
  try {
    const raw = text.replace(/^\/lenie\s*/i, '').trim();
    const parts = raw ? raw.split('|').map(p => p.trim()) : [];
    const stimulus = parts[0] || '';
    const contextNote = parts[1] || '';

    const today = getWarsawDateString();

    // habits + habit_logs only — no stream mirror
    const episode = await recordLenieEpisode(supabase, vanguardUserId, today, { stimulus, contextNote });
    const nextStimulus = episode.stimulus;

    fetchWorldState(supabase, vanguardUserId, today, undefined, true).catch((e) => {
      console.error("[telegram] fetchWorldState forceRefresh failed:", e);
    });

    const label = stimulus ? `"${stimulus}"` : 'bez opisu';
    const totalLabel = nextStimulus && nextStimulus !== stimulus ? ` (razem dzisiaj: "${nextStimulus}")` : '';
    await safeSendTelegram(chatId, `✅ Lenie zapisane (${today})\nBodziec: ${label}${totalLabel}${contextNote ? `\nKontekst: ${contextNote}` : ''}`, telegramToken, { reply_markup: DEFAULT_REPLY_KEYBOARD });
  } catch (err) {
    console.error('[commands] /lenie failed:', err);
    await safeSendTelegram(chatId, '! Nie udało się zapisać lenie.', telegramToken);
  }
}
