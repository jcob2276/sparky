import { safeSendTelegram } from "../_utils/helpers.ts";
import { getWarsawDateString } from "../../_shared/time.ts";
import { DEFAULT_REPLY_KEYBOARD } from "../_utils/constants.ts";
import { fetchWorldState } from "../../_shared/worldState.ts";
import { insertStreamRecord } from "../../_shared/repos/streamRepo.ts";
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

    // habits + habit_logs: jedyny zapis tego zdarzenia (kopię w behavior_log utrzymuje trigger)
    const episode = await recordLenieEpisode(supabase, vanguardUserId, today, { stimulus, contextNote });
    const nextStimulus = episode.stimulus;
    const nextContext = episode.contextNote;

    // Mirror to vanguard_stream
    const count = episode.count;
    const streamParts = [`[LOG NAWYKU] Lenie x${count}`];
    if (nextStimulus) streamParts.push(`Bodziec: ${nextStimulus}`);
    if (nextContext) streamParts.push(`Kontekst: ${nextContext}`);

    try {
      await insertStreamRecord(supabase, {
        user_id: vanguardUserId,
        content: streamParts.join(' · '),
        source: 'habit_log',
        category: 'behavior',
        classification: 'habit_log',
        metadata: { habit_name: 'Lenie', is_positive: false, date: today },
      });
    } catch (streamErr) {
      console.warn('[commands] /lenie stream mirror failed:', (streamErr as Error).message);
    }

    // Invalidate world state cache
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
