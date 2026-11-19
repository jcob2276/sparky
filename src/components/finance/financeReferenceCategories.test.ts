import { describe, expect, it } from 'vitest';
import type { FinanceTransaction } from '../../lib/financeApi';
import { financeCategory, financeTransactionCategory, summarizeFinanceCategories } from './financeReferenceCategories';

const tx = (category: string, amount: number, flow_kind: FinanceTransaction['flow_kind'] = 'expense'): FinanceTransaction => ({
  id: category, user_id: 'u', category, amount, flow_kind, kind: flow_kind === 'expense' ? 'expense' : 'income',
  note: null, transaction_date: '2026-11-19', created_at: '',
});

describe('hierarchical expense categories', () => {
  it('combines existing bank and manual labels without inventing a detail for generic food entries', () => {
    expect(financeCategory('  zakupy_spozywcze ')).toEqual({ group: 'Jedzenie', detail: 'Zakupy spożywcze' });
    expect(financeCategory('Transport')).toEqual({ group: 'Transport', detail: 'Bez podkategorii' });
    expect(financeCategory('JEDZENIE')).toEqual({ group: 'Jedzenie', detail: 'Bez podkategorii' });
    expect(financeCategory('Jedzenie na mieście')).toEqual({ group: 'Jedzenie', detail: 'Jedzenie na mieście' });
  });

  it('preserves unlabeled and custom entries separately', () => {
    expect(financeCategory(' ')).toEqual({ group: 'Do sprawdzenia', detail: 'Bez podkategorii' });
    expect(financeCategory('Pies')).toEqual({ group: 'Inne', detail: 'Pies' });
  });

  it('keeps refunds and uncategorized income outside expense categories in history', () => {
    expect(financeTransactionCategory(tx('Zdrowie', 12, 'refund'))).toEqual({ group: 'Zwroty', detail: 'Zdrowie' });
    expect(financeTransactionCategory(tx('Inne', 20, 'income'))).toEqual({ group: 'Wpływy', detail: 'Inne' });
  });

  it('conserves expense totals down to the grosz and excludes refunds, income and zeroes', () => {
    const summary = summarizeFinanceCategories([
      tx('Zakupy spożywcze', -3.01), tx('jedzenie', 1.09), tx('Jedzenie na mieście', 5),
      tx('Transport', 0), tx('Jedzenie', 5, 'refund'), tx('Wynagrodzenie', 1e4, 'income'),
    ]);
    expect(summary).toEqual([{ group: 'Jedzenie', amount: 9.1, details: [
      { detail: 'Jedzenie na mieście', amount: 5 },
      { detail: 'Zakupy spożywcze', amount: 3.01 },
      { detail: 'Bez podkategorii', amount: 1.09 },
    ] }]);
  });
});
