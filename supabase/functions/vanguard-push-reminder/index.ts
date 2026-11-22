/**
 * @function vanguard-push-reminder
 * @trigger pg_cron co minutę
 * @role Niezawodne, serwerowe przypomnienia: Web Push (PWA) + FCM (Capacitor APK).
 * @reads bank_accounts, bank_transactions, finance_category_budgets, finance_alert_log, todo_items, supplements, life_obligations, push_subscriptions, push_fcm_tokens, outbound_messages, vanguard_calendar, vanguard_stream
 * @writes finance_alert_log, todo_items, supplements, life_obligations, push_subscriptions, push_fcm_tokens, outbound_messages
 * @consumer Service Worker (PWA) / FCM (Android APK)
 * @status active
 */
import { serveJson } from "../_shared/http.ts";
import webpush from "npm:web-push@3.6.7";
import { isFcmConfigured, sendFcmToToken } from "../_shared/fcmPush.ts";
import {
  dueLeadOffsetsToday,
  getWarsawClockMinutes,
  getWarsawDateString,
  leadLabel,
  parseReminderClockMinutes,
  parseSentReminders,
} from "@vanguard/domain";
import { dispatchDueOutboundMessages } from "./outbound.ts";
import { processAmbientSignals } from "./ambient.ts";
import { processFinanceAlerts } from "./financeAlerts.ts";
import { loadReminderData } from "./loadReminderData.ts";
import type { FcmTokenRow, LifeObligationRow, PushPayload, PushSubscriptionRow } from "./types.ts";

const CONTACT_EMAIL = "mailto:newsletter.jakub@gmail.com";
/** Morning window start (Warsaw) for life-admin obligation pushes. */
const OBLIGATION_REMINDER_AFTER_MINUTES = 9 * 60;

Deno.serve(serveJson(async (_req, ctx) => {
  const supabase = ctx.supabase;
  const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY");
  const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY");

  if (!vapidPublic || !vapidPrivate) throw new Error("VAPID keys not configured");
  webpush.setVapidDetails(CONTACT_EMAIL, vapidPublic, vapidPrivate);
  const fcmReady = isFcmConfigured();

  const now = new Date();
  const nowIso = now.toISOString();
  const warsawDate = getWarsawDateString(now);
  const warsawMinutes = getWarsawClockMinutes(now);

  const { subscriptions, fcmTokens, dueTodos, supplements, obligations, preloaded } = await loadReminderData(supabase, now);

  const subsByUser = new Map<string, PushSubscriptionRow[]>();
  for (const sub of subscriptions ?? []) {
    const list = subsByUser.get(sub.user_id) ?? [];
    list.push(sub);
    subsByUser.set(sub.user_id, list);
  }

  const fcmByUser = new Map<string, FcmTokenRow[]>();
  for (const row of fcmTokens ?? []) {
    const list = fcmByUser.get(row.user_id) ?? [];
    list.push(row);
    fcmByUser.set(row.user_id, list);
  }

  const sendToUser = async (userId: string, payload: PushPayload) => {
    const userSubs = subsByUser.get(userId) ?? [];
    const userFcm = fcmByUser.get(userId) ?? [];
    if (userSubs.length === 0 && userFcm.length === 0) {
      return { delivered: false, error: "no_active_subscription" };
    }

    let delivered = false;
    const errors: string[] = [];
    const staleEndpoints: string[] = [];
    const staleTokens: string[] = [];

    await Promise.all([
      ...userSubs.map(async (sub) => {
        try {
          await webpush.sendNotification({
            endpoint: sub.endpoint,
            keys: { p256dh: sub.keys_p256dh, auth: sub.keys_auth },
          }, JSON.stringify(payload), { TTL: 60 * 60 * 24 });
          delivered = true;
        } catch (error: unknown) {
          const pushError = error as { statusCode?: number; message?: string };
          if (pushError.statusCode === 404 || pushError.statusCode === 410) {
            staleEndpoints.push(sub.endpoint);
          }
          errors.push(pushError.message ?? `push_${pushError.statusCode ?? "unknown"}`);
        }
      }),
      ...userFcm.map(async (row) => {
        if (!fcmReady) return;
        try {
          const result = await sendFcmToToken(row.token, payload);
          if (result === "ok") delivered = true;
          else if (result === "unregistered") staleTokens.push(row.token);
        } catch (error: unknown) {
          errors.push(error instanceof Error ? error.message : "fcm_unknown");
        }
      }),
    ]);

    if (staleEndpoints.length > 0) {
      const { error } = await supabase.from("push_subscriptions")
        .delete().eq("user_id", userId).in("endpoint", staleEndpoints);
      if (error) console.error("[push-reminder] stale subscription cleanup failed", error);
    }
    if (staleTokens.length > 0) {
      const { error } = await supabase.from("push_fcm_tokens")
        .delete().eq("user_id", userId).in("token", staleTokens);
      if (error) console.error("[push-reminder] stale FCM cleanup failed", error);
    }

    return { delivered, error: errors.join("; ") || null };
  };

  let sentTodos = 0;
  for (const item of dueTodos ?? []) {
    const result = await sendToUser(item.user_id, {
      title: "⏰ Przypomnienie",
      body: item.title,
      url: "/todo",
      tag: `todo-${item.id}`,
    });
    if (!result.delivered) continue;

    const { error } = await supabase.from("todo_items")
      .update({ reminder_sent: true }).eq("id", item.id);
    if (error) console.error("[push-reminder] todo mark sent failed", item.id, error);
    else sentTodos++;
  }

  const dueSupplements = (supplements ?? []).filter((supplement) => {
    if (supplement.start_date && supplement.start_date > warsawDate) return false;
    if (supplement.end_date && supplement.end_date < warsawDate) return false;
    if (supplement.reminder_sent_date === warsawDate || !supplement.reminder_time) return false;
    const dueAt = parseReminderClockMinutes(supplement.reminder_time);
    if (dueAt === null) return false;
    return warsawMinutes >= dueAt;
  });

  let sentSupplements = 0;
  for (const supplement of dueSupplements) {
    const result = await sendToUser(supplement.user_id, {
      title: "💊 Przypomnienie o suplemencie",
      body: `Czas na: ${supplement.emoji || "💊"} ${supplement.name}`,
      url: "/",
      tag: `supplement-${supplement.id}-${warsawDate}`,
    });
    if (!result.delivered) continue;

    const { error } = await supabase.from("supplements")
      .update({ reminder_sent_date: warsawDate }).eq("id", supplement.id);
    if (error) console.error("[push-reminder] supplement mark sent failed", supplement.id, error);
    else sentSupplements++;
  }

  let sentObligations = 0;
  if (warsawMinutes >= OBLIGATION_REMINDER_AFTER_MINUTES) {
    for (const raw of (obligations ?? []) as LifeObligationRow[]) {
      const due = dueLeadOffsetsToday({
        kind: raw.kind,
        anchor_date: raw.anchor_date,
        recurrence: raw.recurrence,
        lead_offsets: raw.lead_offsets ?? [],
        sent_reminders: raw.sent_reminders,
      }, warsawDate);
      if (due.length === 0) continue;

      const who = raw.related_name ? ` (${raw.related_name})` : "";
      for (const hit of due) {
        const result = await sendToUser(raw.user_id, {
          title: "📅 Termin",
          body: `${raw.title}${who} — ${leadLabel(hit.offset)} (${hit.occurrence})`,
          url: "/terminy",
          tag: `obligation-${raw.id}-${hit.key}`,
        });

        // Also queue Telegram Oracle Ping for urgent obligations (<= 7 days)
        if (hit.offset >= -7 && hit.offset <= 0) {
          const isToday = hit.offset === 0;
          const tgText = isToday
            ? `🚨 *DZISIAJ UPŁYWA TERMIN:* ${raw.title}${who}\nZaloguj zrealizowanie w aplikacji!`
            : `⚠️ *TERMIN ZA ${Math.abs(hit.offset)} DNI:* ${raw.title}${who} (${hit.occurrence})`;

          const { error: tgErr } = await supabase.from("outbound_messages").insert({
            user_id: raw.user_id,
            content: tgText,
            priority: "high",
            status: "pending",
          });
          if (tgErr) console.error("[push-reminder] telegram outbox insert failed", raw.id, tgErr);
        }

        if (!result.delivered) continue;

        const nextSent = [...parseSentReminders(raw.sent_reminders), hit.key];
        raw.sent_reminders = nextSent;
        const { error } = await supabase.from("life_obligations")
          .update({ sent_reminders: nextSent, updated_at: nowIso })
          .eq("id", raw.id);
        if (error) console.error("[push-reminder] obligation mark sent failed", raw.id, error);
        else sentObligations++;
      }
    }
  }


  let sentFinance = 0;
  try {
    sentFinance = await processFinanceAlerts(supabase, warsawDate, warsawMinutes, sendToUser);
  } catch (error: unknown) {
    console.error("[push-reminder] finance alerts failed", error);
  }

  const ambientResults = await processAmbientSignals(supabase, now, preloaded?.ambient);
  const sentOutbound = await dispatchDueOutboundMessages(supabase, nowIso, preloaded?.dueOutbound);

  return {
    sent_todos: sentTodos,
    sent_supplements: sentSupplements,
    sent_obligations: sentObligations,
    sent_outbound: sentOutbound,
    sent_finance_alerts: sentFinance,
    ambient_briefs: ambientResults.meeting_briefs,
    ambient_interventions: ambientResults.pattern_interventions,
    fcm_configured: fcmReady,
  };
}, { auth: "service" }));
