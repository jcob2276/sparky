import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { computePortfolioTotals, valueHoldings, type HoldingInput } from '@vanguard/domain';
import { FinanceHoldingsHeatmap } from './FinanceHoldingsHeatmap';
import { FinanceRebalanceCard } from './FinanceRebalanceCard';
import { FinanceQuickEntry } from './FinanceQuickEntry';
import type { FinanceAccount } from '../../lib/financeApi';
import { FinancePortfolioTab } from './FinancePortfolioTab';
import { useHoldingMutations } from '../../lib/finance/holdingsApi';

it('shows session and crypto daily changes with quote dates in position rows, including small positions', () => {
  const holdings = valueHoldings([
    holding('BTC-USD', { assetClass: 'crypto', quantity: 0.001 }),
    holding('ABC', { quantity: 100 }),
  ], { 'BTC-USD': { pricePln: 200000, changePct: -0.12, asOf: '2026-11-07T12:00:00Z' }, ABC: { pricePln: 150, changePct: 2.5, asOf: '2026-11-06T20:00:00Z' } });
  function Portfolio() {
    const mutations = useHoldingMutations(undefined);
    return <FinancePortfolioTab holdings={holdings} totals={computePortfolioTotals(holdings)} mutations={mutations} run={async fn => fn()} />;
  }
  render(<QueryClientProvider client={new QueryClient()}><Portfolio /></QueryClientProvider>);
  expect(screen.getByRole('region', { name: 'Pozycje' })).toBeVisible();
  expect(screen.queryByText('Gdzie jest majątek')).not.toBeInTheDocument();
  const history = screen.getByRole('button', { name: 'Historia portfela' });
  const historyPanel = document.getElementById(history.getAttribute('aria-controls') ?? '');
  expect(historyPanel).not.toBeVisible();
  fireEvent.click(history);
  expect(history).toHaveAttribute('aria-expanded', 'true');
  expect(historyPanel).toBeVisible();
  fireEvent.click(history);
  expect(historyPanel).not.toBeVisible();
  expect(screen.queryByRole('list', { name: 'Pozycje portfela według wartości i zmiany dziennej' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('tab', { name: 'Mapa' }));
  expect(screen.getByRole('list', { name: 'Pozycje portfela według wartości i zmiany dziennej' })).toBeVisible();
  fireEvent.click(screen.getByRole('tab', { name: 'Lista' }));
  const crypto = screen.getByRole('button', { name: /BTC-USD/ });
  expect(within(crypto).getByText(/Zmiana dzienna/)).toHaveTextContent('2026-11-07');
  expect(within(crypto).getByText('-0,12%')).toBeVisible();
  const stock = screen.getByRole('button', { name: /ABC/ });
  expect(within(stock).getByText(/Ostatnia sesja/)).toHaveTextContent('2026-11-06');
  expect(within(stock).getByText('+2,50%')).toBeVisible();
});

const holding = (id: string, overrides: Partial<HoldingInput> = {}): HoldingInput => ({
  id, ticker: id.toUpperCase(), name: id, assetClass: 'etf', quantity: 10, avgCostPln: 100, targetWeightPct: null, ...overrides,
});

describe('FinanceHoldingsHeatmap', () => {
  it('shows an empty hint without positions', () => {
    render(<FinanceHoldingsHeatmap holdings={[]} loading={false} />);
    expect(screen.getByText(/Dodaj pozycje, a zobaczysz/)).toBeInTheDocument();
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
    fireEvent.change(screen.getByLabelText('Źródło środków na zakup'), { target: { value: 'external' } });
    fireEvent.click(screen.getByRole('button', { name: /Kupione/ }));
    expect(onBought).toHaveBeenCalledWith(expect.objectContaining({ id: 'b' }), 10, 50, null);
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
    render(<FinanceQuickEntry accounts={[account]} pending={false} open initialKind="expense" onOpenChange={onOpenChange} onSubmit={onSubmit} />);

    for (const key of ['2', '5', 'Przecinek', '5']) fireEvent.click(screen.getByRole('button', { name: key }));
    fireEvent.submit(screen.getByRole('button', { name: /Dodaj wydatek/ }).closest('form')!);

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      kind: 'expense', amount: 25.5, category: 'Jedzenie', accountId: 'cash-1',
    }));
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it('recognises a fuel note and saves it as a fuel expense', async () => {
    window.localStorage.clear();
    const onSubmit = vi.fn().mockResolvedValue(true);
    render(<FinanceQuickEntry accounts={[account]} pending={false} open initialKind="expense" onOpenChange={vi.fn()} onSubmit={onSubmit} />);
    for (const key of ['1', '8', '0']) fireEvent.click(screen.getByRole('button', { name: key }));
    fireEvent.click(screen.getByRole('button', { name: 'Transport' }));
    fireEvent.click(screen.getByRole('button', { name: 'Dodaj notatkę' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Notatka' }), { target: { value: 'Paliwo' } });
    expect(screen.getByText('Paliwo')).toBeInTheDocument();
    fireEvent.submit(screen.getByRole('button', { name: /Dodaj wydatek/ }).closest('form')!);
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ amount: 180, category: 'Paliwo' })));
  });

  it('remembers the last category for the next entry', async () => {
    window.localStorage.clear();
    const onSubmit = vi.fn().mockResolvedValue(true);
    const { unmount } = render(<FinanceQuickEntry accounts={[account]} pending={false} open initialKind="expense" onOpenChange={vi.fn()} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole('button', { name: 'Transport' }));
    fireEvent.click(screen.getByRole('button', { name: '7' }));
    fireEvent.submit(screen.getByRole('button', { name: /Dodaj wydatek/ }).closest('form')!);
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    unmount();

    render(<FinanceQuickEntry accounts={[account]} pending={false} open initialKind="expense" onOpenChange={vi.fn()} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole('button', { name: '8' }));
    expect(screen.getByRole('button', { name: 'Transport' })).toHaveAttribute('aria-pressed', 'true');
  });
});
