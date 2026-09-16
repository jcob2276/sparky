import { safeSendTelegram } from "../_utils/helpers.ts";
import { getWarsawDateString, combineDateTimeWarsawISO } from "../../_shared/time.ts";
import { deepseekChat, parseJsonFromContent } from "../../_shared/deepseek.ts";
import { LLM_TASKS } from "../../_shared/llm/tasks.ts";
import { DEFAULT_REPLY_KEYBOARD } from "../_utils/constants.ts";
import { fetchWorldState } from "../../_shared/worldState.ts";
import { sendChatAction } from "../../_shared/telegram.ts";
import {
  buildTodoInsertRow,
  type TodoPriority,
} from "@vanguard/domain";
import { normalizePriority, deterministicTodoParse } from "./todoParse.ts";

export async function handleTodoCommand(
  text: string,
  chatId: number,
  telegramToken: string,
  supabase: any,
  vanguardUserId: string,
  deepseekApiKey = '',
  inboxRecordId?: string,
): Promise<void> {
  try {
    const raw = text.replace(/^\/todo\s*/i, '').trim();
    if (!raw) {
      await safeSendTelegram(chatId, '! Podaj treść zadania.', telegramToken, { reply_markup: DEFAULT_REPLY_KEYBOARD });
      return;
    }

    await sendChatAction(telegramToken, chatId, "typing", { direct: true });

    const todayStr = getWarsawDateString();
    const dayName = new Intl.DateTimeFormat('pl-PL', { timeZone: 'Europe/Warsaw', weekday: 'long' }).format(new Date());
    const tomorrowStr = (() => {
      const d = new Date(todayStr + 'T12:00:00Z');
      d.setUTCDate(d.getUTCDate() + 1);
      return d.toISOString().split('T')[0];
    })();

    let title = raw;
    let dueDate: string | null = null;
    let dueTime: string | null = null;
    let priority: TodoPriority = 'normal';
    let notes = '';

    const deterministicResult = deterministicTodoParse(raw, todayStr);
    if (deterministicResult) {
      title = deterministicResult.title;
      dueDate = deterministicResult.due_date;
      dueTime = deterministicResult.due_time;
      priority = deterministicResult.priority;
      notes = deterministicResult.notes;
    } else {
      const systemPrompt = `Jesteś parserem zadań (TODO) w systemie Vanguard.
Przetwórz wpis użytkownika i zwróć dane w formacie JSON.
Użytkownik pisze w języku polskim.
Dzisiejsza data: ${todayStr} (dzień tygodnia: ${dayName}).
Jutrzejsza data: ${tomorrowStr}.

Zasady parsowania terminów:
- "jutro" -> due_date = jutrzejsza data
- "dziś", "dzisiaj" -> due_date = dzisiejsza data
- "poniedziałek", "wtorek", "środa", "czwartek", "piątek", "sobota", "niedziela" -> due_date = najbliższy dany dzień tygodnia
- "za tydzień" -> due_date = dzisiejsza data + 7 dni
- hours np. "o 14", "15:30" -> due_time = "14:00" lub "15:30"
- priorities np. "pilne", "ASAP", "na wczoraj", exclamation marks "!" -> priority = "urgent"
- priorities np. "kiedyś", "low", "niski" -> priority = "low"

Wymagany format wyjściowy JSON:
{
  "title": "oczyszczony tytuł zadania (bez słów kluczowych dat/godzin/priorytetów, np. 'kupić mleko')",
  "due_date": "RRRR-MM-DD lub null",
  "due_time": "GG:MM lub null",
  "priority": "urgent | high | normal | low",
  "notes": "wszelkie dodatkowe uwagi lub kontekst"
}

Zwróć TYLKO czysty obiekt JSON.`;

      const chatRes = await deepseekChat({
        apiKey: deepseekApiKey,
        ...LLM_TASKS.structured,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: raw }
        ],
        temperature: 0.0,
      }).catch((e) => {
        console.error('[commands] LLM parse failed, falling back to raw:', e);
        return null;
      });

      if (chatRes) {
        const parsed = parseJsonFromContent(chatRes.content);
        if (parsed) {
          title = (parsed.title as string) || title;
          dueDate = (parsed.due_date as string) || null;
          dueTime = (parsed.due_time as string) || null;
          priority = normalizePriority(parsed.priority);
          notes = (parsed.notes as string) || '';
        }
      }
    }

    const scheduledTime = dueDate && dueTime
      ? combineDateTimeWarsawISO(dueDate, dueTime)
      : null;

    const payload = buildTodoInsertRow({
      user_id: vanguardUserId,
      title,
      notes,
      priority,
      due_date: dueDate,
      scheduled_time: scheduledTime,
      reminder_at: scheduledTime,
      tags: ['telegram', ...(scheduledTime ? ['reminder'] : [])],
    });

    const { data: inserted, error } = await supabase.from('todo_items').insert(payload).select('id').single();
    if (error) throw error;

    fetchWorldState(supabase, vanguardUserId, todayStr, undefined, true).catch((e) => {
      console.error("[telegram] fetchWorldState forceRefresh failed:", e);
    });

    const contextParts: string[] = [];
    if (dueDate) {
      if (dueDate === todayStr) {
        contextParts.push("Dzisiaj");
      } else if (dueDate === tomorrowStr) {
        contextParts.push("Jutro");
      } else {
        contextParts.push(dueDate);
      }
    }
    if (dueTime) {
      contextParts.push(dueTime);
    }
    if (priority && priority !== 'normal') {
      const prioLbl: Record<TodoPriority, string> = {
        urgent: '🔴 pilne', high: '🟠 wysoki priorytet', normal: '', low: '⬇️ niski priorytet'
      };
      contextParts.push(prioLbl[priority]);
    }
    const contextLine = contextParts.join(' · ');

    const messageText = `✓ Dodano zadanie\n\n${String(payload.title)}${contextLine ? `\n${contextLine}` : ''}`;

    await safeSendTelegram(chatId, messageText, telegramToken, {
      reply_markup: {
        inline_keyboard: [[{ text: 'Cofnij', callback_data: `todo_undo:${inserted.id}` }]],
      },
    });
  } catch (err) {
    console.error('[commands] /todo failed:', err);
    
    const inlineKeyboard = inboxRecordId ? [[
      { text: 'Spróbuj ponownie', callback_data: `retry_inbox:${inboxRecordId}` },
      { text: 'Zapisz jako notatkę', callback_data: `save_as_note:${inboxRecordId}` }
    ]] : undefined;

    await safeSendTelegram(chatId, '! Nie udało się zapisać zadania.', telegramToken, {
      reply_markup: inlineKeyboard ? { inline_keyboard: inlineKeyboard } : undefined
    });
  }
}
