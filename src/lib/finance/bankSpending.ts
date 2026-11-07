import { BANK_CATEGORY_LABELS, type BankCategory } from '@vanguard/domain';

export interface SpendingRow { amount: number; category: string | null }

export interface CategorySpending {
  category: BankCategory;
  label: string;
  total: number;
  share: number;
}

const isCategory = (value: string | null): value is BankCategory => value != null && value in BANK_CATEGORY_LABELS;

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
    if (category === 'przelewy_wlasne') continue;
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
