import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GpwScreenerView } from './GpwScreenerView';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const companies = [
  { ticker: 'AAA', name: 'Alpha', sector: 'Finance', mcap: 2e9, pe: 30,
    div_yield: 0, revenue_yoy: 0, fcf_yield: 0.08, net_debt_ebitda: 4, forward_pe: 10,
    forward_eps: 10, forward_pe_basis: 'rolling_fy', quote_price: 100,
    quote_currency: 'PLN', financial_currency: 'PLN',
    refreshed_at: '2026-10-05T15:00:00Z' },
  { ticker: 'BBB', name: 'Beta', sector: 'Finance', mcap: 1e9, pe: 5,
    div_yield: 0.03, revenue_yoy: 0.2, fcf_yield: 0.01, net_debt_ebitda: 1, forward_pe: 20,
    refreshed_at: '2026-10-05T15:00:00Z' },
];

function renderScreener() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><GpwScreenerView /></QueryClientProvider>);
}

describe('GPW screener', () => {
  it('shows a fetch failure and lets the user retry', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => new Response('{}', { status: 400 })));
    renderScreener();
    expect(await screen.findByText(/Nie udało się pobrać fundamentów GPW/)).toBeInTheDocument();
    expect(screen.queryByText(/Brak spółek spełniających/)).not.toBeInTheDocument();
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => new Response(JSON.stringify(companies))));
    fireEvent.click(screen.getByRole('button', { name: 'Spróbuj ponownie' }));
    expect(await screen.findByText('AAA')).toBeInTheDocument();
  });

  it('distinguishes an empty source from an empty filter result', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => new Response('[]')));
    renderScreener();
    expect(await screen.findByText(/Brak danych fundamentalnych GPW/)).toBeInTheDocument();
    expect(screen.queryByText(/385 spółek/)).not.toBeInTheDocument();
    expect(screen.queryByText(/odświeżono 2026-09-26/)).not.toBeInTheDocument();
  });

  it.each(['FCF yield > 5 %', 'Dług netto/EBITDA > 3x', 'Forward C/Z niżej niż C/Z'])(
    'filters using the actual metric: %s', async (label) => {
      vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => new Response(JSON.stringify(companies))));
      renderScreener();
      await screen.findByText('AAA');
      fireEvent.click(screen.getByRole('button', { name: label }));
      expect(screen.queryByText('AAA')).toBeInTheDocument();
      expect(screen.queryByText('BBB')).not.toBeInTheDocument();
    },
  );

  it('resets filters after a search yields no companies', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => new Response(JSON.stringify(companies))));
    renderScreener();
    await screen.findByText('AAA');
    fireEvent.change(screen.getByPlaceholderText('Ticker albo nazwa spółki'), { target: { value: 'none' } });
    fireEvent.click(screen.getByRole('button', { name: 'Wyczyść filtry' }));
    expect(screen.queryByText('AAA')).toBeInTheDocument();
    expect(screen.queryByText('BBB')).toBeInTheDocument();
  });

  it('shows available forecast coverage and the inputs behind the calculated forward ratio', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => new Response(JSON.stringify(companies))));
    renderScreener();
    await screen.findByText('AAA');
    expect(screen.getByText(/Prognozy forward C\/Z: 2 spółek/)).toBeInTheDocument();
    expect(screen.getByTitle(/Kurs: 100,00 PLN\. Konsensus EPS: 10,00 PLN/)).toHaveTextContent('10,0');
    expect(screen.getByRole('button', { name: 'Forward C/Z niżej niż C/Z' })).toBeEnabled();
  });
});
