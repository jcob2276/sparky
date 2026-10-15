import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TargetStrainGaugeCard } from './TargetStrainGaugeCard';

vi.mock('../workout/CoachDecisionContainer', () => ({
  default: () => <div data-testid="coach-decision-container">Decyzja trenera</div>,
}));

describe('TargetStrainGaugeCard', () => {
  it('renders strain target and current strain values', () => {
    render(<TargetStrainGaugeCard recoveryScore={80} strainScore={12.5} />);

    expect(screen.getByText('Obciążenie i plan na dziś')).toBeInTheDocument();
    expect(screen.getByText(/12.5\/21/i)).toBeInTheDocument();
  });

  it('renders fallback when strain score is null', () => {
    render(<TargetStrainGaugeCard recoveryScore={null} strainScore={null} />);

    expect(screen.getByText(/brak danych/i)).toBeInTheDocument();
  });

  it('mounts CoachDecisionContainer when userId is provided', () => {
    render(<TargetStrainGaugeCard recoveryScore={70} strainScore={10} userId="test-user" />);

    expect(screen.getByTestId('coach-decision-container')).toBeInTheDocument();
  });
});
