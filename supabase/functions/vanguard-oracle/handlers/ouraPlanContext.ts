import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

interface OuraPlanRow {
  date: string;
  readiness_score: number | null;
  sleep_score: number | null;
  total_sleep_hours: number | null;
}

const COLUMNS = "date, readiness_score, sleep_score, total_sleep_hours";

/** Najnowszy pomiar Oury nie późniejszy niż dzień planowania. Błąd źródła jest zgłaszany, nie połykany. */
export async function fetchLatestOura(db: SupabaseClient, userId: string, planningDate: string): Promise<OuraPlanRow | null> {
  const { data, error } = await db
    .from("oura_daily_summary")
    .select(COLUMNS)
    .eq("user_id", userId)
    .lte("date", planningDate)
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.warn("[daily-plan] oura_daily_summary read failed:", error.message);
    return null;
  }
  return (data as OuraPlanRow | null) ?? null;
}

/** Linia biometrii do promptu; pomiar z innego dnia niż planowany jest jawnie oznaczony datą. */
export function buildOuraLine(row: OuraPlanRow | null, planningDate: string): string {
  if (!row) return "";
  const dayNote = row.date === planningDate ? "" : ` (pomiar z ${row.date})`;
  return `Gotowość Oura: ${row.readiness_score ?? "Brak"}/100, Sen: ${row.sleep_score ?? "Brak"}/100${dayNote}`;
}
