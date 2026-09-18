import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { OuraHealthView } from './OuraHealthView';
import type { OuraHealthHubData } from './types';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

function renderWithClient(ui: React.ReactElement) {
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>,
  );
}

const data: OuraHealthHubData = {
  date: '2026-07-28',
  strainRow: null,
  oura: {
    date: '2026-07-28',
    readiness_score: 88,
    sleep_score: 84,
  } as OuraHealthHubData['oura'],
  enhanced: {
    date: '2026-07-28',
    activity_score: 91,
  } as OuraHealthHubData['enhanced'],
};

describe('OuraHealthView', () => {
  it('isolates the Oura-first dark theme and app-width content', () => {
    const { container } = renderWithClient(
      <OuraHealthView
        activeSection="sleep"
        data={data}
        onOpenSleep={vi.fn()}
        onSectionChange={vi.fn()}
      />,
    );

    expect(container.firstElementChild).toHaveClass('dark');
    expect(screen.getByTestId('oura-content')).toHaveClass('max-w-3xl');
  });

  it('shows the four primary health sections', () => {
    renderWithClient(
      <OuraHealthView
        activeSection="sleep"
        data={data}
        onOpenSleep={vi.fn()}
        onSectionChange={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Sen' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Garmin' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Paliwo' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Witalność' })).toBeInTheDocument();
    expect(screen.getByText('Gotowość')).toBeInTheDocument();
  });

  it('requests the selected section', () => {
    const onSectionChange = vi.fn();
    renderWithClient(
      <OuraHealthView
        activeSection="sleep"
        data={data}
        onOpenSleep={vi.fn()}
        onSectionChange={onSectionChange}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Witalność' }));
    expect(onSectionChange).toHaveBeenCalledWith('vitals');
  });

  it('shows practical sleep and heart metrics in Parametry', () => {
    renderWithClient(
      <OuraHealthView
        activeSection="vitals"
        data={{
          ...data,
          birthDateStr: '1998-01-01',
          enhanced: {
            date: '2026-07-28',
            vascular_age: 23,
            sleep_average_breath: 13.625,
            total_sleep_hours: 7.5,
            bedtime_start: '2026-07-27T23:10:00+02:00',
            bedtime_end: '2026-07-28T07:10:00+02:00',
            readiness_contributors: { sleep_regularity: 88 },
          } as unknown as NonNullable<OuraHealthHubData['enhanced']>,
          enhancedHistory: [{
            date: '2026-07-27',
            total_sleep_hours: 7.5,
            bedtime_start: '2026-07-26T23:00:00+02:00',
            bedtime_end: '2026-07-27T07:00:00+02:00',
          } as unknown as NonNullable<OuraHealthHubData['enhanced']>],
          ouraHistory: [
            { date: '2026-07-27', total_sleep_hours: 7.5 },
            { date: '2026-07-28', total_sleep_hours: 7.5 },
          ] as OuraHealthHubData['ouraHistory'],
        }}
        onOpenSleep={vi.fn()}
        onSectionChange={vi.fn()}
      />,
    );

    expect(screen.getByText('Zegar biologiczny')).toBeInTheDocument();
    expect(screen.getByText('Regularność snu')).toBeInTheDocument();
    expect(screen.getByText('Bilans snu')).toBeInTheDocument();
    expect(screen.getByText(/Potrzeba 16 h 0 min − sen 15 h 0 min/)).toBeInTheDocument();
    expect(screen.getByText('Wiek sercowo-naczyniowy')).toBeInTheDocument();
    expect(screen.getByText('Częstotliwość oddechu')).toBeInTheDocument();
    expect(screen.getByText('13,6/min')).toBeInTheDocument();
  });
});
