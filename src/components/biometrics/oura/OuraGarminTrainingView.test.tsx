import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { OuraGarminTrainingView } from './OuraGarminTrainingView';

describe('OuraGarminTrainingView evidence', () => {
  it('does not create strength records when no strength history was supplied', () => {
    render(<OuraGarminTrainingView data={{ date: '2026-10-16', strainRow: null, oura: null }} />);
    fireEvent.click(screen.getByRole('button', { name: /^Siła/ }));
    expect(screen.getByText('Brak zarejestrowanych rekordów siłowych.')).toBeInTheDocument();
  });

  it('does not infer heart rate drift from a single average', () => {
    render(<OuraGarminTrainingView data={{
      date: '2026-10-16', strainRow: null, oura: null,
      stravaActivities: [{ sport_type: 'Run', name: 'Bieg', start_date: '2026-10-16T08:00:00Z', distance: 10000, moving_time: 3600, hr_avg: 140 }],
    }} />);
    expect(screen.getByText(/Brak pomiarów tempa i tętna dla obu połówek/)).toBeInTheDocument();
  });
});
