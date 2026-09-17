import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getWarsawClockMinutes, getWarsawDateString } from "@vanguard/domain";

interface CalendarEventRow {
  id: string;
  user_id: string;
  summary: string;
  start_time: string;
  end_time: string;
  category: string | null;
}

export async function processAmbientSignals(
  supabase: SupabaseClient,
  now: Date,
): Promise<{ meeting_briefs: number; pattern_interventions: number }> {
  let meetingBriefsCount = 0;
  let patternInterventionsCount = 0;

  const tgChatId = Deno.env.get("TELEGRAM_CHAT_ID");
  if (!tgChatId) return { meeting_briefs: 0, pattern_interventions: 0 };

  const nowMs = now.getTime();
  const nowIso = now.toISOString();
  const warsawDate = getWarsawDateString(now);
  const warsawMinutes = getWarsawClockMinutes(now);

  // ─── Attention Budget & Cooldown (JITAI framework) ───
  // Max 3 proactive ambient interruptions per day.
  // Minimum 90 minutes cooldown between proactive ambient interruptions to prevent attention fatigue.
  try {
    const todayStartIso = `${warsawDate}T00:00:00.000Z`;
    const { data: recentAmbient } = await supabase
      .from("outbound_messages")
      .select("send_after")
      .gte("send_after", todayStartIso)
      .not("dedupe_key", "is", null)
      .order("send_after", { ascending: false })
      .limit(5);

    if (recentAmbient && recentAmbient.length >= 3) {
      // Attention budget reached — respect user focus and remain silent
      return { meeting_briefs: 0, pattern_interventions: 0 };
    }

    if (recentAmbient && recentAmbient.length > 0) {
      const lastSentMs = new Date(recentAmbient[0].send_after).getTime();
      if (nowMs - lastSentMs < 90 * 60 * 1000) {
        // Cooldown active (<90 mins) — do not disturb
        return { meeting_briefs: 0, pattern_interventions: 0 };
      }
    }
  } catch (err) {
    console.error("[ambient] attention budget check error:", err);
  }

  // ─── 1. Before-Meeting Brief (Limitless pattern) ───
  // Scans for upcoming calendar events starting between 3 and 25 minutes from now.
  try {
    const minStartIso = new Date(nowMs + 3 * 60 * 1000).toISOString();
    const maxStartIso = new Date(nowMs + 25 * 60 * 1000).toISOString();

    const { data: upcomingEvents, error: calErr } = await supabase
      .from("vanguard_calendar")
      .select("id, user_id, summary, start_time, end_time, category")
      .gte("start_time", minStartIso)
      .lte("start_time", maxStartIso)
      .order("start_time", { ascending: true })
      .limit(5);

    if (!calErr && upcomingEvents && upcomingEvents.length > 0) {
      for (const event of upcomingEvents as CalendarEventRow[]) {
        const summaryLower = (event.summary || "").toLowerCase();
        // Ignore sleep / biometrics / auto-synced routine logs
        if (
          event.category === "sleep" ||
          event.category === "biometrics" ||
          summaryLower.includes("sen") ||
          summaryLower.includes("sleep") ||
          summaryLower.includes("oura")
        ) {
          continue;
        }

        const dedupeKey = `meeting_prep_${event.id}_${warsawDate}`;
        const { data: existing } = await supabase
          .from("outbound_messages")
          .select("id")
          .eq("dedupe_key", dedupeKey)
          .maybeSingle();

        if (existing) continue;

        const eventStartDate = new Date(event.start_time);
        const minutesLeft = Math.max(1, Math.round((eventStartDate.getTime() - nowMs) / 60000));
        const timeStr = eventStartDate.toLocaleTimeString("pl-PL", {
          timeZone: "Europe/Warsaw",
          hour: "2-digit",
          minute: "2-digit",
        });

        const text = `📅 *PRZYGOTOWANIE DO SPOTKANIA (za ${minutesLeft} min):*\n👉 *${event.summary}*\nGodzina: ${timeStr}\n\n🎯 *Zdefiniuj pożądany rezultat:* z jakim konkretnym efektem lub decyzją chcesz zakończyć to spotkanie?`;

        const { error: insErr } = await supabase.from("outbound_messages").insert({
          user_id: event.user_id,
          chat_id: tgChatId,
          content: text,
          payload: {
            method: "sendMessage",
            body: {
              chat_id: tgChatId,
              text,
              parse_mode: "Markdown",
            },
          },
          status: "pending",
          send_after: nowIso,
          priority: 15,
          dedupe_key: dedupeKey,
        });

        if (!insErr) {
          meetingBriefsCount++;
          console.log(`[ambient] scheduled meeting prep for "${event.summary}" at ${timeStr}`);
        }
      }
    }
  } catch (err) {
    console.error("[ambient] meeting prep check failed:", err);
  }

  // ─── 2. Avoidance / Silence Interruption (Dot & KIERUNEK pattern) ───
  // Fires around 13:00 Warsaw (780-785 mins) if no stream activity for >48h.
  try {
    if (warsawMinutes >= 780 && warsawMinutes <= 785) {
      const silenceDedupeKey = `ambient_silence_${warsawDate}`;
      const { data: existingSilence } = await supabase
        .from("outbound_messages")
        .select("id")
        .eq("dedupe_key", silenceDedupeKey)
        .maybeSingle();

      if (!existingSilence) {
        const { data: latestStream } = await supabase
          .from("vanguard_stream")
          .select("user_id, created_at")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (latestStream && latestStream.created_at) {
          const hoursSinceLast = (nowMs - new Date(latestStream.created_at).getTime()) / (3600 * 1000);
          if (hoursSinceLast >= 48) {
            const text = `Jakub, od 48 godzin brak nowych wpisów w Strumieniu.\nCzy pojawiło się tarcie lub bloker, czy działasz poza systemem?`;

            const { error: silenceErr } = await supabase.from("outbound_messages").insert({
              user_id: latestStream.user_id,
              chat_id: tgChatId,
              content: text,
              payload: {
                method: "sendMessage",
                body: {
                  chat_id: tgChatId,
                  text,
                },
              },
              status: "pending",
              send_after: nowIso,
              priority: 12,
              dedupe_key: silenceDedupeKey,
            });

            if (!silenceErr) {
              patternInterventionsCount++;
              console.log("[ambient] scheduled 48h silence intervention");
            }
          }
        }
      }
    }
  } catch (err) {
    console.error("[ambient] silence intervention check failed:", err);
  }

  return {
    meeting_briefs: meetingBriefsCount,
    pattern_interventions: patternInterventionsCount,
  };
}
