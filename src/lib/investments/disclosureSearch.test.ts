import { beforeEach, expect, it, vi } from 'vitest';
import { searchDisclosures } from './disclosureSearch';
import { orcaSelect } from './superinvestorsApi';
vi.mock('./superinvestorsApi', () => ({ orcaSelect: vi.fn() }));
const read = vi.mocked(orcaSelect);
beforeEach(() => { read.mockReset().mockResolvedValue([]); });

it('uses verified paired quarters and does not turn missing comparisons into zero', async () => {
  read.mockImplementation(async path => path.startsWith('vw_sec13f_screener?') ? [
    { ticker: 'ABC', holders: 4, net_changes: 2, compared_funds: 3, previous_period: '2026-03-31', period_of_report: '2026-06-30', source_urls: ['https://www.sec.gov/report'] },
    { ticker: 'XYZ', holders: 2, net_changes: null, compared_funds: 0 },
  ] : []);
  const hits = await searchDisclosures('ABC');
  expect(hits[0]?.detail).toContain('bilans zmian +2');
  expect(hits[0]?.detail).toContain('2026-03-31 → 2026-06-30');
  expect(hits[0]?.url).toBe('https://www.sec.gov/report');
  expect(hits[1]?.detail).toContain('brak porównania');
  expect(read.mock.calls.some(([path]) => path.startsWith('vw_consensus?'))).toBe(false);
});

it('keeps distinct disclosed trades and links their documents', async () => {
  read.mockImplementation(async path => path.startsWith('stock_act_trades?') ? [
    { id: 'one', ticker: 'ABC', filer_name: 'Actual filer', disclosure_date: '2026-10-05', transaction_date: '2026-09-01', transaction_type: 'Purchase', source_url: 'https://disclosures-clerk.house.gov/one.pdf' },
    { id: 'two', ticker: 'ABC', filer_name: 'Actual filer', disclosure_date: '2026-10-05', transaction_date: '2026-09-01', transaction_type: 'Purchase', source_url: 'https://disclosures-clerk.house.gov/two.pdf' },
  ] : []);
  const hits = await searchDisclosures('ABC');
  expect(hits).toHaveLength(2);
  expect(hits[0]?.title).toContain('Actual filer');
  expect(hits[0]?.detail).toContain('Ujawniono: 2026-10-05');
  expect(hits[0]?.url).toContain('house.gov/one.pdf');
});

it('exposes a source failure rather than reporting an empty successful search', async () => {
  read.mockRejectedValue(new Error('HTTP 503'));
  await expect(searchDisclosures('ABC')).rejects.toThrow('HTTP 503');
});

it('preserves the linked politician when legacy records lack filer_name', async () => {
  read.mockImplementation(async path => path.startsWith('stock_act_trades?')
    ? [{ id: 'legacy', ticker: 'ABC', politicians: { display_name: 'Actual politician' }, transaction_date: '2026-09-01' }] : []);
  const [hit] = await searchDisclosures('ABC');
  expect(hit.title).toContain('Actual politician');
  expect(hit.detail).toContain('brak dokumentu źródłowego');
  expect(hit.url).toBeUndefined();
});
