/**
 * @function closer-reanalyze
 * @trigger HTTP POST — przycisk „Przeanalizuj ponownie” w analizie rozmowy albo service role (przeliczenie historii)
 * @role Ponowna analiza AI jednej zapisanej rozmowy closera tym samym kodem co webhook Fathom (aktualny prompt);
 *       z `metricsOnly: true` przelicza tylko metryki prowadzenia rozmowy (bez AI).
 * @reads closer_calls
 * @writes closer_calls
 * @calls deepseek-chat (w _shared/closerCallAnalysis.ts)
 * @consumer Widok analizy rozmowy (CloserCallReviewView)
 * @status active
 */
import { HttpError, serveJson } from "../_shared/http.ts";
import { analyzeCloserCall } from "../_shared/closerCallAnalysis.ts";
import { refreshCallMetrics } from "../_shared/closerCallMetrics.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(
  serveJson(async (req, ctx) => {
    const body = await req.json().catch(() => ({}));
    const callId = typeof body.callId === "string" ? body.callId : "";
    if (!ctx.userId) throw new HttpError(400, "userId required");
    if (!UUID.test(callId)) throw new HttpError(400, "callId required");

    if (body.metricsOnly === true) {
      const metrics = await refreshCallMetrics(ctx.supabase, ctx.userId, callId);
      return { ok: true, metrics: metrics !== null };
    }

    // analiza czyta rozmowę z filtrem user_id, więc cudza rozmowa daje błąd zamiast zapisu
    await analyzeCloserCall(ctx.supabase, ctx.userId, callId);
    const { data, error } = await ctx.supabase
      .from("closer_calls")
      .select("ai_status, ai_analyzed_at")
      .eq("id", callId)
      .eq("user_id", ctx.userId)
      .single();
    if (error) throw error;
    return { ok: true, status: data.ai_status, analyzedAt: data.ai_analyzed_at };
  }),
);
