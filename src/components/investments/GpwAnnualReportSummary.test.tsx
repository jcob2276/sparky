import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { GpwAnnualReportSummary } from './GpwAnnualReportSummary';

describe('annual report scope label', () => {
  it('shows issuer-only results as standalone rather than a consolidated group', () => {
    render(<GpwAnnualReportSummary report={{ isin: 'PLXTRDM00011', reportingScope: 'standalone',
      periodStart: '2025-01-01', periodEnd: '2025-12-31', publicationDate: '2026-03-20', currency: 'PLN',
      sourceUrl: 'https://ir.xtb.com/report.zip', revenue: 100, netProfit: 10, assets: 50, equity: 20,
      operatingCashFlow: null, freeCashFlow: null }} />);
    expect(screen.getByText(/Jednostkowy/)).toBeTruthy();
    expect(screen.getByText('Wynik netto spółki')).toBeTruthy();
    expect(screen.queryByText('Wynik netto grupy')).toBeNull();
    expect(screen.queryByText(/Skonsolidowany/)).toBeNull();
  });
});
