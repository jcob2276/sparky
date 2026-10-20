import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { HealthChartsContainer } from './HealthChartsContainer';
import { fetchChartData } from '../../../lib/health/analyticsApi';

vi.mock('../../../lib/health/analyticsApi', () => ({ fetchChartData: vi.fn() }));
beforeEach(() => vi.clearAllMocks());

const visit = () => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <HealthChartsContainer userId="owner-one" />
  </QueryClientProvider>,
);

it('does not claim "0 measured days" while loading, then reports an honest empty state', async () => {
  vi.mocked(fetchChartData).mockResolvedValue({ points: [], truncated: false });
  visit();
  expect(screen.getByText('Wczytuję pomiary…')).toBeInTheDocument();
  expect(screen.queryByText(/dni z pomiarem/)).not.toBeInTheDocument();
  expect(await screen.findByText(/Brak pomiarów „HRV \(ms\)”/)).toBeInTheDocument();
});

it('loads an owner-scoped health source, offers no food sources and no manual entry', async () => {
  vi.mocked(fetchChartData).mockResolvedValue({ points: [], truncated: false });
  visit();
  await screen.findByText(/Brak pomiarów/);
  expect(screen.queryByRole('option', { name: 'Żywienie' })).not.toBeInTheDocument();
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Zapisz/ })).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Okres'), { target: { value: '90' } });
  fireEvent.change(screen.getByLabelText('Dane w obrębie dnia'), { target: { value: 'sum' } });
  await waitFor(() => expect(fetchChartData).toHaveBeenCalledWith(
    'owner-one',
    expect.objectContaining({ table: 'oura_daily_summary', columns: ['date', 'hrv_avg'] }),
    'hrv_avg',
    'sum',
  ));
});

it('keeps a failed data source visible as an error', async () => {
  vi.mocked(fetchChartData).mockRejectedValue(new Error('Źródło chwilowo niedostępne'));
  visit();
  expect(await screen.findByRole('alert')).toHaveTextContent('Źródło chwilowo niedostępne');
  expect(screen.queryByText(/Brak pomiarów/)).not.toBeInTheDocument();
});
