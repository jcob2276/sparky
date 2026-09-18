import { sendChatAction } from "../../_shared/telegram.ts";
import { safeSendTelegram } from "../_utils/helpers.ts";
import { getWarsawDateString } from "../../_shared/time.ts";

interface DailyWinRow {
  task_1: string | null;
  done_1: boolean | null;
  task_2: string | null;
  done_2: boolean | null;
  task_3: string | null;
  done_3: boolean | null;
  task_4: string | null;
  done_4: boolean | null;
  task_5: string | null;
  done_5: boolean | null;
}

export async function handleTerazCommand(
  chatId: number,
  telegramToken: string,
  supabase: any,
  vanguardUserId: string,
): Promise<void> {
  try {
    await sendChatAction(telegramToken, chatId, "typing", { direct: true });

    const today = getWarsawDateString();
    const now = new Date();
    const warsawHour = Number(new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Warsaw",
      hour: "numeric",
      hour12: false,
    }).format(now));
    const warsawMinute = Number(new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Warsaw",
      minute: "numeric",
    }).format(now));

    const timeString = `${String(warsawHour).padStart(2, "0")}:${String(warsawMinute).padStart(2, "0")}`;

    // 1. Biometrics
    let { data: agg } = await supabase
      .from("vanguard_daily_aggregates")
      .select("readiness_score, sleep_hours, hrv_avg, rhr_avg, final_state")
      .eq("user_id", vanguardUserId)
      .eq("date", today)
      .maybeSingle();

    if (!agg) {
      const { data: latestAgg } = await supabase
        .from("vanguard_daily_aggregates")
        .select("readiness_score, sleep_hours, hrv_avg, rhr_avg, final_state")
        .eq("user_id", vanguardUserId)
        .order("date", { ascending: false })
        .limit(1)
        .maybeSingle();
      agg = latestAgg;
    }

    // 2. Active tasks: daily_wins (Power List) first, then todo_items
    const { data: win } = await supabase
      .from("daily_wins")
      .select("task_1, done_1, task_2, done_2, task_3, done_3, task_4, done_4, task_5, done_5")
      .eq("user_id", vanguardUserId)
      .eq("date", today)
      .maybeSingle() as { data: DailyWinRow | null };

    let singleMove: string | null = null;
    let moveSource = "";

    if (win) {
      const tasks: [string | null, boolean | null, number][] = [
        [win.task_1, win.done_1, 1],
        [win.task_2, win.done_2, 2],
        [win.task_3, win.done_3, 3],
        [win.task_4, win.done_4, 4],
        [win.task_5, win.done_5, 5],
      ];
      for (const [t, done, idx] of tasks) {
        if (t && t.trim() && !done) {
          singleMove = t.trim();
          moveSource = `Power List #${idx}`;
          break;
        }
      }
    }

    if (!singleMove) {
      const { data: todos } = await supabase
        .from("todo_items")
        .select("title, priority")
        .eq("user_id", vanguardUserId)
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(10);

      if (todos && todos.length > 0) {
        const priorityOrder: Record<string, number> = { urgent: 4, high: 3, normal: 2, low: 1 };
        todos.sort((a: any, b: any) => (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0));
        singleMove = todos[0].title;
        moveSource = `Zadanie (${todos[0].priority || "open"})`;
      }
    }

    // 3. Risk & Circadian analysis
    const isImpulseWindow = warsawHour === 10 || (warsawHour === 11 && warsawMinute <= 30);
    const lowSleep = typeof agg?.sleep_hours === "number" && agg.sleep_hours > 0 && agg.sleep_hours < 6.5;

    let phaseDesc = "Faza pracy";
    if (warsawHour >= 5 && warsawHour < 11) {
      phaseDesc = isImpulseWindow ? "Okno ryzyka impulsu (10:00-11:30)" : "Faza poranna (First Move)";
    } else if (warsawHour >= 11 && warsawHour < 15) {
      phaseDesc = isImpulseWindow ? "Okno ryzyka impulsu (10:00-11:30)" : "Faza twardej egzekucji";
    } else if (warsawHour >= 15 && warsawHour < 18) {
      phaseDesc = "Faza popołudniowa (guard tarcia)";
    } else if (warsawHour >= 18 && warsawHour < 23) {
      phaseDesc = "Faza wieczorna (reconciliation)";
    } else {
      phaseDesc = "Faza nocna (regeneracja)";
    }

    // 4. Construct message
    const lines: string[] = [];
    lines.push("STAN:");
    const bioParts: string[] = [];
    if (agg?.sleep_hours) bioParts.push(`Sen: ${Number(agg.sleep_hours).toFixed(1)}h`);
    if (agg?.readiness_score) bioParts.push(`Readiness: ${agg.readiness_score}`);
    if (agg?.hrv_avg) bioParts.push(`HRV: ${agg.hrv_avg}ms`);
    lines.push(bioParts.length > 0 ? bioParts.join(" | ") : "Brak świeżej biometrii");
    lines.push(`Czas: ${timeString} | ${phaseDesc}`);
    lines.push("");

    lines.push("JEDYNY RUCH TERAZ:");
    if (singleMove) {
      lines.push(`${singleMove} (${moveSource})`);
    } else {
      lines.push("Zdefiniuj 1 ruch operacyjny na dziś (/todo treść)");
    }
    lines.push("");

    lines.push("CO ZAMROZIĆ:");
    if (isImpulseWindow) {
      lines.push("Zero ucieczki w architekturę, refaktory czy nowe karty. Trwa okno podatności na impulsy — dociśnij tylko bieżący ruch.");
    } else if (lowSleep) {
      lines.push("Sen < 6.5h: w 80% przypadków egzekucja spada do <= 0.50. Bezwzględny zakaz otwierania gier i pobocznych wątków.");
    } else {
      lines.push("Zero pobocznych wątków przed ukończeniem powyższego zadania.");
    }

    await safeSendTelegram(chatId, lines.join("\n"), telegramToken);
  } catch (err) {
    console.error("[commands] /teraz failed:", err);
    await safeSendTelegram(chatId, "Błąd pobierania stanu: " + (err as Error).message, telegramToken);
  }
}
