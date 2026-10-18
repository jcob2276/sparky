import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { buildOuraContextInsights } from '../../../lib/biometrics/ouraContextInsights';
import { ScreenDetailModal } from './ScreenDetailModal';

function show(minutes: number | null) {
  const context = buildOuraContextInsights({
    sleepDate: '2026-10-16', bedtimeStart: null, workouts: [], foodEntries: [],
    phoneUsage: { total_minutes: 280, late_night_minutes: minutes },
  });
  render(<ScreenDetailModal isOpen onClose={vi.fn()} screen={context.screen} date={context.date} />);
}

describe('screen usage time window', () => {
  it('explains the two same-day night windows instead of claiming pre-sleep exposure', () => {
    show(5);
    expect(screen.getByRole('dialog')).toHaveClass('oura-theme', 'dark');
    expect(screen.getByText('Godziny nocne')).toBeInTheDocument();
    expect(screen.getByText(/00:00–04:00 oraz 23:00–24:00/)).toBeInTheDocument();
    expect(screen.getByText('Zapisy z dnia 2026-10-16 · czas Warszawy')).toBeInTheDocument();
    expect(screen.queryByText('Niski wpływ')).not.toBeInTheDocument();
    expect(screen.queryByText(/chroni fazę Deep Sleep/)).not.toBeInTheDocument();
    expect(screen.getByText(/Nie jest to pomiar użycia przed zaśnięciem/)).toBeInTheDocument();
  });

  it('does not turn missing night minutes into zero or optimal sleep conditions', () => {
    show(null);
    expect(screen.getByText('Brak pomiaru')).toBeInTheDocument();
    expect(screen.queryByText('Optymalnie')).not.toBeInTheDocument();
    expect(screen.queryByText('0 min')).not.toBeInTheDocument();
  });

  it('renders explicit 0 min and accurate window explanation when night minutes are zero', () => {
    show(0);
    expect(screen.getByText('Godziny nocne')).toBeInTheDocument();
    expect(screen.getByText('23:00–04:00 (bez 20:00–22:59)')).toBeInTheDocument();
    expect(screen.getByText(/0 min w przedziałach 00:00–04:00 oraz 23:00–24:00/)).toBeInTheDocument();
    expect(screen.getByText(/Dlaczego nie cały wieczór\?/)).toBeInTheDocument();
  });
});
