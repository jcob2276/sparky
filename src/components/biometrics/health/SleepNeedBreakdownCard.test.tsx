import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SleepNeedBreakdownCard } from './SleepNeedBreakdownCard';

describe('SleepNeedBreakdownCard', () => {
  it('renders base sleep, strain adjustment, sleep debt, and target sleep formatted', () => {
    render(
      <SleepNeedBreakdownCard
        input={{
          baselineMinutes: 465, // 7h 45m
          strainScore: 15.0,
          sleepDebtHours: 1.0,
          napMinutes: 20,
        }}
      />
    );

    expect(screen.getByText('Docelowy Czas Snu (Sleep Need)')).toBeInTheDocument();
    expect(screen.getByText(/Cel:/i)).toBeInTheDocument();
    expect(screen.getByText('7h 45m')).toBeInTheDocument();
    expect(screen.getAllByText(/Obciążenie/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Dług senny/i).length).toBeGreaterThanOrEqual(1);
  });
});
