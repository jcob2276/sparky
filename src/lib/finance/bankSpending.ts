import { BANK_CATEGORY_LABELS, type BankCategory } from '@vanguard/domain';

export interface SpendingRow { amount: number; category: string | null }

export interface CategorySpending {
  category: BankCategory;
  label: string;
  total: number;
  share: number;
}

const isCategory = (value: string | null): value is BankCategory => value != null && Object.prototype.hasOwnProperty.call(BANK_CATEGORY_LABELS, value);

/** Etykieta kategorii; brak lub nieznana to "Do sprawdzenia", żeby UI nigdy nie pokazał pustego pola. */
export function bankCategoryLabel(category: string | null): string {
  return isCategory(category) ? BANK_CATEGORY_LABELS[category] : BANK_CATEGORY_LABELS.do_sprawdzenia;
}

/**
 * Wydatki (tylko obciążenia) pogrupowane po kategorii, malejąco. Przelewy własne (np. doładowanie
 * Revolut) nie są wydatkiem, więc nie wchodzą do sumy ani do udziałów.
 */
export function summarizeSpending(rows: readonly SpendingRow[]): CategorySpending[] {
  const totals = new Map<BankCategory, number>();
  for (const row of rows) {
    if (row.amount >= 0) continue;
    const category = isCategory(row.category) ? row.category : 'do_sprawdzenia';
    if (['przelewy_wlasne', 'inwestycje', 'gotowka'].includes(category)) continue;
    totals.set(category, (totals.get(category) ?? 0) + Math.abs(row.amount));
  }
  const sum = [...totals.values()].reduce((a, b) => a + b, 0);
  return [...totals.entries()]
    .map(([category, total]) => ({
      category,
      label: BANK_CATEGORY_LABELS[category],
      total: Math.round(total * 100) / 100,
      share: sum > 0 ? total / sum : 0,
    }))
    .sort((a, b) => b.total - a.total);
}

export interface SpendingChange { category: BankCategory; label: string; current: number; previous: number; delta: number }

/**
 * Kategorie, w których wydatki wyraźnie odbiegają od analogicznego okresu poprzedniego miesiąca
 * (co najmniej o `minDelta` zł i 20%), od największej różnicy. Służy karcie "Co się zmieniło".
 */
export function spendingChanges(current: readonly CategorySpending[], previous: readonly CategorySpending[], limit = 3, minDelta = 30): SpendingChange[] {
  const before = new Map(previous.map(item => [item.category, item.total]));
  const seen = new Set<BankCategory>();
  const rows: SpendingChange[] = [];
  const push = (category: BankCategory, label: string, now: number) => {
    seen.add(category);
    const prev = before.get(category) ?? 0;
    const delta = Math.round((now - prev) * 100) / 100;
    if (Math.abs(delta) >= minDelta && Math.abs(delta) >= prev * 0.2) rows.push({ category, label, current: now, previous: prev, delta });
  };
  for (const item of current) push(item.category, item.label, item.total);
  for (const item of previous) if (!seen.has(item.category)) push(item.category, item.label, 0);
  return rows.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, limit);
}
