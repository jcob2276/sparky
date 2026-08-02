import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import HealthspanTrajectoryPanel from './HealthspanTrajectoryPanel';

describe('HealthspanTrajectoryPanel', () => {
  it('shows an honest empty state while history is being collected', () => {
    render(<HealthspanTrajectoryPanel points={[]} />);
    expect(screen.getByText(/zbieramy historię/i)).toBeInTheDocument();
  });

  it('shows trajectory and marks model changes', () => {
    render(<HealthspanTrajectoryPanel points={[
      { date: '2026-06-01', score: 68, estimatedAge: 35, coverage: 70, modelVersion: 'healthspan-v1' },
      { date: '2026-07-01', score: 73, estimatedAge: 34, coverage: 82, modelVersion: 'healthspan-v2' },
    ]} />);
    expect(screen.getByText('Trajektoria Healthspan')).toBeInTheDocument();
    expect(screen.getByText(/zmiana modelu/i)).toBeInTheDocument();
  });
});
