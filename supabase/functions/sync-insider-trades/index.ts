/**
 * @function sync-insider-trades
 * @trigger HTTP POST / manual / cron
 * @role Synchronizacja oficjalnych transakcji SEC Form 4 z EDGAR.
 * @reads insider_trades, sec_form4_filings
 * @writes insider_trades, sec_form4_filings
 * @calls www.sec.gov
 * @consumer Komenda /inwestycje w Telegramie, Oracle SQL tool, dashboard
 * @status active
 */
import { serveJson } from "../_shared/http.ts";
import { syncInsiderTrades } from "../_shared/insiderTrades.ts";

Deno.serve(
  serveJson(async (req, ctx) => {
    const supabase = ctx.supabase;
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") || "30", 10);

    const days = parseInt(url.searchParams.get("days") || "3", 10);
    const result = await syncInsiderTrades(supabase, { limit, days });

    return {
      ...result,
      ok: result.success,
      synced: result.synced,
      error: result.error || null,
      timestamp: new Date().toISOString(),
    };
  }, { auth: "user" }),
);
