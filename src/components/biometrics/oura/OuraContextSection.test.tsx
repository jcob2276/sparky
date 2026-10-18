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

    expect(screen.getByText('Szacunek z wpisów · czas wpisu 14:15')).toBeInTheDocument();
    expect(screen.getByText(/18 min w oknie nocnym/)).toBeInTheDocument();
    expect(screen.queryByText(/daily_food_entries|workout_sessions|phone_usage_daily/)).not.toBeInTheDocument();
  });

  it('formats mature screen duration and opens ScreenDetailModal on click', async () => {
    const { fireEvent } = await import('@testing-library/react');
    const context = buildOuraContextInsights({
      sleepDate: '2026-09-12',
      bedtimeStart: '2026-09-11T23:45:00+02:00',
      phoneUsage: {
        total_minutes: 205,
        late_night_minutes: 15,
        social_minutes: 65,
        ai_minutes: 50,
        browser_minutes: 40,
        messaging_minutes: 30,
        entertainment_minutes: 20,
        unlocks: 42,
        top_apps: [
          { app: 'ChatGPT', pkg: 'com.openai.chatgpt', min: 50 },
          { app: 'YouTube', pkg: 'com.google.android.youtube', min: 45 },
        ],
      },
      workouts: [],
      foodEntries: [],
    });

    render(<OuraContextSection context={context} />);

    expect(screen.getByText('3h 25m')).toBeInTheDocument();
    expect(screen.getByText(/15 min w oknie nocnym/)).toBeInTheDocument();

    const screenButton = screen.getByRole('button', { name: /Ekran/ });
    fireEvent.click(screenButton);

    expect(screen.getByText('Czas przed ekranem (telefon)')).toBeInTheDocument();
    expect(screen.getByText(/Co obejmuje licznik okna nocnego/)).toBeInTheDocument();
    expect(screen.getByText('ChatGPT')).toBeInTheDocument();
  });

  it('displays explicit 0 min in night window when late_night_minutes is 0', () => {
    const context = buildOuraContextInsights({
      sleepDate: '2026-09-12',
      bedtimeStart: null,
      phoneUsage: {
        total_minutes: 120,
        late_night_minutes: 0,
        unlocks: 15,
      },
      workouts: [],
      foodEntries: [],
    });

    render(<OuraContextSection context={context} />);

    expect(screen.getByText('0 min w oknie nocnym (23:00–04:00 · bez 20:00–22:59)')).toBeInTheDocument();
    expect(screen.getByText(/15 odblokowań/)).toBeInTheDocument();
  });

  it('displays clean missing-data state when late_night_minutes is null', () => {
    const context = buildOuraContextInsights({
      sleepDate: '2026-09-12',
      bedtimeStart: null,
      phoneUsage: {
        total_minutes: 60,
        late_night_minutes: null,
      },
      workouts: [],
      foodEntries: [],
    });

    render(<OuraContextSection context={context} />);

    expect(screen.getByText('Brak pomiaru okna nocnego (23:00–04:00)')).toBeInTheDocument();
  });
});
