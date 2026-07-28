import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { buildOuraContextInsights } from '../../../lib/biometrics/ouraContextInsights';
import { OuraContextSection } from './OuraContextSection';

describe('OuraContextSection', () => {
  it('uses human empty states without exposing storage identifiers', () => {
    const context = buildOuraContextInsights({
      sleepDate: '2026-07-28',
      bedtimeStart: '2026-07-27T23:31:00+02:00',
      phoneUsage: null,
      workouts: [],
      foodEntries: [],
    });

    render(<OuraContextSection context={context} />);

    expect(screen.getByText('Nie zapisano kofeiny')).toBeInTheDocument();
    expect(screen.getByText('Nie zapisano treningu')).toBeInTheDocument();
    expect(screen.getByText('Brak pomiaru czasu przed ekranem')).toBeInTheDocument();
    expect(screen.getByText('Nie zapisano posiłków')).toBeInTheDocument();
    expect(screen.queryByText(/daily_food_entries|workout_sessions|phone_usage_daily/)).not.toBeInTheDocument();
  });

  it('describes available context without table names', () => {
    const context = buildOuraContextInsights({
      sleepDate: '2026-07-28',
      bedtimeStart: '2026-07-27T23:31:00+02:00',
      phoneUsage: { total_minutes: 92, late_night_minutes: 18 },
      workouts: [{ duration_minutes: 50, hr_strain_score: 12, end_time: '2026-07-27T18:00:00+02:00' }],
      foodEntries: [{
        name: 'Espresso',
        calories: 2,
        food_quality_score: 8,
        logged_at: '2026-07-27T14:15:00+02:00',
      }],
    });

    render(<OuraContextSection context={context} />);

    expect(screen.getByText('Ostatnia o 14:15')).toBeInTheDocument();
    expect(screen.getByText('18 min późnym wieczorem')).toBeInTheDocument();
    expect(screen.queryByText(/daily_food_entries|workout_sessions|phone_usage_daily/)).not.toBeInTheDocument();
  });
});
