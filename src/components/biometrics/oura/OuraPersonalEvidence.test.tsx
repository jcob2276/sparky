import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { OuraPersonalEvidence } from './OuraPersonalEvidence';

const empty = { correlations: [], behaviors: [], coverage: {}, stats: null };
const base = { date: '2026-10-16', oura: null, strainRow: null };

describe('personal evidence read states', () => {
  it('does not describe a failed request as calibration', () => {
    const data = { ...base, correlations: empty, correlationsError: 'offline' };
    render(<OuraPersonalEvidence data={data} />);
    expect(screen.getByText('Zależności są chwilowo niedostępne')).toBeInTheDocument();
    expect(screen.queryByText(/Trwa kalibracja|Kalibracja:/)).not.toBeInTheDocument();
  });

  it('preserves measured behavior effects while disclosing a failed correlation source', () => {
    const data = { ...base, correlations: {
      ...empty,
      sourceErrors: [{ source: 'Korelacje', message: 'offline' }],
      behaviors: [{ behavior_key: 'late_meal', outcome_metric: 'recovery_score', lag_days: 1,
        n_with: 12, n_without: 15, mean_with: 70, mean_without: 75, delta: -5, pct_change: -6.7,
        cohens_d: -0.6, p_value: 0.01, significant: true, confidence: 'solid' as const, dose_response: null }],
    } };
    render(<OuraPersonalEvidence data={data} />);
    expect(screen.getByText('Część zależności jest niedostępna')).toBeInTheDocument();
    expect(screen.getByText('-5.0 pkt następnego dnia')).toBeInTheDocument();
  });

  it('distinguishes pending reads from successful reads with insufficient evidence', () => {
    const data = { ...base, correlationsLoading: true };
    const { rerender } = render(<OuraPersonalEvidence data={data} />);
    expect(screen.getByText('Wczytuję osobiste zależności…')).toBeInTheDocument();
    expect(screen.queryByText('Trwa kalibracja zależności')).not.toBeInTheDocument();
    rerender(<OuraPersonalEvidence data={{ ...base, correlations: empty }} />);
    expect(screen.getByText('Trwa kalibracja zależności')).toBeInTheDocument();
  });
});
