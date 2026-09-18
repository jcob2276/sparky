/**
 * dayLoopContext.ts
 * Fetches and formats the holistic daily loop for Vanguard Oracle:
 * - 5 Power List tasks (task_1..task_5, done_1..done_5, category_1..category_5, completed_at)
 * - Start of day / morning notes (day_note, gratitude_entry, journal_entry, mood_score)
 * - End of day reconciliation (day_score, user_response, evening_extraction, biggest_cost, best_move)
 * - Yesterday's continuity
 */
import { getPlanQualitySignal } from "../../_shared/planQuality.ts";

export interface DayLoopContextResult {
  dayLoopContextText: string;
  recentPlanQuality: Record<string, unknown> | null;
  lastEveningReflection: Record<string, unknown> | null;
}

function formatTimeOnly(isoString?: string | null): string {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    // Format Warsaw time HH:MM
    return d.toLocaleTimeString('pl-PL', { timeZone: 'Europe/Warsaw', hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function formatEveningExtraction(ext: unknown): string {
  if (!ext) return '';
  if (typeof ext === 'string') return ext.trim();
  if (typeof ext === 'object') {
    const obj = ext as Record<string, unknown>;
    const parts: string[] = [];
    if (Array.isArray(obj.went_well) && obj.went_well.length) {
      parts.push(`Dobre ruchy: ${obj.went_well.join(', ')}`);
    }
    if (Array.isArray(obj.went_wrong) && obj.went_wrong.length) {
      parts.push(`Co poszło nie tak: ${obj.went_wrong.join(', ')}`);
    }
    if (Array.isArray(obj.tensions) && obj.tensions.length) {
      parts.push(`Napięcia: ${obj.tensions.join(', ')}`);
    }
    if (Array.isArray(obj.could_be_better) && obj.could_be_better.length) {
      parts.push(`Do poprawy: ${obj.could_be_better.join(', ')}`);
    }
    return parts.join(' | ');
  }
  return '';
}

export async function fetchDayLoopContext(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  user_id: string,
  todayDate: string,
): Promise<DayLoopContextResult> {
  let recentPlanQuality: Record<string, unknown> | null = null;
  let lastEveningReflection: Record<string, unknown> | null = null;

  const [winsRes, reconsRes] = await Promise.all([
    supabase
      .from('daily_wins')
      .select('date, task_1, done_1, category_1, completed_at_1, task_2, done_2, category_2, completed_at_2, task_3, done_3, category_3, completed_at_3, task_4, done_4, category_4, completed_at_4, task_5, done_5, category_5, completed_at_5, importance_score, mood_score, day_note, journal_entry, gratitude_entry, created_at')
      .eq('user_id', user_id)
      .order('date', { ascending: false })
      .limit(2),
    supabase
      .from('daily_reconciliations')
      .select('date, status, mode, day_score, user_response, evening_extraction, biggest_cost, best_move, events_summary, events_count, answered_at, p2_parsed, planning_summary')
      .eq('user_id', user_id)
      .order('date', { ascending: false })
      .limit(2),
  ]);

  const winsList = winsRes.data || [];
  const reconsList = reconsRes.data || [];

  const todayWin = winsList.find((w: Record<string, unknown>) => w.date === todayDate) || winsList[0];
  const yesterdayWin = winsList.find((w: Record<string, unknown>) => w.date !== todayDate && w !== todayWin);

  const todayRecon = reconsList.find((r: Record<string, unknown>) => r.date === todayDate);
  const latestRecon = reconsList[0];
  const yesterdayRecon = reconsList.find((r: Record<string, unknown>) => r.date !== todayDate) || (latestRecon?.date !== todayDate ? latestRecon : reconsList[1]);

  // Extract plan quality and evening reflection from latest available reconciliation
  for (const r of reconsList) {
    if (!recentPlanQuality && r.planning_summary) {
      const signal = getPlanQualitySignal(r.planning_summary);
      recentPlanQuality = {
        ...signal,
        target_date: (r.planning_summary as Record<string, unknown>)?.target_date || null,
      };
    }
    if (!lastEveningReflection && r.p2_parsed) {
      const p2 = r.p2_parsed as Record<string, unknown>;
      if (Number(p2.parse_confidence) >= 0.4 && (p2.biggest_cost || p2.best_move || (p2.blocker_candidates as unknown[] | undefined)?.length)) {
        lastEveningReflection = {
          date: r.date,
          biggest_cost: p2.biggest_cost,
          best_move: p2.best_move,
          blocker_candidates: (p2.blocker_candidates as unknown[] | undefined)?.slice(0, 3) || [],
          day_score: p2.day_score ?? r.day_score,
          needs_manual_review: !!p2.needs_manual_review,
        };
      }
    }
  }

  // If lastEveningReflection wasn't found in p2_parsed, check raw fields
  if (!lastEveningReflection && yesterdayRecon) {
    lastEveningReflection = {
      date: yesterdayRecon.date,
      biggest_cost: yesterdayRecon.biggest_cost || null,
      best_move: yesterdayRecon.best_move || null,
      blocker_candidates: [],
      day_score: yesterdayRecon.day_score ?? null,
      user_response: yesterdayRecon.user_response || null,
      needs_manual_review: false,
    };
  }

  const lines: string[] = [];

  // 1. POWER LISTA 5 ZADAŃ
  if (todayWin) {
    lines.push(`[POWER LISTA — 5 ZADAŃ DNIA (${todayWin.date})]:`);
    let doneCount = 0;
    let totalCount = 0;

    for (let i = 1; i <= 5; i++) {
      const task = todayWin[`task_${i}`];
      const isDone = Boolean(todayWin[`done_${i}`]);
      const category = todayWin[`category_${i}`] || 'general';
      const completedAt = todayWin[`completed_at_${i}`];

      if (task && String(task).trim().length > 0) {
        totalCount++;
        if (isDone) doneCount++;
        const timeStr = isDone && completedAt ? ` (ukończono ${formatTimeOnly(completedAt)})` : '';
        const statusStr = isDone ? `[WYKONANE${timeStr}]` : '[NIEWYKONANE]';
        lines.push(`- Zadanie ${i} [${category}]: "${String(task).trim()}" -> ${statusStr}`);
      } else {
        lines.push(`- Zadanie ${i}: [puste]`);
      }
    }
    lines.push(`Bilans realizacji zadań: ${doneCount}/${totalCount || 5} ukończonych.`);

    // Morning / Start of day notes & ratings
    const morningNotes: string[] = [];
    if (todayWin.day_note) morningNotes.push(`Notatka dnia: "${todayWin.day_note}"`);
    if (todayWin.mood_score) morningNotes.push(`Nastrój / energia: ${todayWin.mood_score}/5`);
    if (todayWin.importance_score) morningNotes.push(`Priorytet dnia: ${todayWin.importance_score}/5`);
    if (todayWin.gratitude_entry) morningNotes.push(`Wdzięczność: "${todayWin.gratitude_entry}"`);
    if (todayWin.journal_entry) morningNotes.push(`Dziennik: "${todayWin.journal_entry}"`);

    if (morningNotes.length > 0) {
      lines.push(`Zapisy Jakuba na dziś: ${morningNotes.join(' | ')}`);
    }
  } else {
    lines.push(`[POWER LISTA — 5 ZADAŃ DNIA]: Brak wpisu w daily_wins na dzień ${todayDate}.`);
  }

  // Yesterday recap if exists
  if (yesterdayWin) {
    let yDone = 0;
    const yTasks: string[] = [];
    for (let i = 1; i <= 5; i++) {
      const t = yesterdayWin[`task_${i}`];
      const d = Boolean(yesterdayWin[`done_${i}`]);
      if (t && String(t).trim()) {
        if (d) yDone++;
        yTasks.push(`${i}. ${String(t).trim()} [${d ? 'OK' : 'NIE'}]`);
      }
    }
    const noteStr = yesterdayWin.day_note ? ` (Notatka: "${yesterdayWin.day_note}")` : '';
    lines.push(`Wczoraj (${yesterdayWin.date}): wykonano ${yDone}/${yTasks.length} zadań [${yTasks.join(', ')}]${noteStr}.`);
  }

  // 2. REFLEKSJA I OCENA DNIA (RECONCILIATION)
  lines.push('');
  lines.push('[REFLEKSJA I OCENA DNIA (START / KONIEC DNIA — RECONCILIATION)]:');

  const activeRecon = todayRecon || yesterdayRecon;
  if (activeRecon) {
    lines.push(`Data oceny: ${activeRecon.date}`);
    if (activeRecon.day_score != null) lines.push(`Ocena dnia Jakuba (day_score): ${activeRecon.day_score}/5`);
    if (activeRecon.user_response) lines.push(`Słowa Jakuba (odpowiedź wieczorna): "${activeRecon.user_response}"`);
    if (activeRecon.biggest_cost) lines.push(`Największy koszt: ${activeRecon.biggest_cost}`);
    if (activeRecon.best_move) lines.push(`Najlepszy ruch: ${activeRecon.best_move}`);

    const extText = formatEveningExtraction(activeRecon.evening_extraction);
    if (extText) {
      lines.push(`Synteza wieczorna: ${extText}`);
    }

    if (Array.isArray(activeRecon.events_summary) && activeRecon.events_summary.length > 0) {
      const eventsFormatted = activeRecon.events_summary.slice(0, 4).map((e: Record<string, unknown>) =>
        `- ${e.behavior || 'Tarcie'} [${e.friction_type || 'other'}]`
      ).join('\n');
      lines.push(`Zarejestrowane tarcia z tego dnia:\n${eventsFormatted}`);
    }
  } else {
    lines.push('Brak zarejestrowanej oceny wieczornej (reconciliation) z ostatnich 48h.');
  }

  return {
    dayLoopContextText: lines.join('\n'),
    recentPlanQuality,
    lastEveningReflection,
  };
}
