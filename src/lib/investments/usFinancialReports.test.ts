import { describe, expect, it } from 'vitest';
import { parseUsFinancialReport } from './usFinancialReports';

const report = { cik: 2488, accession: '0000002488-26-000123', form_type: '10-Q',
  period_start: '2025-12-28', period_end: '2026-06-27', publication_date: '2026-08-05', currency: 'USD',
  source_url: 'https://www.sec.gov/Archives/edgar/data/2488/000000248826000123/amd-20260627.htm',
  metrics: { net_profit: { value: '3680000000', concept: 'us-gaap:NetIncomeLoss' } } };
describe('SEC financial report presentation', () => {
  it('keeps exact YTD dates, missing metrics and primary source', () => {
    expect(parseUsFinancialReport(report)).toMatchObject({ periodStart: '2025-12-28', periodEnd: '2026-06-27',
      metrics: { net_profit: 3680000000 } });
  });
  it('rejects wrong issuer accession URLs and invalid dates', () => {
    expect(parseUsFinancialReport({ ...report, source_url: report.source_url.replace('/2488/', '/999/') })).toBeNull();
    expect(parseUsFinancialReport({ ...report, publication_date: '2026-02-30' })).toBeNull();
    expect(parseUsFinancialReport({ ...report, publication_date: '2026-06-01' })).toBeNull();
  });
  it('does not turn malformed amounts into zeros', () => {
    const parsed = parseUsFinancialReport({ ...report, metrics: { revenue: { value: 'NaN' }, assets: { value: null } } });
    expect(parsed?.metrics).toEqual({});
  });
});
