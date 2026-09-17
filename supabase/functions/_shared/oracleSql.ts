/**
 * Read-only SQL tool used by the Oracle. Real safety boundary lives in the
 * `oracle_readonly_query` Postgres function (transaction_read_only, single
 * statement, 5s timeout, outer LIMIT 200) — this is just the calling
 * convention + audit trail.
 */
import { logAuditEvent } from "./audit.ts";

const KNOWN_VANGUARD_TABLES = [
  "daily_nutrition", "daily_food_entries", "food_library", "nutrition_targets", "nutrition_profile",
  "fasting_logs", "workout_sessions", "exercise_logs", "strava_activities", "strava_activities_clean",
  "oura_daily_summary", "daily_strain", "body_metrics", "body_composition_measurements",
  "projects", "todo_sections", "todo_items", "daily_wins", "habits", "habit_logs",
  "weekly_reviews", "monthly_reviews", "daily_reconciliations", "life_goals", "goal_kpis",
  "kpi_entries", "sprint_goals", "learning_skills", "learning_week_focus", "medical_lab_results",
  "medical_documents", "supplements", "supplement_logs", "endmyopia_measurements", "endmyopia_prescriptions",
  "phone_usage_daily", "vanguard_calendar", "location_history", "vanguard_stream", "vanguard_notes",
  "friction_events", "confirmed_friction_events", "claims", "entities", "audit_events"
];

export function qualifySqlTables(sql: string): string {
  let rewritten = sql;
  for (const table of KNOWN_VANGUARD_TABLES) {
    const fromJoinRegex = new RegExp(`(\\b(?:from|join)\\s+)(?!public\\.)(\\b${table}\\b)`, "gi");
    rewritten = rewritten.replace(fromJoinRegex, `$1public.$2`);
    const commaRegex = new RegExp(`(,\\s*)(?!public\\.)(\\b${table}\\b)`, "gi");
    rewritten = rewritten.replace(commaRegex, `$1public.$2`);
  }
  return rewritten;
}

export async function runOracleReadonlyQuery(
  supabase: any,
  userId: string,
  sql: string,
): Promise<{ ok: true; rows: unknown[] } | { ok: false; error: string }> {
  const qualifiedSql = qualifySqlTables(sql);
  const { data, error } = await supabase.rpc("oracle_readonly_query", { query_text: qualifiedSql });

  if (error) {
    await logAuditEvent({
      eventType: "oracle_sql_tool_call",
      severity: "warning",
      message: error.message,
      userId,
      metadata: { sql, success: false },
    });
    return { ok: false, error: error.message };
  }

  if (data && typeof data === "object" && !Array.isArray(data) && "error" in data) {
    const errorMsg = (data as Record<string, unknown>).error as string;
    await logAuditEvent({
      eventType: "oracle_sql_tool_call",
      severity: "warning",
      message: errorMsg,
      userId,
      metadata: { sql, success: false },
    });
    return { ok: false, error: errorMsg };
  }

  await logAuditEvent({
    eventType: "oracle_sql_tool_call",
    severity: "info",
    message: "ok",
    userId,
    metadata: { sql, success: true, rowCount: Array.isArray(data) ? data.length : 0 },
  });
  return { ok: true, rows: Array.isArray(data) ? data : [] };
}
