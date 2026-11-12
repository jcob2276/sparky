import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { HoldingHistoryView } from './FinanceHoldingHistory';
import type { HoldingEvent } from '../../lib/finance/holdingEventsApi';
afterEach(cleanup);
it('distinguishes opening balances, purchases and corrections without inventing cash flows', () => {
  const base: HoldingEvent = { id: '1', user_id: 'u', holding_id: 'h', ticker: 'ABC', name: 'Example', kind: 'opening', quantity_before: 0, quantity_after: 10, avg_cost_before: null, avg_cost_after: 100, cost_currency: 'PLN', avg_cost_original_before: null, avg_cost_original_after: null, cost_currency_before: null, cost_currency_after: null, amount_pln: null, funding_account_id: null, recorded_at: '2026-11-12T12:00:00Z' };
  render(<HoldingHistoryView events={[base, { ...base, id: '2', kind: 'purchase', quantity_before: 10, quantity_after: 12, amount_pln: 300 }, { ...base, id: '3', kind: 'adjustment', quantity_before: 12, quantity_after: 11 }]} />);
  expect(screen.getByText(/Stan początkowy/)).toBeVisible();
  expect(screen.getByText(/Zakup/)).toBeVisible();
  expect(screen.getByText(/Korekta pozycji/)).toBeVisible();
  expect(screen.getByText('300,00 zł')).toBeVisible();
  expect(screen.getAllByText('—')).toHaveLength(2);
});
