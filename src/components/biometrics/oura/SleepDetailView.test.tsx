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

describe('SleepDetailView', () => {
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
});
