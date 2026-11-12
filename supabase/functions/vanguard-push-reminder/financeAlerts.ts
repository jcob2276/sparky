import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { computeFinanceAlerts, type AlertTransaction } from "@vanguard/domain";

/** Poranne okno (Warsaw), w którym wysyłamy podsumowanie alertów finansowych. */
const WINDOW_START_MINUTES = 8 * 60;
const WINDOW_END_MINUTES = 8 * 60 + 10;
const HISTORY_DAYS = 400;
const PAGE = 1000;

interface Payload { title: string; body: string; url: string; tag: string }
type Send = (userId: string, payload: Payload) => Promise<{ delivered: boolean }>;

async function loadTransactions(supabase: SupabaseClient, userId: string, accountIds: string[], since: string): Promise<AlertTransaction[]> {
  const rows: AlertTransaction[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase.from("bank_transactions")
      .select("amount, currency, booking_date, counterparty_name, category, status:raw->>status")
      .eq("user_id", userId).in("account_id", accountIds).gte("booking_date", since)
      .order("booking_date", { ascending: false }).range(from, from + PAGE - 1);
    if (error) throw new Error(`bank_transactions: ${error.message}`);
    rows.push(...(data ?? []).map((row) => ({ ...row, amount: Number(row.amount) })));
    if (!data || data.length < PAGE) return rows;
  }
}

/**
 * Raz dziennie rano: przekroczone koperty, ujemne saldo w prognozie i podwyżki stałych płatności jako jeden push.
 * Alert o danym id wraca najwyżej raz w miesiącu (finance_alert_log), żeby nie męczyć.
 */
export async function processFinanceAlerts(
  supabase: SupabaseClient,
  warsawDate: string,
  warsawMinutes: number,
  send: Send,
): Promise<number> {
  if (warsawMinutes < WINDOW_START_MINUTES || warsawMinutes >= WINDOW_END_MINUTES) return 0;
  const { data: accounts, error } = await supabase.from("bank_accounts").select("id, user_id, currency, balance, hidden");
  if (error) throw new Error(`bank_accounts: ${error.message}`);
  const byUser = new Map<string, typeof accounts>();
  for (const account of accounts ?? []) byUser.set(account.user_id, [...(byUser.get(account.user_id) ?? []), account]);

  const month = warsawDate.slice(0, 7);
  const since = new Date(Date.parse(`${warsawDate}T00:00:00Z`) - HISTORY_DAYS * 86_400_000).toISOString().slice(0, 10);
  let sent = 0;
  for (const [userId, userAccounts] of byUser) {
    const [{ data: budgetRows }, { data: logRows }, transactions] = await Promise.all([
      supabase.from("finance_category_budgets").select("category, monthly_limit").eq("user_id", userId),
      supabase.from("finance_alert_log").select("alert_key").eq("user_id", userId).like("alert_key", `${month}:%`),
      loadTransactions(supabase, userId, userAccounts.map((a) => a.id), since),
    ]);
    const budgets = Object.fromEntries((budgetRows ?? []).map((row) => [row.category, Number(row.monthly_limit)]));
    const logged = new Set((logRows ?? []).map((row) => row.alert_key));
    const fresh = computeFinanceAlerts({
      today: warsawDate,
      accounts: userAccounts.map((a) => ({ currency: a.currency, balance: a.balance == null ? null : Number(a.balance), hidden: a.hidden })),
      transactions, budgets,
    }).filter((alert) => alert.tone !== "info" && !logged.has(`${month}:${alert.id}`));
    if (fresh.length === 0) continue;

    const body = fresh.slice(0, 3).map((alert) => alert.text).join("\n");
    const result = await send(userId, { title: "💸 Finanse: uwaga", body, url: "/finanse", tag: `finance-alerts-${warsawDate}` });
    if (!result.delivered) continue;
    const { error: logError } = await supabase.from("finance_alert_log")
      .upsert(fresh.map((alert) => ({ user_id: userId, alert_key: `${month}:${alert.id}` })));
    if (logError) console.error("[push-reminder] finance alert log failed", logError);
    else sent++;
  }
  return sent;
}
