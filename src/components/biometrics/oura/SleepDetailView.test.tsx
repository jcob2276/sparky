import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SleepDetailView } from './SleepDetailView';
import type { OuraHealthHubData } from './types';

const referenceNight: OuraHealthHubData = {
  date: '2026-07-28',
  strainRow: null,
  oura: {
    date: '2026-07-28',
    total_sleep_hours: 7.7,
  } as OuraHealthHubData['oura'],
  enhanced: {
    date: '2026-07-28',
    total_sleep_hours: 7.7,
    time_in_bed_hours: 9 + (10 / 60),
    awake_time_minutes: 88,
    rem_sleep_hours: 41 / 60,
    light_sleep_hours: 5 + (19 / 60),
    deep_sleep_hours: 1 + (41 / 60),
    bedtime_start: '2026-07-27T23:31:00+02:00',
    bedtime_end: '2026-07-28T08:42:00+02:00',
    sleep_phase_5_min: '4'.repeat(18) + '2'.repeat(64) + '1'.repeat(20) + '3'.repeat(8),
    movement_items: '0010302',
  } as OuraHealthHubData['enhanced'],
};

describe('SleepDetailView - totals and stages', () => {
  it('keeps missing sleep totals and stages distinct from measured zero', () => {
    render(<SleepDetailView data={{ date: '2026-07-28', strainRow: null, oura: null, enhanced: null }} />);

    expect(screen.queryByText('0 h 0 min')).not.toBeInTheDocument();
    expect(screen.getByText('REM Brak danych')).toBeInTheDocument();
    expect(screen.getByText('Płytki Brak danych')).toBeInTheDocument();
    expect(screen.getByText('Głęboki Brak danych')).toBeInTheDocument();
    expect(screen.getByText('Stan czuwania Brak danych')).toBeInTheDocument();
  });

  it('does not infer unmeasured light sleep or awake time from other totals', () => {
    render(<SleepDetailView data={{
      ...referenceNight,
      enhanced: { ...referenceNight.enhanced, light_sleep_hours: null, awake_time_minutes: null,
        rem_sleep_hours: 0 } as OuraHealthHubData['enhanced'],
    }} />);

    expect(screen.getByText('7 h 42 min')).toBeInTheDocument();
    expect(screen.getByText('REM 0 min 0%')).toBeInTheDocument();
    expect(screen.getByText('Płytki Brak danych')).toBeInTheDocument();
    expect(screen.getByText('Stan czuwania Brak danych')).toBeInTheDocument();
  });

  it('discards measurements belonging to another night', () => {
    render(<SleepDetailView data={{
      ...referenceNight,
      date: '2026-07-29',
      nightDetails: {
        date: '2026-07-28', phases: [], hrv: [],
        heartRate: [{ ts: '2026-07-28T01:00:00+02:00', bpm: 51 },
          { ts: '2026-07-28T02:00:00+02:00', bpm: 49 }],
        phaseStatus: 'unavailable', heartRateStatus: 'available', hrvStatus: 'unavailable',
      },
    }} />);

    expect(screen.queryByText('7 h 42 min')).not.toBeInTheDocument();
    expect(screen.queryByText('23:31')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Zmierzony ruch: 3 zdarzenia')).not.toBeInTheDocument();
    expect(screen.queryByRole('img', { name: 'Przebieg tętna podczas snu' })).not.toBeInTheDocument();
    expect(screen.getByText('REM Brak danych')).toBeInTheDocument();
  });

  it('renders the source-faithful reference-night totals', () => {
    render(<SleepDetailView data={referenceNight} />);

    expect(screen.getByText('7 h 42 min')).toBeInTheDocument();
    expect(screen.getByText('Całkowity czas trwania 9 h 10 min')).toBeInTheDocument();
    expect(screen.getByText('23:31')).toBeInTheDocument();
    expect(screen.getByText('08:42')).toBeInTheDocument();
    expect(screen.getByText('Stan czuwania 1 h 28 min')).toBeInTheDocument();
    expect(screen.getByText('REM 41 min 9%')).toBeInTheDocument();
    expect(screen.getByText('Płytki 5 h 19 min 69%')).toBeInTheDocument();
    expect(screen.getByText('Głęboki 1 h 41 min 22%')).toBeInTheDocument();
    expect(screen.getByLabelText('Zmierzony ruch: 3 zdarzenia')).toBeInTheDocument();
    expect(screen.getByText('Kontekst przed snem')).toBeInTheDocument();
  });
});

describe('SleepDetailView - signals and fallbacks', () => {
  it('surfaces a material mismatch between the phase timeline and night interval', () => {
    render(
      <SleepDetailView
        data={{
          ...referenceNight,
          enhanced: {
            ...referenceNight.enhanced,
            sleep_phase_5_min: '2'.repeat(10),
          } as OuraHealthHubData['enhanced'],
        }}
      />,
    );

    expect(screen.getByText(/Niespójność danych dla 2026-07-28/)).toBeInTheDocument();
  });

  it('explains when Oura did not provide movement measurements', () => {
    render(
      <SleepDetailView
        data={{
          ...referenceNight,
          enhanced: {
            ...referenceNight.enhanced,
            movement_items: null,
          } as OuraHealthHubData['enhanced'],
        }}
      />,
    );

    expect(
      screen.getByText('Oura nie udostępniła pomiaru ruchu dla tej nocy'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Brak danych o ruchu dla tej nocy')).not.toBeInTheDocument();
  });

  it('shows measured heart-rate and HRV timelines with source summaries', () => {
    render(
      <SleepDetailView
        data={{
          ...referenceNight,
          enhanced: {
            ...referenceNight.enhanced,
            sleep_average_heart_rate: 52.5,
            sleep_lowest_heart_rate: 47,
            sleep_average_hrv: 60,
          } as OuraHealthHubData['enhanced'],
          nightDetails: {
            date: '2026-07-28',
            phases: [],
            heartRate: [
              { ts: '2026-07-28T00:00:00+02:00', bpm: 55 },
              { ts: '2026-07-28T04:00:00+02:00', bpm: 47 },
              { ts: '2026-07-28T08:00:00+02:00', bpm: 52 },
            ],
            hrv: [
              { ts: '2026-07-28T00:00:00+02:00', hrv: 58 },
              { ts: '2026-07-28T04:00:00+02:00', hrv: 83 },
              { ts: '2026-07-28T08:00:00+02:00', hrv: 60 },
            ],
            phaseStatus: 'unavailable',
            heartRateStatus: 'available',
            hrvStatus: 'available',
          },
        }}
      />,
    );

    expect(screen.getByRole('img', { name: 'Przebieg tętna podczas snu' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Przebieg HRV podczas snu' })).toBeInTheDocument();
    expect(screen.getByText('Najniższe 47 bpm')).toBeInTheDocument();
    expect(screen.getByText('Maks. 83 ms')).toBeInTheDocument();
  });

  it('filters out 0 bpm sensor dropouts when calculating lowest heart rate and average', () => {
    render(
      <SleepDetailView
        data={{
          date: '2026-07-28',
          strainRow: null,
          oura: null,
          enhanced: null,
          nightDetails: {
            date: '2026-07-28',
            phases: [],
            heartRate: [
              { ts: '2026-07-28T01:00:00+02:00', bpm: 0 }, // sensor dropout
              { ts: '2026-07-28T02:00:00+02:00', bpm: 52 },
              { ts: '2026-07-28T03:00:00+02:00', bpm: 48 },
            ],
            hrv: [{ ts: '2026-07-28T02:00:00+02:00', hrv: 45 }],
            phaseStatus: 'unavailable',
            heartRateStatus: 'available',
            hrvStatus: 'available',
          },
        }}
      />,
    );

    expect(screen.getByText('Najniższe 48 bpm')).toBeInTheDocument();
    expect(screen.queryByText('Najniższe 0 bpm')).not.toBeInTheDocument();
  });

  it('uses oura bedtime interval for duration when enhanced is unavailable', () => {
    render(
      <SleepDetailView
        data={{
          date: '2026-07-28',
          strainRow: null,
          oura: {
            date: '2026-07-28',
            total_sleep_hours: 7.5,
            bedtime_timestamp: '2026-07-27T23:00:00+02:00',
            bedtime_end_timestamp: '2026-07-28T07:30:00+02:00',
          } as OuraHealthHubData['oura'],
          enhanced: null,
        }}
      />,
    );

    expect(screen.getByText('7 h 30 min')).toBeInTheDocument();
    expect(screen.getByText('Całkowity czas trwania 8 h 30 min')).toBeInTheDocument();
  });
});
