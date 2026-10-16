import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Tables } from '../../../lib/database.types';
import type { OuraHealthHubData } from './types';
import { SleepIntelligenceView } from './SleepIntelligenceView';

vi.mock('./SleepFactorsSection', () => ({ SleepFactorsSection: () => null }));
vi.mock('./SleepRecoveryArchitecture', () => ({ SleepRecoveryArchitecture: () => null }));
vi.mock('../health/HabitImpactCard', () => ({ HabitImpactCard: () => null }));
vi.mock('../health/DayTimelineCard', () => ({ DayTimelineCard: () => null }));

afterEach(cleanup);
const base: OuraHealthHubData = { date: '2026-10-16', strainRow: null, oura: null, enhanced: null };
const night = (date: string, bedtime: string | null, wake: string | null) => ({
  date, bedtime_start: bedtime, bedtime_end: wake, total_sleep_hours: 7,
}) as Tables<'oura_enhanced'>;

describe('sleep overview uses recorded evidence', () => {
  it('does not fabricate a week of sleep when history is missing', () => {
    render(<SleepIntelligenceView data={base} />);
    expect(screen.getByText('Za mało nocy do analizy regularności')).toBeInTheDocument();
    expect(screen.queryByText('Regularność Snu')).not.toBeInTheDocument();
    expect(screen.queryByText('Bank Snu (Sleep Bank)')).not.toBeInTheDocument();
    expect(screen.getByText('Brak danych do wyznaczenia celów snu')).toBeInTheDocument();
  });

  it('does not turn one measured night into a perfect weekly consistency score', () => {
    render(<SleepIntelligenceView data={{ ...base, enhanced: night('2026-10-16', '23:00', '07:00') }} />);
    expect(screen.getByText('Za mało nocy do analizy regularności')).toBeInTheDocument();
    expect(screen.queryByText('Regularność Snu')).not.toBeInTheDocument();
  });

  it('uses only complete nights in the selected week, including the current night once', () => {
    render(<SleepIntelligenceView data={{ ...base,
      enhanced: night('2026-10-16', '23:00', '07:00'),
      enhancedHistory: [
        night('2026-10-16', '23:00', '07:00'),
        night('2026-10-15', '00:00', '06:00'),
        night('2026-10-14', null, '09:00'),
        night('2026-10-13', 'not-a-time', '07:00'),
        night('2026-10-01', '19:00', '03:00'),
        night('2026-10-17', '19:00', '03:00'),
      ],
    }} />);
    expect(screen.getByText('23:30')).toBeInTheDocument();
    expect(screen.getByText('06:30')).toBeInTheDocument();
    expect(screen.getByText(/N=2/)).toBeInTheDocument();
  });

  it('does not assign caffeine timestamps, calorie targets, or sleep debt without a source', () => {
    render(<SleepIntelligenceView data={base} />);
    expect(screen.queryByText('Dynamiczne Paliwo (Fueling Target)')).not.toBeInTheDocument();
    expect(screen.queryByText('Kofeina & Bilans Paliwa')).not.toBeInTheDocument();
    expect(screen.queryByText('Docelowy Czas Snu (Sleep Need)')).not.toBeInTheDocument();
    expect(screen.queryByText('Cel Pory Snu i Latencja')).not.toBeInTheDocument();
    expect(screen.queryByText('Odcięcie kofeiny najpóźniej do 14:00.')).not.toBeInTheDocument();
  });

  it('keeps missing readiness neutral instead of labelling it low', () => {
    render(<SleepIntelligenceView data={base} />);
    expect(screen.getByText('Brak pomiaru gotowości')).toBeInTheDocument();
    expect(screen.queryByText('Niska')).not.toBeInTheDocument();
  });

  it('does not present generated energy reserves or stress extremes as measurements', () => {
    render(<SleepIntelligenceView data={base} />);
    expect(screen.queryByText('Rezerwa energii (Body Battery)')).not.toBeInTheDocument();
    expect(screen.queryByText('Max')).not.toBeInTheDocument();
    expect(screen.getByText('Brak pomiarów stresu i regeneracji')).toBeInTheDocument();
  });

  it('keeps a measured readiness zero instead of describing it as missing', () => {
    render(<SleepIntelligenceView data={{ ...base, oura: { date: base.date, readiness_score: 0 } as Tables<'oura_daily_summary'> }} />);
    expect(screen.getByText('Niższy wynik gotowości')).toBeInTheDocument();
    expect(screen.queryByText('Brak aktualnego wyniku gotowości')).not.toBeInTheDocument();
  });

  it('does not merge a strain score from a different day into the selected night', () => {
    render(<SleepIntelligenceView data={{ ...base, strainRow: { date: '2026-10-15', strain_score: 19 } as Tables<'daily_strain'> }} />);
    expect(screen.getByText('Obciążenie pochodzi z innego dnia')).toBeInTheDocument();
    expect(screen.queryByText('19.0')).not.toBeInTheDocument();
    expect(screen.queryByText('19')).not.toBeInTheDocument();
  });

  it('uses Warsaw clock times for timestamped nights', () => {
    render(<SleepIntelligenceView data={{ ...base, enhancedHistory: [
      night('2026-10-16', '2026-10-15T21:00:00Z', '2026-10-16T05:00:00Z'),
      night('2026-10-15', '2026-10-14T22:00:00Z', '2026-10-15T04:00:00Z'),
    ] }} />);
    expect(screen.getByText('23:30')).toBeInTheDocument();
    expect(screen.getByText('06:30')).toBeInTheDocument();
  });
});
