import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BedtimeTargetCard } from './BedtimeTargetCard';

describe('BedtimeTargetCard', () => {
  it('renders bedtime target schedule with 88% efficiency', () => {
    render(
      <BedtimeTargetCard
        targetWakeTime="07:00"
        targetSleepMinutes={480}
        sleepEfficiencyPercent={88}
        sleepLatencyMinutes={15}
      />
    );

    expect(screen.getByText(/Cel Pory Snu i Latencja/i)).toBeDefined();
    expect(screen.getByText('21:40')).toBeDefined();
    expect(screen.getByText('20:55')).toBeDefined();
    expect(screen.getByText(/Wydajność 88%/i)).toBeDefined();
    expect(screen.getByText(/07:00/i)).toBeDefined();
  });

  it('adjusts schedule when debt payback is supplied', () => {
    render(
      <BedtimeTargetCard
        targetWakeTime="06:30"
        targetSleepMinutes={450}
        paybackAdjustmentMinutes={30}
        sleepEfficiencyPercent={90}
        sleepLatencyMinutes={10}
      />
    );

    expect(screen.getByText('21:27')).toBeDefined();
    expect(screen.getByText(/Wydajność 90%/i)).toBeDefined();
  });
});
