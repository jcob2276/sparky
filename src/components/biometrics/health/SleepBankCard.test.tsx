import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SleepBankCard } from './SleepBankCard';

describe('SleepBankCard', () => {
  it('renders sleep debt and payback plan', () => {
    render(
      <SleepBankCard
        data={{
          totalDebtMinutes: -180,
          totalDebtHours: -3.0,
          status: 'moderate_debt',
          statusLabel: 'Umiarkowany dług',
          rolling14DaysAverageSleepMinutes: 420,
          rolling14DaysAverageNeedMinutes: 480,
          recommendedNightlyExtensionMinutes: 35,
          estimatedDaysToFullPayback: 6,
          recentDaysBreakdown: [
            { date: '2026-10-12', actualMinutes: 400, needMinutes: 480, balanceMinutes: -80 },
            { date: '2026-10-13', actualMinutes: 420, needMinutes: 480, balanceMinutes: -60 },
            { date: '2026-10-14', actualMinutes: 440, needMinutes: 480, balanceMinutes: -40 },
          ],
          recommendation: 'Umiarkowany dług snu (-3.0h).',
        }}
      />
    );

    expect(screen.getByText('Bank Snu (Sleep Bank)')).toBeInTheDocument();
    expect(screen.getByText('-3')).toBeInTheDocument();
    expect(screen.getByText(/180 min deficytu/i)).toBeInTheDocument();
    expect(screen.getByText(/\+35m/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Umiarkowany dług/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Umiarkowany dług snu (-3.0h).')).toBeInTheDocument();
  });

  it('renders well-rested status when in surplus', () => {
    render(
      <SleepBankCard
        data={{
          totalDebtMinutes: 60,
          totalDebtHours: 1.0,
          status: 'well_rested',
          statusLabel: 'Nadwyżka snu',
          rolling14DaysAverageSleepMinutes: 490,
          rolling14DaysAverageNeedMinutes: 480,
          recommendedNightlyExtensionMinutes: 0,
          estimatedDaysToFullPayback: 0,
          recentDaysBreakdown: [],
          recommendation: 'Wysoka rezerwa regeneracyjna.',
        }}
      />
    );

    expect(screen.getByText('+1')).toBeInTheDocument();
    expect(screen.getByText('Nadwyżka snu')).toBeInTheDocument();
    expect(screen.getByText('Utrzymuj harmonogram')).toBeInTheDocument();
  });
});
