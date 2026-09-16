import { sendMessageParsed } from "../_shared/telegram.ts";
import { createServiceClient } from "../_shared/supabase.ts";
import { getStreamForDailyReconciliation } from "../_shared/repos/streamRepo.ts";
import { getVanguardUserId } from "../_shared/constants.ts";
import { getWarsawDayBoundaries, getWarsawDateString } from "../_shared/time.ts";
import { logAuditEvent } from "../_shared/audit.ts";
import { logCriticalError } from "../_shared/errorLogging.ts";
import { getRecentStrongBehavioralPatterns } from "../_shared/vanguardPatterns.ts";
import type { DailyWinsRow, PhoneUsageDailyRow, DailyAggregateRow, StreamRow } from "./recapTypes.ts";
import { generateDayNarrative, buildReflectionPrompt } from "./dailyPrompts.ts";

async function sendTelegram(token: string, chatId: number, text: string): Promise<number | null> {
  const result = await sendMessageParsed(token, chatId, text, {
    parseMode: "Markdown",
  });
  if (!result.ok) {
    console.error("[reconciliation] Telegram error:", result.description);
    return null;
  }
  return result.messageId ?? null;
}

export async function runDailyReconciliation(req: Request): Promise<unknown> {
  const TELEGRAM_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") || "";
  const TELEGRAM_CHAT_ID = parseInt(Deno.env.get("TELEGRAM_CHAT_ID") || "0");
  const DEEPSEEK_API_KEY = Deno.env.get("DEEPSEEK_API_KEY") || "";
  const VANGUARD_USER_ID = getVanguardUserId();
  const supabase = createServiceClient();

  try {
    if (!TELEGRAM_CHAT_ID) {
      console.warn("[reconciliation] TELEGRAM_CHAT_ID not set, skipping");
      return { skipped: true, reason: "missing_chat_id" };
    }

    const url = new URL(req.url);
    const forceOverride = url.searchParams.get("force") === "true";
    const manual = url.searchParams.get("manual") === "true";
    const todayStr = getWarsawDateString();

    if (!forceOverride) {
      const { data: existing } = await supabase
        .from("daily_reconciliations")
        .select("id, status, mode, created_at")
        .eq("user_id", VANGUARD_USER_ID)
        .eq("date", todayStr)
        .in("mode", ["reflection", "full", "checkin"])
        .in("status", ["sent", "answered"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existing) {
        console.log("[reconciliation] reflection already used today - skipping");
        return { skipped: true, reason: "already_used_today", id: existing.id };
      }
    }

    const { start: dayStart, end: dayEnd } = getWarsawDayBoundaries(todayStr);

    const sevenDaysAgo = new Date(dayStart);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [streamData, frictionRes, auditRes, winsRes, todosRes, aggRes, phoneRes] = await Promise.all([
      getStreamForDailyReconciliation(
        supabase,
        VANGUARD_USER_ID,
        dayStart,
        dayEnd,
        80,
      ),
      supabase
        .from("friction_events")
        .select("id, event_kind, friction_type, actual_behavior, declared_intention, immediate_cost, occurred_at")
        .eq("user_id", VANGUARD_USER_ID)
        .gte("occurred_at", dayStart)
        .lt("occurred_at", dayEnd)
        .order("occurred_at", { ascending: true })
        .limit(30),
      supabase
        .from("audit_events")
        .select("event_type, severity, message, created_at")
        .gte("created_at", sevenDaysAgo.toISOString())
        .in("severity", ["error", "critical"])
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("daily_wins")
        .select("task_1, task_2, task_3, task_4, task_5, done_1, done_2, done_3, done_4, done_5, day_note, result")
        .eq("user_id", VANGUARD_USER_ID)
        .eq("date", todayStr)
        .maybeSingle(),
      supabase
        .from("todo_items")
        .select("title")
        .eq("user_id", VANGUARD_USER_ID)
        .eq("status", "done")
        .gte("completed_at", dayStart)
        .lt("completed_at", dayEnd),
      supabase
        .from("vanguard_daily_aggregates")
        .select("execution_score, sleep_hours, hrv_avg, readiness_score, final_state")
        .eq("user_id", VANGUARD_USER_ID)
        .eq("date", todayStr)
        .maybeSingle(),
      supabase
        .from("phone_usage_daily")
        .select("total_minutes, late_night_minutes, social_minutes, unlocks")
        .eq("user_id", VANGUARD_USER_ID)
        .eq("date", todayStr)
        .maybeSingle(),
    ]);

    if (frictionRes.error) console.error("[reconciliation] friction query error:", frictionRes.error);

    const streamRows = streamData as StreamRow[];
    const voiceRows = streamRows.filter((row) => {
      const metadata = row.metadata || {};
      return typeof metadata.voice_duration_seconds === "number" || typeof metadata.voice_wpm === "number";
    });
    const frictionRows = frictionRes.data || [];

    // Format tasks and execution
    const winsData = winsRes.data as DailyWinsRow | null;
    const taskParts: string[] = [];
    if (winsData) {
      for (let i = 1; i <= 5; i++) {
        const task = winsData[`task_${i}`];
        if (task && String(task).trim()) {
          const done = !!winsData[`done_${i}`];
          taskParts.push(`${i}. ${String(task).trim()}: ${done ? "✓ ZROBIONE" : "✗ NIEZROBIONE"}`);
        }
      }
    }
    const tasksBlock = taskParts.length > 0
      ? `PowerList:\n${taskParts.join("\n")}`
      : "PowerList: brak zaplanowanych zadań.";

    const dayNoteBlock = winsData?.day_note?.trim()
      ? `Zapisana notatka Jakuba: „${winsData.day_note.trim()}” (status: ${winsData.result ?? "w toku"})`
      : "Brak notatki zamykającej (wymagana do formalnego zamknięcia dnia Z/P!)";

    // Format phone telemetry
    const phoneData = phoneRes.data as PhoneUsageDailyRow | null;
    const phoneBlock = phoneData
      ? `Łączny czas: ${phoneData.total_minutes ?? 0}m, Noc: ${phoneData.late_night_minutes ?? 0}m, Social: ${phoneData.social_minutes ?? 0}m, Odblokowania: ${phoneData.unlocks ?? 0}`
      : "Brak danych z phone_usage_daily.";

    // Format sleep metrics
    const aggData = aggRes.data as DailyAggregateRow | null;
    const metricsBlock = aggData
      ? `Sen: ${aggData.sleep_hours ?? "brak"}h | HRV: ${aggData.hrv_avg ?? "brak"} | Readiness: ${aggData.readiness_score ?? "brak"} | Exec score: ${aggData.execution_score ?? "brak"}`
      : "Brak agregatów biometrycznych.";

    // Aggregate system health from audit_events (last 7 days)
    const auditRows = (auditRes.data || []) as { event_type: string; severity: string; message: string; created_at: string }[];
    const auditByType: Record<string, { count: number; severity: string; lastMessage: string }> = {};
    for (const row of auditRows) {
      const key = row.event_type;
      if (!auditByType[key]) {
        auditByType[key] = { count: 0, severity: row.severity, lastMessage: row.message };
      }
      auditByType[key].count++;
    }
    const auditSummary = Object.entries(auditByType)
      .sort((a, b) => b[1].count - a[1].count)
      .map(([type, info]) => `${type} (${info.severity}): ${info.count}x — ${info.lastMessage}`)
      .join("\n");
    const systemHealthBlock = auditRows.length > 0
      ? `SYSTEM HEALTH (7 dni, ${auditRows.length} zdarzeń error/critical):\n${auditSummary}`
      : "SYSTEM HEALTH: Brak błędów krytycznych w ostatnich 7 dniach.";

    let messageTexts = await buildReflectionPrompt(DEEPSEEK_API_KEY, {
      voiceRows,
      streamRows,
      frictionRows,
      systemHealthBlock,
      tasksBlock,
      phoneBlock,
      dayNoteBlock,
      metricsBlock,
      manual,
    });

    // Pattern Bridge: append top visible patterns to evening reflection
    try {
      const patterns = await getRecentStrongBehavioralPatterns(supabase, VANGUARD_USER_ID, 2);
      const strong = patterns.filter(p => p.confidence >= 0.65 && p.occurrence_count >= 7);
      if (strong.length > 0) {
        const bridge = strong.map(p =>
          `📊 *${p.title || "Wzorzec"}* (N=${p.occurrence_count}, pewność ${Math.round(p.confidence * 100)}%)\n${p.evidence_text}`
        ).join("\n\n");
        messageTexts[0] += `\n\n---\n\n*W Twoich danych ten schemat się powtarza:*\n\n${bridge}`;
      }
    } catch (e) {
      console.warn("[reconciliation] pattern bridge fetch failed (non-fatal):", e);
    }

    // System Health: append critical error summary to first message
    if (auditRows.length > 0) {
      const topTypes = Object.entries(auditByType)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 3)
        .map(([type, info]) => `• ${type}: ${info.count}x`)
        .join("\n");
      messageTexts[0] += `\n\n---\n\n*Stan systemu (7 dni):* ${auditRows.length} błędów.\n${topTypes}`;
    }

    let messageId: number | null = null;
    for (const text of messageTexts) {
      const mid = await sendTelegram(TELEGRAM_TOKEN, TELEGRAM_CHAT_ID, text);
      if (mid) messageId = mid;
    }

    const eveningExtraction = await generateDayNarrative(DEEPSEEK_API_KEY, {
      voiceRows,
      streamRows,
      frictionRows,
      wins: winsRes?.data || null,
      todos: todosRes?.data || [],
      agg: aggRes?.data || null,
    });

    const { data: row, error: upsertErr } = await supabase.from("daily_reconciliations").upsert({
      user_id: VANGUARD_USER_ID,
      date: todayStr,
      status: "sent",
      mode: "reflection",
      events_count: frictionRows.length,
      events_summary: frictionRows.map((event: Record<string, unknown>) => ({
        id: event.id,
        friction_type: event.friction_type,
        behavior: String(event.actual_behavior || event.declared_intention || "").slice(0, 160),
      })),
      telegram_message_id: messageId,
      parsed_response: {
        mode: "reflection",
        manual,
        voice_count_24h: voiceRows.length,
        stream_count_24h: streamRows.length,
        prompt_version: "reflection-24h-v1",
      },
      user_response: null,
      answered_at: null,
      planning_status: null,
      planning_history: null,
      evening_extraction: eveningExtraction,
    }, { onConflict: "user_id,date" }).select("id").single();

    if (upsertErr) throw upsertErr;

    await logAuditEvent({
      eventType: "evening_reflection_created",
      severity: "info",
      message: "Utworzono wieczorna sesje refleksji",
      metadata: {
        date: todayStr,
        manual,
        voice_count_24h: voiceRows.length,
        stream_count_24h: streamRows.length,
        friction_count: frictionRows.length,
      },
    });

    console.log(`[reconciliation] reflection sent id=${row?.id} manual=${manual} voices=${voiceRows.length}`);
    return {
      ok: true,
      mode: "reflection",
      id: row?.id,
      manual,
      voice_count_24h: voiceRows.length,
      stream_count_24h: streamRows.length,
      events_count: frictionRows.length,
    };
  } catch (err) {
    await logCriticalError({
      area: "daily-reconciliation",
      error: err,
      message: "Daily reflection reconciliation failed",
    });
    throw err;
  }
}
