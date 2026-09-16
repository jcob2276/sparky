import { deepseekChat } from "../_shared/deepseek.ts";
import { LLM_TASKS } from "../_shared/llm/tasks.ts";
import type { StreamRow, DailyWinsRow, DailyAggregateRow } from "./recapTypes.ts";

function compactRows(rows: StreamRow[], limit = 12): string {
  return rows.slice(0, limit).map((row, index) => {
    const time = new Date(row.created_at).toLocaleTimeString("pl-PL", {
      timeZone: "Europe/Warsaw",
      hour: "2-digit",
      minute: "2-digit",
    });
    const text = String(row.content || "").replace(/\s+/g, " ").trim().slice(0, 700);
    return `${index + 1}. [${time}] ${text}`;
  }).join("\n");
}

export async function generateDayNarrative(apiKey: string, params: {
  voiceRows: StreamRow[];
  streamRows: StreamRow[];
  frictionRows: Array<Record<string, unknown>>;
  wins: DailyWinsRow | null;
  todos: Array<{ title?: string | null }> | null;
  agg: DailyAggregateRow | null;
}): Promise<string | null> {
  const voiceBlock = params.voiceRows.length
    ? compactRows(params.voiceRows, 15)
    : "Brak glosowek w ostatnich 24h.";

  const streamBlock = params.streamRows.length
    ? compactRows(params.streamRows, 15)
    : "Brak zapisow streamu w ostatnich 24h.";

  const frictionBlock = params.frictionRows.length
    ? params.frictionRows.map((e, i) => `${i + 1}. [${e.friction_type || "event"}] ${e.actual_behavior || ""}`).join("\n")
    : "Brak tarć.";

  let metrics = "Brak danych z Oura/agregatów.";
  if (params.agg) {
    metrics = `Sen: ${params.agg.sleep_hours}h | HRV: ${params.agg.hrv_avg} | Readiness: ${params.agg.readiness_score} | Exec: ${params.agg.execution_score} | Stan: ${params.agg.final_state}`;
  }

  let tasks = "PowerList: brak. Zadania: brak.";
  if (params.wins) {
    tasks = `PowerList: 1. ${params.wins.task_1} (${params.wins.done_1 ? 'V' : 'X'}) 2. ${params.wins.task_2} (${params.wins.done_2 ? 'V' : 'X'}) 3. ${params.wins.task_3} (${params.wins.done_3 ? 'V' : 'X'})\n`;
  }
  if (params.todos && params.todos.length > 0) {
    tasks += `Zrobione zadania z listy: ${params.todos.map((t) => t.title).join(", ")}`;
  }

  try {
    const { content } = await deepseekChat({
      apiKey,
      ...LLM_TASKS.synthesis,
      temperature: 0.35,
      messages: [
        {
          role: "system",
          content: "Jesteś analitycznym kronikarzem Vanguard. Twoim zadaniem jest napisanie zwięzłej i obiektywnej Kroniki Dnia na bazie podanych danych. Bądź bezpośredni, zwięzły, nie używaj ozdobników ani patetycznego coachingu. Skup się na faktach: jak fizjologicznie rozpoczął się dzień, co zostało dowiezione (PowerList, zadania), a z czym był problem (Friction, Stream). Utwórz 2-3 zwięzłe paragrafy."
        },
        {
          role: "user",
          content: `METRYKI FIZJOLOGICZNE I STAN:\n${metrics}\n\nDOWIEZIONE ZADANIA:\n${tasks}\n\nSTRUMIEŃ MYŚLI:\n${streamBlock}\n\nGŁOSÓWKI:\n${voiceBlock}\n\nTARCIA I PROBLEMY:\n${frictionBlock}\n\nNapisz Kronikę Dnia na bazie powyższych faktów. Zwróć sam tekst markdown bez żadnych wstępów i podsumowań.`
        }
      ]
    });
    return content.replace(/<think>[\s\S]*?<\/think>/gi, "").trim() || null;
  } catch (err) {
    console.error('[generateDayNarrative] Error:', err);
    return null;
  }
}

export async function buildReflectionPrompt(apiKey: string, params: {
  voiceRows: StreamRow[];
  streamRows: StreamRow[];
  frictionRows: Array<Record<string, unknown>>;
  systemHealthBlock: string;
  tasksBlock: string;
  phoneBlock: string;
  dayNoteBlock: string;
  metricsBlock: string;
  manual: boolean;
}): Promise<string[]> {
  const voiceBlock = params.voiceRows.length
    ? compactRows(params.voiceRows, 10)
    : "Brak glosowek w ostatnich 24h.";

  const streamBlock = params.streamRows.length
    ? compactRows(params.streamRows, 14)
    : "Brak zapisow streamu w ostatnich 24h.";

  const frictionBlock = params.frictionRows.length
    ? params.frictionRows.slice(0, 8).map((event, index) => {
      const type = event.friction_type || event.event_kind || "event";
      const behavior = String(event.actual_behavior || event.declared_intention || event.immediate_cost || "").replace(/\s+/g, " ").trim();
      return `${index + 1}. ${type}: ${behavior.slice(0, 220)}`;
    }).join("\n")
    : "Brak sklasyfikowanych friction events.";

  try {
    const { content } = await deepseekChat({
      apiKey,
      ...LLM_TASKS.synthesis,
      temperature: 0.35,
      messages: [
        {
          role: "system",
          content:
            "Jestes wieczornym trenerem refleksji w Vanguard. Nie planujesz jutra w Telegramie. " +
            "Masz pomoc uzytkownikowi usiasc spokojnie, nagrac glosowke i przeanalizowac dzien: " +
            "co poszlo dobrze, co poszlo zle, co moglo pojsc lepiej, za co jest wdzieczny, jakie napiecie albo temat warto poglebic. " +
            "Konfrontuj wykonanie konkretnych zadan z Power Listy (z nazwy!). " +
            "Pamietaj: zeby zamknac dzien w systemie, wymagana jest krótka notatka Jakuba. " +
            "Pisz po polsku, krotko, konkretnie, bez coachingu motywacyjnego. Nie udawaj pewnosci, jesli dane sa slabe."
        },
        {
          role: "user",
          content:
            `Tryb: ${params.manual ? "manualny /koniec" : "cron 21:30"}\n\n` +
            `DOWIEZIENIE I POWERLISTA DZISIAJ:\n${params.tasksBlock}\n\n` +
            `NOTATKA ZAMKNIĘCIA DNIA:\n${params.dayNoteBlock}\n\n` +
            `TELEFON I CZAS EKRANU:\n${params.phoneBlock}\n\n` +
            `METRYKI SNU / BIO:\n${params.metricsBlock}\n\n` +
            `GLOSOWKI 24H:\n${voiceBlock}\n\n` +
            `STREAM 24H:\n${streamBlock}\n\n` +
            `FRICTION 24H:\n${frictionBlock}\n\n` +
            `SYSTEM HEALTH:\n${params.systemHealthBlock}\n\n` +
            "Napisz dwie osobne wiadomosci oddzielone ciagiem znakow '===DELIMITER==='.\n" +
            "Wiadomosc 1 (Podsumowanie):\n" +
            "- 3-5 punktow: co slychac w ostatnich 24h z glosowek/streamu, jak poszly zadania z nazwy i czy byl screen time w nocy.\n" +
            "- Jesli sa bledy krytyczne w system health, dodaj 1 krotki punkt o stanie systemu.\n\n" +
            "===DELIMITER===\n\n" +
            "Wiadomosc 2 (Pytania i Instrukcja):\n" +
            "- 2-4 pytania poglebiajace, bezposrednio dotykajace omijanych zadan i tarcia.\n" +
            "- Przypomnienie: nagraj glosowke lub zostaw krotka notatke, zeby zamknac dzien.\n\n" +
            "Nie pytaj o plan jutra. Nie generuj zadan na jutro."
        }
      ]
    });

    const cleaned = content.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
    if (cleaned) {
      const parts = cleaned.split("===DELIMITER===").map(p => p.trim()).filter(Boolean);
      return parts.length > 0 ? parts : [cleaned];
    }
  } catch (err: unknown) {
    console.error('[Edge Function Error]', err);
    return [String(err)];
  }

  return [
    `*Wieczorna refleksja*\n\nW ostatnich 24h widze ${params.voiceRows.length} glosowek i ${params.streamRows.length} wpisow w streamie.`,
    `Usiadz spokojnie i nagraj glosowke:\n1. Co dzisiaj realnie poszlo dobrze?\n2. Co poszlo zle albo bylo tarciem?\n3. Co moglo pojsc lepiej i dlaczego?\n4. Za co dzisiaj jestes wdzieczny?\n5. Jaki jeden temat warto jeszcze nazwac bez uciekania w planowanie?`
  ];
}
