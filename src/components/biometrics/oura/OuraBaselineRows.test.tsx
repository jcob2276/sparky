import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { buildBaselineRows, type BaselineNight } from '../../../lib/biometrics/ouraBaselines';
import { shiftDateStr } from '../../../lib/date';
import { OuraBaselineRows } from './OuraBaselineRows';

const ASOF = '2026-10-18';
const hist: BaselineNight[] = Array.from({ length: 20 }, (_, i) => ({ date: shiftDateStr(ASOF, -(i + 1)), hrv_avg: 55 + (i % 7) }));

describe('OuraBaselineRows', () => {
  it('shows a word label for the deviation and a progress bar when data is insufficient', () => {
    const rows = buildBaselineRows([...hist, { date: ASOF, hrv_avg: 48, rhr_avg: 50 }], ASOF);
    render(<OuraBaselineRows rows={rows} />);
    expect(screen.getByLabelText(/^Nocne HRV: 48 ms\. Poniżej normy/)).toBeInTheDocument();
    const rhr = screen.getByLabelText(/^Tętno spoczynkowe: 50 bpm\. Za mało danych/);
    expect(rhr.querySelector('progress')).not.toBeNull();
    expect(rhr).toHaveTextContent('0/14 nocy z pomiarem');
  });
  it('deviations mode shows only out-of-range rows and folds the rest into one line', () => {
    const rows = buildBaselineRows([...hist, { date: ASOF, hrv_avg: 48, rhr_avg: 50 }], ASOF);
    render(<OuraBaselineRows rows={rows} mode="deviations" />);
    expect(screen.getAllByLabelText(/^Nocne HRV: 48 ms\. Poniżej normy/)).toHaveLength(1);
    expect(screen.queryByText('Wszystko mieści się w Twojej normie.')).not.toBeInTheDocument();
    expect(screen.getByText(/Za mało historii do oceny/)).toBeInTheDocument();
  });
  it('deviations mode with everything in range shows a calm line and a folded list', () => {
    const rows = buildBaselineRows([...hist, { date: ASOF, hrv_avg: 58 }], ASOF);
    render(<OuraBaselineRows rows={rows} mode="deviations" />);
    expect(screen.getByText('Wszystko mieści się w Twojej normie.')).toBeInTheDocument();
    expect(screen.getByText(/Zobacz 1 wskaźnik w normie/)).toBeInTheDocument();
  });
  it('renders loading and error states', () => {
    const { rerender } = render(<OuraBaselineRows rows={[]} loading />);
    expect(screen.getByRole('status')).toHaveTextContent('Ładowanie');
    rerender(<OuraBaselineRows rows={[]} errorMessage="Błąd" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Błąd');
  });
});
