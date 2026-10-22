import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { valueHoldings, type HoldingInput } from '@vanguard/domain';
import { FinanceHoldingsHeatmap } from './FinanceHoldingsHeatmap';
import { FinanceRebalanceCard } from './FinanceRebalanceCard';
import { FinanceQuickEntry } from './FinanceQuickEntry';
import type { FinanceAccount } from '../../lib/financeApi';

const holding = (id: string, overrides: Partial<HoldingInput> = {}): HoldingInput => ({
  id, ticker: id.toUpperCase(), name: id, assetClass: 'etf', quantity: 10, avgCostPln: 100, targetWeightPct: null, ...overrides,
});

describe('FinanceHoldingsHeatmap', () => {
  it('shows an empty hint without positions', () => {
    render(<FinanceHoldingsHeatmap holdings={[]} loading={false} />);
    expect(screen.getByText(/Dodaj pozycje w zakładce Portfel/)).toBeInTheDocument();
  });

  it('renders one tile per position with the daily change', () => {
    const rows = valueHoldings(
      [holding('vgwd.de'), holding('zprg.de')],
      { 'VGWD.DE': { pricePln: 150, changePct: 0.61, asOf: null }, 'ZPRG.DE': { pricePln: 90, changePct: -0.77, asOf: null } },
    );
    render(<FinanceHoldingsHeatmap holdings={rows} loading={false} />);

    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByText('+0,61%')).toBeInTheDocument();
    expect(screen.getByText('-0,77%')).toBeInTheDocument();
  });
});

describe('FinanceRebalanceCard', () => {
  it('asks for targets when none are set', () => {
    render(<FinanceRebalanceCard holdings={valueHoldings([holding('a')], {})} onBought={vi.fn()} />);
    expect(screen.getByText(/Ustaw cel wagi/)).toBeInTheDocument();
  });

  it('lists the underweight position and lets the user record the purchase', () => {
    const rows = valueHoldings(
      [holding('a', { targetWeightPct: 50 }), holding('b', { targetWeightPct: 50 })],
      { A: { pricePln: 150, changePct: null, asOf: null }, B: { pricePln: 50, changePct: null, asOf: null } },
    );
    const onBought = vi.fn();
    render(<FinanceRebalanceCard holdings={rows} onBought={onBought} />);

    fireEvent.change(screen.getByLabelText('Kwota dopłaty'), { target: { value: '500' } });

    expect(screen.getByText('B')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Kupione/ }));
    expect(onBought).toHaveBeenCalledWith(expect.objectContaining({ id: 'b' }), 10, 50);
  });
});

describe('FinanceQuickEntry', () => {
  const account: FinanceAccount = {
    id: 'cash-1', user_id: 'u', name: 'Portfel', balance: 300, account_type: 'cash', is_liquid: true,
    sort_order: 0, coingecko_id: null, crypto_amount: null, created_at: '',
  };

  it('saves an expense typed on the keypad against the default cash account', async () => {
    window.localStorage.clear();
    const onSubmit = vi.fn().mockResolvedValue(true);
    const onOpenChange = vi.fn();
    render(<FinanceQuickEntry accounts={[account]} pending={false} open onOpenChange={onOpenChange} showFab={false} onSubmit={onSubmit} />);

    for (const key of ['2', '5', 'Przecinek', '5']) fireEvent.click(screen.getByRole('button', { name: key }));
    fireEvent.submit(screen.getByRole('button', { name: /Zapisz/ }).closest('form')!);

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      kind: 'expense', amount: 25.5, category: 'Jedzenie', accountId: 'cash-1',
    }));
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it('remembers the last category for the next entry', async () => {
    window.localStorage.clear();
    const onSubmit = vi.fn().mockResolvedValue(true);
    const { unmount } = render(<FinanceQuickEntry accounts={[account]} pending={false} open onOpenChange={vi.fn()} showFab={false} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole('button', { name: 'Transport' }));
    fireEvent.click(screen.getByRole('button', { name: '7' }));
    fireEvent.submit(screen.getByRole('button', { name: /Zapisz/ }).closest('form')!);
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    unmount();

    render(<FinanceQuickEntry accounts={[account]} pending={false} open onOpenChange={vi.fn()} showFab={false} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole('button', { name: '8' }));
    expect(screen.getByText(/· Transport/)).toBeInTheDocument();
  });
});
