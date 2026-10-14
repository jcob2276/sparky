import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SleepConsistencyCard } from './SleepConsistencyCard';

describe('SleepConsistencyCard', () => {
  it('renders sleep consistency score and metrics', () => {
    render(
      <SleepConsistencyCard
        data={{
          consistencyScore: 92,
          rating: 'optimal',
          averageBedtime: '23:05',
          averageWakeTime: '07:05',
          bedtimeStdDevMinutes: 12,
          wakeStdDevMinutes: 14,
          socialJetlagMinutes: 20,
          socialJetlagHours: 0.3,
          workdayMidSleep: '03:05',
          freeDayMidSleep: '03:25',
          hasMeaningfulSocialJetlag: false,
          recommendation: 'Wzorcowa synchronizacja okołodobowa.',
        }}
      />
    );

    expect(screen.getByText('Regularność Snu')).toBeInTheDocument();
    expect(screen.getByText('92%')).toBeInTheDocument();
    expect(screen.getByText('Optymalna')).toBeInTheDocument();
    expect(screen.getByText('23:05')).toBeInTheDocument();
    expect(screen.getByText('07:05')).toBeInTheDocument();
    expect(screen.getByText('0.3h')).toBeInTheDocument();
    expect(screen.getByText('Wzorcowa synchronizacja okołodobowa.')).toBeInTheDocument();
  });

  it('renders social jetlag warning when present', () => {
    render(
      <SleepConsistencyCard
        data={{
          consistencyScore: 68,
          rating: 'fair',
          averageBedtime: '23:30',
          averageWakeTime: '08:00',
          bedtimeStdDevMinutes: 45,
          wakeStdDevMinutes: 50,
          socialJetlagMinutes: 90,
          socialJetlagHours: 1.5,
          workdayMidSleep: '02:45',
          freeDayMidSleep: '04:15',
          hasMeaningfulSocialJetlag: true,
          recommendation: 'Zidentyfikowano Social Jetlag (1.5h).',
        }}
      />
    );

    expect(screen.getByText('68%')).toBeInTheDocument();
    expect(screen.getByText('Przeciętna')).toBeInTheDocument();
    expect(screen.getByText('1.5h')).toBeInTheDocument();
    expect(screen.getByText('Zidentyfikowano Social Jetlag (1.5h).')).toBeInTheDocument();
  });
});
