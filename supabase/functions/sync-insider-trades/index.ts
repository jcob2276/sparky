/**
 * @function sync-insider-trades
 * @trigger HTTP POST / manual / cron
 * @role Synchronizacja transakcji Kongresu USA, Senatu i insiderów z otwartych źródeł (STOCK Act).
 * @reads insider_trades
 * @writes insider_trades
 * @calls raw.githubusercontent.com, api.telegram.org (opcjonalny alert)
 * @consumer Komenda /inwestycje w Telegramie, Oracle SQL tool, dashboard
 * @status active
 */
import { serveJson } from "../_shared/http.ts";
import { syncInsiderTrades } from "../_shared/insiderTrades.ts";

Deno.serve(
  serveJson(async (req, ctx) => {
    const supabase = ctx.supabase;
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") || "500", 10);

    const result = await syncInsiderTrades(supabase, { limit });

    return {
      ok: result.success,
      synced: result.synced,
      error: result.error || null,
      timestamp: new Date().toISOString(),
    };
  }, { auth: "none" }),
);
