import { afterEach, expect, it, vi } from 'vitest';
import { fetchSignalBoard, fetchSignalEvidence } from './signalsApi';
import { freshSignalAlerts, markSignalAlertsSeen } from './signalsAlerts';
import { orcaSelect } from './superinvestorsApi';
vi.mock('./superinvestorsApi', () => ({ orcaSelect: vi.fn() }));
afterEach(() => { vi.clearAllMocks(); localStorage.clear(); });

it('alerts on new disclosure identities rather than a changed ranking score', async () => {
  localStorage.clear();
  const row = { ticker: 'AMZN', companyName: 'Amazon', fundNetBuyers: 1, holders: 1,
    polBuys: 1, polSells: 0, politicianBuyers: 1, politicians: 1, insiderBuys: 0,
    buyVolumeMid: 15000, lastTradeDate: '2026-10-05', score: 70,
    convergent: true, summary: '', disclosureIds: ['house:one'] };
  expect(freshSignalAlerts('90d', [row])).toEqual([]);
  expect(freshSignalAlerts('90d', [{ ...row, score: 95 }])).toEqual([]);
  const updated = { ...row, score: 60, disclosureIds: ['house:one', 'house:two'] };
  expect(freshSignalAlerts('90d', [updated])).toEqual([updated]);
  markSignalAlertsSeen('90d', [updated]);
  expect(freshSignalAlerts('90d', [updated])).toEqual([]);
});

it('does not infer a politician identity from an anonymous transaction', async () => {
  vi.mocked(orcaSelect).mockImplementation(async path => path.startsWith('vw_sec13f_screener')
    ? [{ ticker: 'AMZN', net_changes: 1, holders: 2 }] : path.startsWith('stock_act_trades')
    ? [{ ticker: 'AMZN', transaction_type: 'purchase', transaction_date: '2026-10-05' }] : []);
  const rows = await fetchSignalBoard('90d');
  expect(rows[0]).toMatchObject({ polBuys: 1, politicianBuyers: 0, politicians: 0 });
});

it('keeps a missing 13F comparison unknown and never marks it as convergent', async () => {
  vi.mocked(orcaSelect).mockImplementation(async path => path.startsWith('vw_sec13f_screener')
    ? [{ ticker: 'AMZN', net_changes: null, holders: 2 }] : path.startsWith('stock_act_trades')
    ? [{ ticker: 'AMZN', transaction_type: 'purchase', transaction_date: '2026-10-05' }] : []);
  expect((await fetchSignalBoard('90d'))[0]).toMatchObject({ fundNetBuyers: null, convergent: false });
});
it('keeps sourced insider events for companies not covered by the 13F screen', async () => {
  vi.mocked(orcaSelect).mockImplementation(async path => path.startsWith('vw_sec_form4_public')
    ? [{ id: 'new-insider', ticker: 'NEW', transaction_date: '2026-10-05' }] : []);
  expect((await fetchSignalBoard('90d'))[0]).toMatchObject({ ticker: 'NEW', fundNetBuyers: null,
    insiderBuys: 1, convergent: false, disclosureIds: ['sec:new-insider'] });
});

it('provides both complete quarter documents and dates congressional evidence by publication', async () => {
  vi.mocked(orcaSelect).mockImplementation(async path => {
    if (path.startsWith('vw_sec13f_verified_changes')) return [{ investor_id: 'fund', shares_delta: 5,
      value_now: 100, change_type: 'reported_increase', period_of_report: '2026-06-30', previous_period: '2026-03-31',
      filing_url: 'https://www.sec.gov/current', previous_filing_url: 'https://www.sec.gov/previous' }];
    if (path.startsWith('stock_act_trades')) return [{ ticker: 'AMZN', filer_name: 'Public filer',
      transaction_type: 'purchase', transaction_date: '2026-09-01', disclosure_date: '2026-10-01',
      source_url: 'https://disclosures-clerk.house.gov/document', amount_low: 1000, amount_high: 15000 }];
    if (path.startsWith('vw_sec_form4_public')) return [{ id: 'insider', filer_name: 'Executive',
      transaction_code: 'P', transaction_date: '2026-09-29', filing_date: '2026-10-01',
      shares: 5, price_usd: 100, doc_url: 'https://www.sec.gov/form4' }];
    return [];
  });
  const events = await fetchSignalEvidence('AMZN');
  expect(events.find(e => e.actor === 'fund')).toMatchObject({ badge: 'wzrost raportowanej pozycji',
    date: '2026-06-30', sourceUrls: ['https://www.sec.gov/previous', 'https://www.sec.gov/current'] });
  expect(events.find(e => e.actor === 'politician')).toMatchObject({ who: 'Public filer', date: '2026-10-01' });
  expect(events.find(e => e.actor === 'politician')?.detail).toContain('2026-09-01');
  expect(events.find(e => e.actor === 'insider')).toMatchObject({ who: 'Executive', badge: 'Kupno (P)',
    date: '2026-10-01', sourceUrls: ['https://www.sec.gov/form4'] });
  expect(vi.mocked(orcaSelect).mock.calls.some(([path]) => path.startsWith('vw_holdings_changes'))).toBe(false);
});

it('requires sourced SEC Form 4 and propagates database failures', async () => {
  vi.mocked(orcaSelect).mockImplementation(async (path, options) => {
    expect(options?.strict).toBe(true);
    if (path.startsWith('vw_sec_form4_public')) throw new Error('SEC unavailable');
    if (path.startsWith('vw_insider_public')) throw new Error('Legacy Form 4 source used');
    return [];
  });
  await expect(fetchSignalBoard('90d')).rejects.toThrow('SEC unavailable');
});
