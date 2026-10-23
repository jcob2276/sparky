import { beforeEach, expect, it, vi } from 'vitest';
import { fetchDisclosureBasket } from './basketSimulationService';
import { orcaSelect } from './superinvestorsApi';
vi.mock('./superinvestorsApi', () => ({ orcaSelect: vi.fn() }));
vi.mock('../date', async original => ({ ...await original<object>(), getTodayWarsaw: () => '2026-10-07' }));
const candidate = { ticker: 'BRK/B', company_name: 'Berkshire', net_changes: 1,
  period_of_report: '2026-06-30', previous_period: '2026-03-31' };
let reportDate = '2026-10-02';
beforeEach(() => {
  reportDate = '2026-10-02';
  vi.mocked(orcaSelect).mockImplementation(async path => {
    if (path.startsWith('vw_sec13f_screener?')) return [candidate];
    if (path.startsWith('vw_sec13f_verified_changes?')) return [{ ...candidate, investor_id: 'fund', shares_delta: 10,
      filing_url: 'https://www.sec.gov/current', previous_filing_url: 'https://www.sec.gov/previous' }];
    if (path.startsWith('vw_sec13f_verified_reports?')) return [
      { investor_id: 'fund', period_of_report: '2026-06-30', filing_date: '2026-08-14', filing_url: 'https://www.sec.gov/current' },
      { investor_id: 'fund', period_of_report: '2026-03-31', filing_date: reportDate, filing_url: 'https://www.sec.gov/previous' },
    ];
    if (path.startsWith('prices_daily?')) return ['BRK-B', 'SPY'].flatMap(ticker => ['2026-10-05','2026-10-06'].map((date, index) => ({
      ticker, date, close_adj: (ticker === 'SPY' ? 200 : 100) + index * (ticker === 'SPY' ? 4 : 10), currency: 'USD', source_url: 'https://query1.finance.yahoo.com/chart',
    })));
    return [];
  });
});
it('uses publication dates of both reports, normalizes quote symbols and keeps source links', async () => {
  const data = await fetchDisclosureBasket(5);
  expect(data.knownOn).toBe('2026-10-02');
  expect(data.reportSources).toHaveLength(2);
  expect(data.positions[0]).toMatchObject({ ticker: 'BRK/B', initialWeightPct: 100 });
  expect(data.points.at(-1)?.returnPct).toBeCloseTo(10);
  const priceQuery = decodeURIComponent(vi.mocked(orcaSelect).mock.calls.find(([path]) => path.startsWith('prices_daily?'))![0]);
  expect(priceQuery).toContain('ticker=in.(BRK-B,SPY)');
  expect(priceQuery).toContain('date=gt.2026-10-02');
  expect(priceQuery).toContain('date=lt.2026-10-07');
  expect(data.benchmarkReturnPct).toBeCloseTo(2);
  expect(data.fromYearStart).toBe(false);
});
it('anchors pricing at 1 January when every disclosure predates the year', async () => {
  reportDate = '2025-11-02';
  const original = vi.mocked(orcaSelect).getMockImplementation()!;
  vi.mocked(orcaSelect).mockImplementation(async path => {
    const rows = await original(path);
    return path.startsWith('vw_sec13f_verified_reports?')
      ? rows.map(row => ({ ...(row as object), filing_date: '2025-11-02' })) : rows;
  });
  const data = await fetchDisclosureBasket(5);
  expect(data.fromYearStart).toBe(true);
  const priceQuery = decodeURIComponent(vi.mocked(orcaSelect).mock.calls.filter(([path]) => path.startsWith('prices_daily?')).at(-1)![0]);
  expect(priceQuery).toContain('date=gt.2025-12-31');
  expect(priceQuery).not.toContain('date=gt.2025-11');
});
it('does not use reports with a future publication date', async () => {
  reportDate = '2026-10-08';
  await expect(fetchDisclosureBasket()).rejects.toThrow('daty ujawnienia');
});
it('keeps every amendment document used in a reconstructed basket', async () => {
  const original = vi.mocked(orcaSelect).getMockImplementation()!;
  vi.mocked(orcaSelect).mockImplementation(async path => {
    const rows = await original(path);
    if (!path.startsWith('vw_sec13f_verified_reports?')) return rows;
    return rows.map(row => {
      if (!row || typeof row !== 'object' || !('filing_url' in row)) throw new Error('Invalid report fixture');
      return { ...row, source_urls: [row.filing_url, `${row.filing_url}/addition`] };
    });
  });
  const data = await fetchDisclosureBasket(5);
  expect(data.reportSources.map(r => r.filing_url).sort()).toEqual([
    'https://www.sec.gov/current', 'https://www.sec.gov/current/addition',
    'https://www.sec.gov/previous', 'https://www.sec.gov/previous/addition',
  ]);
});
it('does not suppress an API failure as zero return', async () => {
  vi.mocked(orcaSelect).mockRejectedValue(new Error('API unavailable'));
  await expect(fetchDisclosureBasket()).rejects.toThrow('API unavailable');
});
