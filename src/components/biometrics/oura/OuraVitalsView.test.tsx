import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { OuraVitalsView } from './OuraVitalsView';
import type { OuraHealthHubData } from './types';

const measured: OuraHealthHubData = {
  date: '2026-07-28', strainRow: null, garminVo2Max: 52,
  oura: { date: '2026-07-28', readiness_score: 93, steps: 8901 } as OuraHealthHubData['oura'],
  enhanced: { date: '2026-07-28', vascular_age: 23, sleep_lowest_heart_rate: 49,
    sleep_average_breath: 13.625 } as OuraHealthHubData['enhanced'],
};

describe('OuraVitalsView', () => {
  it('keeps measured vascular age while explaining missing profile data for the estimate', () => {
    render(<OuraVitalsView data={measured} onOpenSleep={vi.fn()} />);
    expect(screen.getByText('23 lata')).toBeInTheDocument();
    expect(screen.getByText(/Brakuje: wiek metrykalny, płeć biologiczna/)).toBeInTheDocument();
    expect(screen.queryByText('Wiek biologiczny')).not.toBeInTheDocument();
  });

  it('does not infer sex from an available birth date', () => {
    render(<OuraVitalsView data={{ ...measured, birthDateStr: '1998-01-01' }} onOpenSleep={vi.fn()} />);
    expect(screen.getByText(/Brakuje: płeć biologiczna/)).toBeInTheDocument();
    expect(screen.getByText('−5 lat względem wieku')).toBeInTheDocument();
    expect(screen.queryByText('Wiek biologiczny')).not.toBeInTheDocument();
  });

  it('does not display measurements from another selected date, including the health monitor', () => {
    render(<OuraVitalsView data={{ ...measured, date: '2026-07-29' }} onOpenSleep={vi.fn()} />);
    for (const stale of ['23 lata', '93', '8901', '13,6/min', '49 bpm']) {
      expect(screen.queryByText(stale)).not.toBeInTheDocument();
    }
  });

  it('renders biological age when birth date, sex and measurements are provided', () => {
    render(<OuraVitalsView data={{ ...measured, birthDateStr: '1998-01-01', biologicalSex: 'male' }} onOpenSleep={vi.fn()} />);
    expect(screen.getByText('Wiek Biologiczny i Naczyniowy')).toBeInTheDocument();
    expect(screen.queryByText(/Oszacowanie niedostępne/)).not.toBeInTheDocument();
    expect(screen.getByText(/Wydolność tlenowa \(VO2 Max\)/)).toBeInTheDocument();
  });

  it('falls back to Oura vo2_max when Garmin vo2Max is not available', () => {
    const withoutGarmin: OuraHealthHubData = {
      ...measured,
      garminVo2Max: null,
      birthDateStr: '1998-01-01',
      biologicalSex: 'male',
      enhanced: {
        ...measured.enhanced!,
        vo2_max: 47,
      } as OuraHealthHubData['enhanced'],
    };
    render(<OuraVitalsView data={withoutGarmin} onOpenSleep={vi.fn()} />);
    expect(screen.getByText('Wiek Biologiczny i Naczyniowy')).toBeInTheDocument();
    expect(screen.getByText(/Wydolność tlenowa \(VO2 Max\)/)).toBeInTheDocument();
  });
});
