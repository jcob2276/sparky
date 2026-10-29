/**
 * habitLogsRepo.ts — zapis epizodu nawyku „Lenie” (habits + habit_logs).
 *
 * To jedyne miejsce, które zapisuje to zdarzenie z Telegrama (/lenie).
 * Kopii w behavior_log nie ma (klucz `lenie` w behavior_log jest zakazany przez niezmiennik).
 */
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { Database } from "../database.types.ts";

type Client = SupabaseClient<Database>;

const LENIE_HABIT = { name: "Lenie", icon: "😒", is_positive: false } as const;

export interface LenieEpisode {
  /** Wszystkie bodźce z dnia, połączone " + ". */
  stimulus: string;
  /** Wszystkie konteksty z dnia, połączone " · ". */
  contextNote: string;
  /** Liczba bodźców (min. 1) — do podsumowania w streamie. */
  count: number;
}

const join = (previous: string | null | undefined, next: string | null | undefined, separator: string) =>
  [previous, next].filter((part): part is string => Boolean(part)).join(separator);

async function getOrCreateLenieHabitId(db: Client, userId: string): Promise<string> {
  const { data: found, error } = await db
    .from("habits")
    .select("id")
    .eq("user_id", userId)
    .eq("name", LENIE_HABIT.name)
    .maybeSingle();
  if (error) throw error;
  if (found) return found.id;

  const { data: created, error: createError } = await db
    .from("habits")
    .insert({ user_id: userId, ...LENIE_HABIT })
    .select("id")
    .single();
  if (createError) throw createError;
  return created.id;
}

/** Dopisuje epizod do wpisu z danego dnia (kolejne w tym samym dniu łączą bodźce i konteksty). */
export async function recordLenieEpisode(
  db: Client,
  userId: string,
  date: string,
  input: { stimulus?: string | null; contextNote?: string | null },
): Promise<LenieEpisode> {
  const habitId = await getOrCreateLenieHabitId(db, userId);

  const { data: existing, error: findError } = await db
    .from("habit_logs")
    .select("id, final_stimulus, context_note")
    .eq("user_id", userId)
    .eq("habit_id", habitId)
    .eq("date", date)
    .maybeSingle();
  if (findError) throw findError;

  const stimulus = join(existing?.final_stimulus, input.stimulus, " + ");
  const contextNote = join(existing?.context_note, input.contextNote, " · ");
  const fields = {
    completed: true,
    final_stimulus: stimulus || null,
    context_note: contextNote || null,
    logged_at: new Date().toISOString(),
  };

  if (existing) {
    const { error } = await db.from("habit_logs").update(fields).eq("id", existing.id);
    if (error) throw error;
  } else {
    const { error } = await db.from("habit_logs").insert({ user_id: userId, habit_id: habitId, date, ...fields });
    if (error) throw error;
  }

  return { stimulus, contextNote, count: stimulus ? stimulus.split(" + ").length : 1 };
}
