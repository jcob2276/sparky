import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { buildSleepRegularity, type SleepRegularityRow } from '../../../lib/biometrics/ouraSleepRegularity';
import { OuraSleepRegularity } from './OuraSleepRegularity';

function rows(n: number): SleepRegularityRow[] {
  return Array.from({ length: n }, (_, i) => {
    const day = 19 - i;
    const d = String(day).padStart(2, '0');
    const prev = String(day - 1).padStart(2, '0');
    return {
      date: `2026-10-${d}`,
      bedtime_start: `2026-10-${prev}T21:00:00Z`,
      bedtime_end: `2026-10-${d}T04:30:00Z`,
      total_sleep_hours: 7,
    };
  });
}

describe('OuraSleepRegularity', () => {
  it('shows headline numbers, accessible chart label and a table', () => {
    render(<OuraSleepRegularity data={buildSleepRegularity(rows(10), '2026-10-19')} loading={false} />);
    expect(screen.getByText('Mediana zaśnięcia')).toBeInTheDocument();
    expect(screen.getByText('±0 min')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Regularność snu z ostatnich 10 nocy.*23:00/ })).toBeInTheDocument();
    expect(screen.getByRole('table', { name: /Regularność snu w tabeli/ })).toBeInTheDocument();
  });

  it('shows progress when there are too few nights', () => {
    render(<OuraSleepRegularity data={buildSleepRegularity(rows(4), '2026-10-19')} loading={false} />);
    expect(screen.getByText('Za mało danych: 4 z 7 nocy z pomiarem.')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('announces the picked night from the keyboard', () => {
    render(<OuraSleepRegularity data={buildSleepRegularity(rows(10), '2026-10-19')} loading={false} />);
    fireEvent.keyDown(screen.getByRole('img'), { key: 'End' });
    expect(screen.getAllByText(/zaśnięcie 23:00, pobudka 06:30, sen 7 h/).length).toBeGreaterThan(0);
  });

  it('handles loading and error', () => {
    const { rerender } = render(<OuraSleepRegularity data={undefined} loading />);
    expect(screen.getByLabelText('Ładowanie regularności snu')).toHaveAttribute('aria-busy', 'true');
    rerender(<OuraSleepRegularity data={undefined} loading={false} error="boom" />);
    expect(screen.getByRole('alert')).toHaveTextContent('boom');
  });
});
