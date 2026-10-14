import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HeartRateRecoveryCard } from './HeartRateRecoveryCard';

describe('HeartRateRecoveryCard', () => {
  it('renders recovery drop metrics and excellent badge', () => {
    render(
      <HeartRateRecoveryCard
        peakHeartRate={176}
        heartRateAt60s={142} // 34 bpm drop
        heartRateAt120s={122} // 54 bpm drop
        workoutName="Poranny bieg ciągły"
      />
    );

    expect(screen.getByText(/Odzyskiwanie tętna \(HRR\)/i)).toBeDefined();
    expect(screen.getAllByText(/Świetna regeneracja serca/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('176 bpm')).toBeDefined();
    expect(screen.getByText('-34 bpm')).toBeDefined();
    expect(screen.getByText('-54 bpm')).toBeDefined();
  });

  it('displays warning alert when autonomic fatigue is detected', () => {
    render(
      <HeartRateRecoveryCard
        peakHeartRate={180}
        heartRateAt60s={172} // 8 bpm drop
      />
    );

    expect(screen.getAllByText(/Opóźnione wyciszenie serca/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('-8 bpm')).toBeDefined();
    expect(screen.getByText(/Wykryto opóźnioną reaktywację przywspółczulną/i)).toBeDefined();
  });
});
