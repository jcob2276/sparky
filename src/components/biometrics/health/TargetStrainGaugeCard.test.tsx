import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TargetStrainGaugeCard } from './TargetStrainGaugeCard';

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

});
