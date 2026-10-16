import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import DailyStrainMetricsRow from './DailyStrainMetricsRow';

afterEach(cleanup);
describe('sleep balance formatting', () => {
  const props = { strainScore: null, recoveryScore: null, strainTone: '', recovTone: '' };
  it('carries rounded minutes into the next hour', () => {
    render(<DailyStrainMetricsRow {...props} sleepDebtH={-(1 + 59.8 / 60)} />);
    expect(screen.getByText('2h 0m')).toBeInTheDocument();
  });
  it('keeps a measured zero balance distinct from missing data and surplus', () => {
    render(<DailyStrainMetricsRow {...props} sleepDebtH={0} />);
    expect(screen.getByText('0h 0m')).toBeInTheDocument();
    expect(screen.getByText('Bilans snu')).toBeInTheDocument();
    expect(screen.queryByText('Nadwyżka snu')).not.toBeInTheDocument();
  });
});
