import { beforeEach, expect, it, vi } from 'vitest';
import { fetchPoliticianDetail } from './politicianDetailService';
import { orcaSelect } from './superinvestorsApi';
import { yearFloor } from './yearFloor';

vi.mock('./superinvestorsApi', () => ({ orcaSelect: vi.fn() }));

beforeEach(() => { vi.mocked(orcaSelect).mockReset(); });

it('reads only current-year disclosures with a narrow select and invents nothing for an empty profile', async () => {
  vi.mocked(orcaSelect).mockResolvedValue([]);
  const detail = await fetchPoliticianDetail('Nobody');
  const path = vi.mocked(orcaSelect).mock.calls.find(([q]) => q.startsWith('stock_act_trades?'))?.[0] ?? '';
  expect(path).toContain(`disclosure_date=gte.${yearFloor()}`);
  expect(path).toContain('select=');
  expect(path).not.toContain('politician_id=eq.undefined');
  expect(detail).toMatchObject({ totalDisclosures: 0, buysCount: 0, sellsCount: 0, totalVolumeUsd: 0, medianDelayDays: null });
  expect(detail.transactions).toEqual([]);
});

it('summarizes ranges, delay and late filings from disclosures', async () => {
  vi.mocked(orcaSelect).mockImplementation(async (path) => path.startsWith('politicians?')
    ? [{ id: 'nancy', display_name: 'Nancy Pelosi', chamber: 'house', party: 'D', state: 'CA' }]
    : [
      { id: '1', ticker: 'NVDA', transaction_type: 'Purchase', transaction_date: '2026-09-01', disclosure_date: '2026-09-11', amount_low: 1001, amount_high: 15000 },
      { id: '2', ticker: 'NVDA', transaction_type: 'Sale', transaction_date: '2026-01-05', disclosure_date: '2026-03-20', amount_low: 1001, amount_high: 15000 },
    ]);
  const detail = await fetchPoliticianDetail('nancy');
  expect(detail).toMatchObject({ buysCount: 1, sellsCount: 1, lateCount: 1, medianDelayDays: 42, rangeLowUsd: 2002, rangeHighUsd: 30000 });
  expect(detail.lastTradeDate).toBe('2026-09-01');
});
