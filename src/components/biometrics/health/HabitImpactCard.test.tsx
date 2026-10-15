import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HabitImpactCard } from './HabitImpactCard';
import type { CorrelationsData } from '../../../lib/correlationsApi';

describe('HabitImpactCard', () => {
  it('renders collecting state when no correlations exist', () => {
    render(<HabitImpactCard correlations={null} />);

    expect(screen.getByText('Nawyki a regeneracja')).toBeInTheDocument();
    expect(screen.getByText(/Zbieranie korelacji nawyków/i)).toBeInTheDocument();
  });

  it('renders detected habit correlations with positive and negative percentages', () => {
    const mockCorrelations: CorrelationsData = {
      correlations: [],
      coverage: {},
      stats: null,
      behaviors: [
        {
          behavior_key: 'sauna',
          outcome_metric: 'hrv',
          pct_change: 8.5,
          delta: 5,
          cohens_d: 0.4,
          dose_response: null,
          lag_days: 0,
          confidence: 'solid',
          n_with: 12,
          n_without: 18,
          mean_with: 62,
          mean_without: 57,
          significant: true,
          p_value: 0.01,
        },
        {
          behavior_key: 'alcohol',
          outcome_metric: 'recovery_score',
          pct_change: -14.2,
          delta: -26,
          cohens_d: -0.8,
          dose_response: null,
          lag_days: 0,
          confidence: 'solid',
          n_with: 4,
          n_without: 26,
          mean_with: 52,
          mean_without: 78,
          significant: true,
          p_value: 0.005,
        },
      ],
    };

    render(<HabitImpactCard correlations={mockCorrelations} />);

    expect(screen.getByText('2 wykrytych nawyków')).toBeInTheDocument();
    expect(screen.getByText('Sauna')).toBeInTheDocument();
    expect(screen.getByText('+8.5%')).toBeInTheDocument();
    expect(screen.getByText('Alkohol')).toBeInTheDocument();
    expect(screen.getByText('-14.2%')).toBeInTheDocument();
  });
});
