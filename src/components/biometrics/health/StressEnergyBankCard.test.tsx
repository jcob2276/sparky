import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { StressEnergyBankCard } from './StressEnergyBankCard';

afterEach(cleanup);
describe('recorded Oura stress and recovery', () => {
  it('shows the source metrics and day without creating stress extremes or an energy battery', () => {
    render(<StressEnergyBankCard input={{ recoveryScore: 80, stressScore: 34, stressHighMinutes: 45, recoveryHighMinutes: 20 }} lastUpdatedFormatted="2026-10-16" />);
    expect(screen.getByText('Oura · 2026-10-16')).toBeInTheDocument();
    expect(screen.getByText('34/100')).toBeInTheDocument();
    expect(screen.getByText('45 min')).toBeInTheDocument();
    expect(screen.getByText('20 min')).toBeInTheDocument();
    expect(screen.getByText('80/100')).toBeInTheDocument();
    expect(screen.queryByText('Max')).not.toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });
  it('preserves measured zero and labels missing signals', () => {
    render(<StressEnergyBankCard input={{ stressHighMinutes: 0 }} />);
    expect(screen.getByText('0 min')).toBeInTheDocument();
    expect(screen.getAllByText('—')).toHaveLength(3);
  });
  it('does not infer normal energy when all measurements are missing', () => {
    render(<StressEnergyBankCard input={{}} />);
    expect(screen.getByText('Brak pomiarów stresu i regeneracji')).toBeInTheDocument();
    expect(screen.queryByText(/Poziom energii w normie/)).not.toBeInTheDocument();
  });
});
