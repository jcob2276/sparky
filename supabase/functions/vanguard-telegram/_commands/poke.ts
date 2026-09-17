import { safeSendTelegram } from "../_utils/helpers.ts";
import { DEFAULT_REPLY_KEYBOARD } from "../_utils/constants.ts";
import { getTodayWarsaw, WARSAW_TZ, warsawOffsetSuffix } from "@vanguard/domain";

export function parsePokeTime(rawTime: string, now = new Date()): { date: Date; display: string } | null {
  const trimmed = rawTime.trim().toLowerCase();

  // Relative: za 15m, za 30 min, za 2h, za 1h30m
  const relMatch = trimmed.match(/^za\s+(?:(\d+)\s*h(?:our|ours|odz|odziny)?)?\s*(?:(\d+)\s*(?:m|min|minut|minuty))?$/i);
  if (relMatch && (relMatch[1] || relMatch[2])) {
    const hours = parseInt(relMatch[1] || "0", 10);
    const minutes = parseInt(relMatch[2] || "0", 10);
    const totalMs = (hours * 60 + minutes) * 60 * 1000;
    if (totalMs > 0) {
      const target = new Date(now.getTime() + totalMs);
      const timeStr = target.toLocaleTimeString("pl-PL", { timeZone: WARSAW_TZ, hour: "2-digit", minute: "2-digit" });
      return { date: target, display: timeStr };
    }
  }

  // Absolute: 14:00, 14.30, 9:00
  const absMatch = trimmed.match(/^(\d{1,2})[:.](\d{2})$/);
  if (absMatch) {
    const hours = parseInt(absMatch[1], 10);
    const minutes = parseInt(absMatch[2], 10);
    if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
      const todayStr = getTodayWarsaw();
      const offset = warsawOffsetSuffix(now);
      const isoStr = `${todayStr}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00${offset}`;
      let target = new Date(isoStr);
      // If already past today, schedule for tomorrow
      if (target.getTime() <= now.getTime()) {
        target = new Date(target.getTime() + 24 * 60 * 60 * 1000);
      }
      const display = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
      return { date: target, display };
    }
  }

  return null;
}

export async function handlePokeCommand(
  text: string,
  chatId: number,
  telegramToken: string,
  supabase: any,
  vanguardUserId: string,
): Promise<void> {
  // Format: /poke 14:00 diale lub /remind za 30m sprawdzić pocztę
  const clean = text.replace(/^\/(?:poke|remind|przypomnij)\s*/i, "").trim();
  if (!clean) {
    await safeSendTelegram(
      chatId,
      "⏰ Podaj czas i treść przypomnienia, np.:\n`/poke 14:00 sprawdzić diale`\n`/poke za 2h jak poszedł call`",
      telegramToken,
      { reply_markup: DEFAULT_REPLY_KEYBOARD },
    );
    return;
  }

  // Try matching time part
  let parsed: { date: Date; display: string } | null = null;
  let reminderContent = "";

  // Check if starts with "za X"
  if (/^za\s+\d+/i.test(clean)) {
    const words = clean.split(/\s+/);
    // Could be "za 30m <content>" or "za 2h 30m <content>"
    if (words.length >= 3 && /^\d+h/i.test(words[1]) && /^\d+m/i.test(words[2])) {
      parsed = parsePokeTime(`${words[0]} ${words[1]} ${words[2]}`);
      reminderContent = words.slice(3).join(" ");
    } else if (words.length >= 2) {
      parsed = parsePokeTime(`${words[0]} ${words[1]}`);
      reminderContent = words.slice(2).join(" ");
    }
  } else {
    // Starts with HH:MM
    const firstSpace = clean.indexOf(" ");
    if (firstSpace !== -1) {
      const timePart = clean.slice(0, firstSpace);
      parsed = parsePokeTime(timePart);
      reminderContent = clean.slice(firstSpace + 1).trim();
    }
  }

  if (!parsed || !reminderContent) {
    await safeSendTelegram(
      chatId,
      "⚠️ Nie zrozumiałem godziny. Użyj formatu np.:\n`/poke 14:00 diale` lub `/poke za 45m trening`",
      telegramToken,
      { reply_markup: DEFAULT_REPLY_KEYBOARD },
    );
    return;
  }

  try {
    const { error } = await supabase.from("outbound_messages").insert({
      user_id: vanguardUserId,
      chat_id: chatId,
      payload: {
        method: "sendMessage",
        body: {
          chat_id: chatId,
          text: `🎯 Zobowiązanie: ${reminderContent}\nStatus wykonania:`,
          reply_markup: {
            inline_keyboard: [
              [
                { text: "✅ Zrobione", callback_data: "contract_done" },
                { text: "⏳ +1h", callback_data: "contract_snooze_60" },
                { text: "🛑 Odpuść świadomie", callback_data: "contract_drop" }
              ]
            ]
          },
        },
      },
      send_after: parsed.date.toISOString(),
      status: "pending",
      priority: 10,
      dedupe_key: `poke_${chatId}_${Date.now()}`,
    });

    if (error) throw error;

    await safeSendTelegram(
      chatId,
      `⏰ Zapisałem poke na ${parsed.display}: „${reminderContent}”. Odezwię się punktualnie.`,
      telegramToken,
      { reply_markup: DEFAULT_REPLY_KEYBOARD },
    );
  } catch (err) {
    console.error("[commands] /poke failed:", err);
    await safeSendTelegram(chatId, "❌ Błąd zapisu przypomnienia.", telegramToken);
  }
}
