import { BANK_CATEGORY_LABELS } from './bankCategories.ts';
import { detectRecurring } from './bankRecurring.ts';
import { detectPriceHikes, forecastBalance } from './balanceForecast.ts';

export interface AlertTransaction {
  amount: number;
  currency: string;
  booking_date: string | null;
  counterparty_name: string | null;
  category: string | null;
  /** `BOOK` lub brak = zaksięgowana; reszta (np. PDNG) jest pomijana. */
  status?: string | null;
}
export interface AlertAccount { currency: string | null; balance: number | null; hidden?: boolean }
export interface FinanceAlert { id: string; tone: 'danger' | 'warning' | 'info'; text: string }

export interface FinanceAlertInput {
  today: string;
  accounts: readonly AlertAccount[];
  transactions: readonly AlertTransaction[];
  /** Limity miesięczne: kategoria -> kwota w PLN. */
  budgets: Readonly<Record<string, number>>;
}

const DAY_MS = 86_400_000;
const EXCLUDED_FROM_SPENDING = new Set(['przelewy_wlasne', 'inwestycje', 'gotowka']);
const pln = (value: number) => `${Math.round(value).toLocaleString('pl-PL')} zł`;
const label = (category: string) => (BANK_CATEGORY_LABELS as Record<string, string>)[category] ?? category;
const shift = (iso: string, days: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);

/**
 * Rzeczy, które wymagają uwagi teraz (PLN): przekroczone koperty, ujemne saldo w prognozie 30 dni, podwyżki stałych
 * płatności i transakcje bez kategorii. Używane w aplikacji i w codziennym powiadomieniu push.
 */
export function computeFinanceAlerts(input: FinanceAlertInput): FinanceAlert[] {
  const { today, budgets } = input;
  const booked = input.transactions.filter(tx => tx.currency === 'PLN' && tx.booking_date != null && tx.booking_date <= today && (tx.status == null || tx.status === 'BOOK'));
  const month = today.slice(0, 7);
  const monthRows = booked.filter(tx => tx.booking_date?.startsWith(month));

  const spent = new Map<string, number>();
  for (const tx of monthRows) {
    const category = tx.category ?? 'do_sprawdzenia';
    if (tx.amount >= 0 || EXCLUDED_FROM_SPENDING.has(category)) continue;
    spent.set(category, (spent.get(category) ?? 0) + Math.abs(tx.amount));
  }

  const alerts: FinanceAlert[] = [];
  for (const [category, limit] of Object.entries(budgets)) {
    const used = spent.get(category) ?? 0;
    if (used > limit) alerts.push({ id: `env-${category}`, tone: 'danger', text: `${label(category)}: ${pln(used - limit)} ponad limit koperty.` });
    else if (used > limit * 0.8) alerts.push({ id: `env-${category}`, tone: 'warning', text: `${label(category)}: wykorzystane ${Math.round((used / limit) * 100)}% limitu.` });
  }

  const since = shift(today, -400);
  const recurring = detectRecurring(booked
    .filter(tx => tx.booking_date && tx.booking_date >= since && tx.amount < 0 && !['przelewy_wlasne', 'inwestycje', 'gotowka'].includes(tx.category ?? ''))
    .map(tx => ({ counterparty: tx.counterparty_name, amount: tx.amount, date: tx.booking_date! })));
  if (recurring.length) {
    const balance = input.accounts.filter(a => !a.hidden && (a.currency || 'PLN') === 'PLN').reduce((sum, a) => sum + (a.balance ?? 0), 0);
    const negative = forecastBalance(balance, today, 30, recurring).firstNegative;
    if (negative) alerts.push({ id: 'negative', tone: 'danger', text: `Saldo może spaść poniżej zera ${negative.date} przez stałe płatności.` });
  }
  for (const hike of detectPriceHikes(recurring)) {
    alerts.push({ id: `hike-${hike.name}`, tone: 'warning', text: `${hike.name}: podwyżka o ${Math.round(hike.pct * 100)}% (${pln(hike.from)} → ${pln(hike.to)}).` });
  }
  const review = monthRows.filter(tx => !tx.category || tx.category === 'do_sprawdzenia').length;
  if (review > 0) alerts.push({ id: 'review', tone: 'info', text: `${review} transakcji czeka na kategorię.` });

  const order = { danger: 0, warning: 1, info: 2 };
  return alerts.sort((a, b) => order[a.tone] - order[b.tone]);
}
