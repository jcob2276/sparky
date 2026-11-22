import { getWarsawDateString } from "@vanguard/domain";
import type { AmbientPreloaded } from "./ambient.ts";
import type { FcmTokenRow, LifeObligationRow, Preloaded, PushSubscriptionRow, SupplementRow } from "./types.ts";

// deno-lint-ignore no-explicit-any
type Db = any;

export interface ReminderData {
  subscriptions: PushSubscriptionRow[] | null;
  fcmTokens: FcmTokenRow[] | null;
  dueTodos: { id: string; user_id: string; title: string }[] | null;
  supplements: SupplementRow[] | null;
  obligations: LifeObligationRow[] | null;
  preloaded: Preloaded | undefined;
}

/** Wszystko, czego potrzebuje jeden przebieg przypomnień: jeden odczyt RPC albo, gdy go nie ma, odczyt tabel po staremu. */
export async function loadReminderData(supabase: Db, now: Date): Promise<ReminderData> {
  const nowIso = now.toISOString();
  const warsawDate = getWarsawDateString(now);
  // Jeden odczyt (RPC) zamiast ~9 zapytań REST co minutę: mniej wpisów w logach API Supabase.
  // Gdy RPC jest niedostępne (np. migracja jeszcze niezastosowana), funkcja czyta tabele po staremu.
  const meetingFromIso = new Date(now.getTime() + 3 * 60 * 1000).toISOString();
  const meetingToIso = new Date(now.getTime() + 25 * 60 * 1000).toISOString();
  const { data: snapshot, error: snapshotError } = await supabase.rpc("push_reminder_snapshot", {
    p_now: nowIso,
    p_today_start: `${warsawDate}T00:00:00.000Z`,
    p_meeting_from: meetingFromIso,
    p_meeting_to: meetingToIso,
    p_sweep_before: new Date(now.getTime() - 10000).toISOString(),
  });
  if (snapshotError) console.warn("[push-reminder] snapshot RPC unavailable, falling back", snapshotError.message);

  let subscriptions: PushSubscriptionRow[] | null;
  let fcmTokens: FcmTokenRow[] | null;
  let dueTodos: { id: string; user_id: string; title: string }[] | null;
  let supplements: SupplementRow[] | null;
  let obligations: LifeObligationRow[] | null;
  let preloaded: Preloaded | undefined;

  if (!snapshotError && snapshot) {
    const snap = snapshot as Record<string, unknown[]>;
    subscriptions = snap.subscriptions as PushSubscriptionRow[];
    fcmTokens = snap.fcm_tokens as FcmTokenRow[];
    dueTodos = snap.due_todos as typeof dueTodos;
    supplements = snap.supplements as SupplementRow[];
    obligations = snap.obligations as LifeObligationRow[];
    preloaded = {
      ambient: {
        recentAmbient: snap.recent_ambient as { send_after: string }[],
        upcomingEvents: snap.upcoming_events as AmbientPreloaded["upcomingEvents"],
      },
      dueOutbound: snap.due_outbound,
    };
  } else {
    const [
      { data: subs, error: subsError },
      { data: fcm, error: fcmError },
      { data: todos, error: todoError },
      { data: supps, error: supplementError },
      { data: obls, error: obligationError },
    ] = await Promise.all([
      supabase.from("push_subscriptions").select("user_id, endpoint, keys_p256dh, keys_auth"),
      supabase.from("push_fcm_tokens").select("user_id, token"),
      supabase.from("todo_items")
        .select("id, user_id, title")
        .lte("reminder_at", nowIso)
        .eq("reminder_sent", false)
        .neq("status", "done")
        .limit(50),
      supabase.from("supplements")
        .select("id, user_id, name, emoji, reminder_time, start_date, end_date, reminder_sent_date")
        .eq("active", true)
        .not("reminder_time", "is", null),
      supabase.from("life_obligations")
        .select("id, user_id, title, kind, related_name, anchor_date, recurrence, lead_offsets, sent_reminders")
        .eq("is_active", true)
        .limit(200),
    ]);

    if (subsError) throw new Error(`Push subscriptions fetch failed: ${subsError.message}`);
    if (fcmError) throw new Error(`FCM tokens fetch failed: ${fcmError.message}`);
    if (todoError) throw new Error(`Todo reminders fetch failed: ${todoError.message}`);
    if (supplementError) throw new Error(`Supplement reminders fetch failed: ${supplementError.message}`);
    if (obligationError) throw new Error(`Life obligations fetch failed: ${obligationError.message}`);
    subscriptions = subs; fcmTokens = fcm; dueTodos = todos; supplements = supps;
    obligations = obls as LifeObligationRow[] | null;
  }

  return { subscriptions, fcmTokens, dueTodos, supplements, obligations, preloaded };
}
