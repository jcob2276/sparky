import { afterEach, expect, it, vi } from 'vitest';
import { fetchSignalBoard } from './signalsApi';
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
  vi.mocked(orcaSelect).mockImplementation(async path => path.startsWith('vw_consensus')
    ? [{ ticker: 'AMZN', net_buyers: 1, holders: 2 }] : path.startsWith('stock_act_trades')
    ? [{ ticker: 'AMZN', transaction_type: 'purchase', transaction_date: '2026-10-05' }] : []);
  const rows = await fetchSignalBoard('90d');
  expect(rows[0]).toMatchObject({ polBuys: 1, politicianBuyers: 0, politicians: 0 });
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
