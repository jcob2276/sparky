// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { invokeEdge } from '../../../lib/supabase';
import TelegramDaySummaryCard from './TelegramDaySummaryCard';

vi.mock('../../../lib/supabase', () => ({ invokeEdge: vi.fn() }));

const show = (onInsert = vi.fn()) => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <TelegramDaySummaryCard date="2026-11-23" onInsert={onInsert} />
  </QueryClientProvider>,
);

describe('TelegramDaySummaryCard', () => {
  beforeEach(() => vi.mocked(invokeEdge).mockReset());

  it('pokazuje punkty i liczbę wiadomości oraz wstawia je do opisu dnia', async () => {
    vi.mocked(invokeEdge).mockResolvedValue({ bullets: ['Rozmawiałeś o treningu.', 'Postanowiłeś iść spać wcześniej.'], messageCount: 3, voiceSeconds: 150 } as never);
    const onInsert = vi.fn();
    show(onInsert);
    expect(await screen.findByText('Rozmawiałeś o treningu.')).toBeVisible();
    expect(screen.getByText(/3 wiadomości · głosówki 3 min/)).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Wstaw do opisu dnia' }));
    expect(onInsert).toHaveBeenCalledWith('• Rozmawiałeś o treningu.\n• Postanowiłeś iść spać wcześniej.');
    expect(invokeEdge).toHaveBeenCalledWith('telegram-day-summary', expect.objectContaining({ body: { date: '2026-11-23' } }));
  });

  it('nic nie pokazuje, gdy nie było wiadomości albo wystąpił błąd', async () => {
    vi.mocked(invokeEdge).mockResolvedValue({ bullets: null, messageCount: 0, voiceSeconds: 0 } as never);
    const { container } = show();
    await vi.waitFor(() => expect(invokeEdge).toHaveBeenCalled());
    await vi.waitFor(() => expect(container.querySelector('section')).toBeNull());
  });
});
