/**
 * @function fathom-webhook
 * @trigger HTTP POST — webhook Fathom "new meeting content ready" (podpis Standard Webhooks)
 * @role Zapis nagranej rozmowy z Google Meet do closer_calls i analiza AI (błędy / dobre zagrania).
 * @reads closer_calls
 * @writes closer_calls
 * @calls deepseek-chat (w _shared/closerCallAnalysis.ts)
 * @consumer Widok Closer (lista rozmów), Oracle (dataset closer_calls)
 * @status active
 */
import { serveJson } from "../_shared/http.ts";
import { getVanguardUserId } from "../_shared/constants.ts";
import { logCriticalError } from "../_shared/errorLogging.ts";
import { analyzeCloserCall } from "../_shared/closerCallAnalysis.ts";
import { mapMeetingToCall, verifyFathomSignature } from "../_shared/fathomWebhook.ts";

Deno.serve(
  serveJson(async (req, ctx) => {
    const secret = Deno.env.get("FATHOM_WEBHOOK_SECRET") || "";
    if (!secret) return new Response("Webhook secret not configured", { status: 503 });

    const rawBody = await req.text();
    if (!(await verifyFathomSignature(secret, req.headers, rawBody))) {
      return new Response("Forbidden", { status: 403 });
    }

    const userId = getVanguardUserId();
    const row = mapMeetingToCall(userId, JSON.parse(rawBody));
    if (!row) return new Response("Ignored", { status: 200 });

    const { data, error } = await ctx.supabase
      .from("closer_calls")
      .upsert(row, { onConflict: "user_id,fathom_recording_id" })
      .select("id")
      .single();
    if (error) throw error;

    try {
      await analyzeCloserCall(ctx.supabase, userId, data.id);
    } catch (err) {
      await logCriticalError({ area: "fathom-webhook", error: err, metadata: { callId: data.id } });
    }
    return new Response("OK", { status: 200 });
  }, { auth: "none" }),
);
