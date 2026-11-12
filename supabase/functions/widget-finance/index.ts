/**
 * @function widget-finance
 * @trigger HTTP POST / Android home-screen widget (Finanse)
 * @role Backend widgetu finansów: saldo kont bankowych w PLN, wydatki i wpływy bieżącego miesiąca oraz najważniejsze alerty (koperty, saldo, podwyżki).
 * @reads bank_accounts, bank_transactions, finance_category_budgets, widget_tokens
 * @writes —
 * @calls —
 * @consumer Widget Android FinanceWidgetProvider
 * @status active
 */
import { createServiceClient } from '../_shared/supabase.ts'
import { serveJson } from '../_shared/http.ts'
import { getWarsawDateString } from '../_shared/time.ts'
import { computeFinanceAlerts, type AlertTransaction } from '@vanguard/domain'
import { requireWidgetUser, WidgetHttpError } from '../_shared/widgetAuth.ts'

type Db = ReturnType<typeof createServiceClient>

const HISTORY_DAYS = 400
const PAGE = 1000
const NOT_SPENDING = new Set(['przelewy_wlasne', 'inwestycje', 'gotowka'])

async function loadTransactions(db: Db, userId: string, accountIds: string[], since: string): Promise<AlertTransaction[]> {
  const rows: AlertTransaction[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db.from('bank_transactions')
      .select('amount, currency, booking_date, counterparty_name, category, status:raw->>status')
      .eq('user_id', userId).in('account_id', accountIds).gte('booking_date', since)
      .order('booking_date', { ascending: false }).range(from, from + PAGE - 1)
    if (error) throw new Error(`bank_transactions: ${error.message}`)
    rows.push(...(data ?? []).map((row) => ({ ...row, amount: Number(row.amount) })))
    if (!data || data.length < PAGE) return rows
  }
}

async function summary(db: Db, userId: string) {
  const today = getWarsawDateString()
  const month = today.slice(0, 7)
  const since = new Date(Date.parse(`${today}T00:00:00Z`) - HISTORY_DAYS * 86_400_000).toISOString().slice(0, 10)
  const { data: accounts, error } = await db.from('bank_accounts').select('id, currency, balance, hidden').eq('user_id', userId)
  if (error) throw new Error(`bank_accounts: ${error.message}`)
  const list = (accounts ?? []).filter((a) => !a.hidden && (a.currency || 'PLN') === 'PLN')
  if (list.length === 0) return { today, connected: false }

  const [{ data: budgetRows }, transactions] = await Promise.all([
    db.from('finance_category_budgets').select('category, monthly_limit').eq('user_id', userId),
    loadTransactions(db, userId, list.map((a) => a.id), since),
  ])
  const budgets = Object.fromEntries((budgetRows ?? []).map((row) => [row.category, Number(row.monthly_limit)]))
  const booked = transactions.filter((tx) => tx.currency === 'PLN' && (tx.status == null || tx.status === 'BOOK') && tx.booking_date?.startsWith(month))
  const round = (value: number) => Math.round(value * 100) / 100
  const spent = booked.filter((tx) => tx.amount < 0 && !NOT_SPENDING.has(tx.category ?? '')).reduce((sum, tx) => sum + Math.abs(tx.amount), 0)
  const income = booked.filter((tx) => tx.amount > 0 && !NOT_SPENDING.has(tx.category ?? '') && tx.category !== 'zwrot').reduce((sum, tx) => sum + tx.amount, 0)
  const alerts = computeFinanceAlerts({ today, accounts: list.map((a) => ({ currency: a.currency, balance: a.balance == null ? null : Number(a.balance) })), transactions, budgets })
  return {
    today,
    connected: true,
    balance: round(list.reduce((sum, a) => sum + Number(a.balance ?? 0), 0)),
    spent: round(spent),
    income: round(income),
    alerts: alerts.slice(0, 2).map((alert) => ({ tone: alert.tone, text: alert.text })),
  }
}

Deno.serve(serveJson(async (req, { supabase: db }) => {
  try {
    const body = await req.clone().json().catch(() => ({})) as Record<string, unknown>
    const userId = await requireWidgetUser(db, req, body)
    if (body.action !== 'summary') throw new WidgetHttpError(400, 'Nieznana akcja.')
    return await summary(db, userId)
  } catch (err) {
    if (err instanceof WidgetHttpError) return Response.json({ error: err.message }, { status: err.status })
    throw err
  }
}, { auth: 'none' }))
