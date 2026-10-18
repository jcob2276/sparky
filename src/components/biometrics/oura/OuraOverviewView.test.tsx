import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { OuraOverviewView } from './OuraOverviewView';
import { buildOuraContextInsights } from '../../../lib/biometrics/ouraContextInsights';
import type { OuraHealthHubData } from './types';

describe('health direction overview', () => {
  it('shows the actual week comparison and links measured signals to their details', () => {
    const onOpenVitals = vi.fn();
    const rows = Array.from({ length: 14 }, (_, index) => ({
      date: `2026-10-${String(index + 3).padStart(2, '0')}`,
      sleep_score: index < 7 ? 60 : 80,
      readiness_score: index < 7 ? 85 : 65,
      hrv_avg: index < 7 ? 40 : 45,
    })) as NonNullable<OuraHealthHubData['ouraHistory']>;
    render(<OuraOverviewView data={{ date: '2026-10-16', oura: rows[13], strainRow: null, ouraHistory: rows }}
      onOpenSleep={vi.fn()} onOpenVitals={onOpenVitals} />);
    expect(screen.getByText('Sen i regeneracja zmieniają się różnie')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Wynik snu/ })).toHaveTextContent('+20 pkt tydzień do tygodnia');
    expect(screen.getByRole('button', { name: /Regeneracja/ })).toHaveTextContent('-20 pkt tydzień do tygodnia');
    expect(screen.getByRole('button', { name: /Nocne HRV/ })).toHaveTextContent('7/7 → 7/7');
    fireEvent.click(screen.getByRole('button', { name: /Regeneracja/ }));
    expect(onOpenVitals).toHaveBeenCalledOnce();
  });

  it('keeps today separate when the previous-night context is missing', () => {
    const todayContext = buildOuraContextInsights({
      sleepDate: '2026-10-17', bedtimeStart: null, phoneUsage: null, workouts: [],
      foodEntries: [{ name: 'Espresso', calories: 2, food_quality_score: null, logged_at: '2026-10-17T12:00:00Z' }],
    });
    render(<OuraOverviewView data={{ date: '2026-10-16', oura: null, strainRow: null, todayContext }} onOpenSleep={vi.fn()} onOpenVitals={vi.fn()} />);
    expect(screen.getByText(/Brak kontekstu dnia poprzedzającego ostatnią noc/)).toBeInTheDocument();
    expect(screen.getByText(/Zapisy z 2026-10-17.*kontekst kolejnej nocy/)).toBeInTheDocument();
    expect(screen.queryByText('Przed ostatnią nocą')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Regeneracja/ })).toHaveTextContent('—');
  });
});
