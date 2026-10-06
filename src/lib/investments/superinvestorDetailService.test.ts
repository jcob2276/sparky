import { beforeEach, expect, it, vi } from 'vitest';
import { fetchSuperinvestorDetail, fetchSuperinvestorsOverview } from './superinvestorDetailService';
import { orcaSelect } from './superinvestorsApi';

vi.mock('./superinvestorsApi', () => ({ orcaSelect: vi.fn() }));
const investor = { id: 'fund', slug: 'fund', display_name: 'Real Fund', fund_name: 'Fund LLC', is_active: true };
const reports = [
  { investor_id: 'fund', period_of_report: '2026-06-30', filing_date: '2026-08-14',
    filing_url: 'https://www.sec.gov/current', verified_value_usd: 1000, verified_entry_count: 80 },
  { investor_id: 'fund', period_of_report: '2026-03-31', filing_date: '2026-05-14',
    filing_url: 'https://www.sec.gov/previous', verified_value_usd: 2000, verified_entry_count: 2 },
];
let historical = reports;
beforeEach(() => {
  historical = reports;
  vi.mocked(orcaSelect).mockImplementation(async path => {
    if (path.startsWith('investors?')) return [investor];
    if (path.startsWith('vw_sec13f_fund_reports?')) return historical;
    if (path.startsWith('companies?')) return [{ ticker: 'AAA', sector: 'Technology' }];
    if (path.includes('period_of_report=eq.2026-06-30')) return Array.from({ length: 80 }, (_, index) => ({
      cusip: String(index), ticker: index === 0 ? 'AAA' : null, company_name: 'Actual issuer',
      shares: index === 0 ? 20 : 1, value_usd: 10,
    }));
    if (path.includes('period_of_report=eq.2026-03-31')) return [
      { cusip: '0', ticker: 'AAA', company_name: 'Actual issuer', shares: 10, value_usd: 20 },
      { cusip: 'closed', ticker: null, company_name: 'Closed issuer', shares: 5, value_usd: 20 },
    ];
    return [];
  });
});

it('uses verified report values without fabricating a performance curve', async () => {
  const data = await fetchSuperinvestorsOverview();
  expect(data.investors[0]).toMatchObject({ name: 'Real Fund', aumRaw: 1000, sparkline: [2000, 1000], curveEnabled: false });
  historical = [];
  expect((await fetchSuperinvestorsOverview()).investors[0]).toMatchObject({ sparkline: [], positionsCount: null });
});
it('keeps all long positions including unmapped CUSIPs and both comparison sources', async () => {
  const data = await fetchSuperinvestorDetail('fund');
  expect(data).toMatchObject({ positionsCount: 80, basketValueRaw: 800, newCount: 79, soldCount: 1,
    previousFilingUrl: 'https://www.sec.gov/previous', quarterGrowthPct: '-50,00%' });
  expect(data?.holdings).toHaveLength(81);
  expect(data?.holdings.find(row => row.cusip === 'closed')).toMatchObject({ sharesNow: 0, sharesDelta: -5, changeType: 'sold' });
  expect(data?.holdings.find(row => row.cusip === '0')).toMatchObject({ sharesDelta: 10, weightPct: 1.25, changeType: 'increased' });
  expect(data?.holdings.find(row => row.cusip === '1')).toMatchObject({ tickerMapped: false, companyName: 'Actual issuer' });
});
it('does not call every current position new when the preceding quarter is unavailable', async () => {
  historical = [reports[0], { ...reports[1], period_of_report: '2025-12-31' }];
  const data = await fetchSuperinvestorDetail('fund');
  expect(data).toMatchObject({ newCount: null, soldCount: null, quarterGrowthPct: '—', previousFilingUrl: null });
  expect(data?.holdings.every(row => row.changeType === 'unknown' && row.sharesDelta === null)).toBe(true);
});
it('propagates source failure rather than displaying an empty successful catalogue', async () => {
  vi.mocked(orcaSelect).mockRejectedValue(new Error('Source unavailable'));
  await expect(fetchSuperinvestorsOverview()).rejects.toThrow('Source unavailable');
  await expect(fetchSuperinvestorDetail('fund')).rejects.toThrow('Source unavailable');
});
