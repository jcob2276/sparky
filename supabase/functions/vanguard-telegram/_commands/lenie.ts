import { safeSendTelegram } from "../_utils/helpers.ts";
import { getWarsawDateString } from "../../_shared/time.ts";
import { DEFAULT_REPLY_KEYBOARD } from "../_utils/constants.ts";
import { fetchWorldState } from "../../_shared/worldState.ts";
import { recordLenieEpisode } from "../../_shared/repos/habitLogsRepo.ts";

/** Opcjonalny prefiks daty: „wczoraj”, „dziś” albo RRRR-MM-DD; reszta tekstu to bodziec i kontekst. */
export function parseLenieDate(raw: string, today: string): { date: string; rest: string } {
  const firstWord = raw.split(/\s+/)[0]?.toLowerCase() ?? '';
  if (firstWord === 'wczoraj') {
    const [y, m, d] = today.split('-').map(Number);
    const yesterday = new Date(Date.UTC(y, m - 1, d - 1)).toISOString().slice(0, 10);
    return { date: yesterday, rest: raw.slice(firstWord.length).trim() };
  }
  if (firstWord === 'dzis' || firstWord === 'dziś') return { date: today, rest: raw.slice(firstWord.length).trim() };
  if (/^\d{4}-\d{2}-\d{2}$/.test(firstWord)) return { date: firstWord, rest: raw.slice(firstWord.length).trim() };
  return { date: today, rest: raw };
}

export async function handleLenieCommand(
  text: string,
  chatId: number,
  telegramToken: string,
  supabase: any,
  vanguardUserId: string,
): Promise<void> {
  try {
    const { date, rest } = parseLenieDate(text.replace(/^\/lenie\s*/i, '').trim(), getWarsawDateString());
    const parts = rest ? rest.split('|').map(p => p.trim()) : [];
    const stimulus = parts[0] || '';
    const contextNote = parts[1] || '';

    // habits + habit_logs: jedyny zapis tego zdarzenia (bez lustra w streamie i bez kopii w behavior_log)
    const episode = await recordLenieEpisode(supabase, vanguardUserId, date, { stimulus, contextNote });
    const nextStimulus = episode.stimulus;

    fetchWorldState(supabase, vanguardUserId, date, undefined, true).catch((e) => {
      console.error("[telegram] fetchWorldState forceRefresh failed:", e);
    });

    const label = stimulus ? `"${stimulus}"` : 'bez opisu';
    const totalLabel = nextStimulus && nextStimulus !== stimulus ? ` (razem tego dnia: "${nextStimulus}")` : '';
    const lines = [`✅ Lenie zapisane (${date})`, `Bodziec: ${label}${totalLabel}`];
    if (contextNote) lines.push(`Kontekst: ${contextNote}`);
    await safeSendTelegram(chatId, lines.join('\n'), telegramToken, { reply_markup: DEFAULT_REPLY_KEYBOARD });
  } catch (err) {
    console.error('[commands] /lenie failed:', err);
    await safeSendTelegram(chatId, '! Nie udało się zapisać lenie.', telegramToken);
  }
}
