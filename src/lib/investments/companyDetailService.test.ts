import { afterEach, expect, it, vi } from 'vitest';
import { fetchCompanyDetailData } from './companyDetailService';
import { orcaSelect } from './superinvestorsApi';
vi.mock('./superinvestorsApi', () => ({ orcaSelect: vi.fn() }));
afterEach(() => { vi.resetAllMocks(); vi.unstubAllGlobals(); });

it('does not invent metadata, amounts or transaction directions for missing evidence', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
  vi.mocked(orcaSelect).mockImplementation(async path => {
    if (path.startsWith('stock_act_trades?')) return [
      { id: 'purchase', transaction_type: 'purchase' }, { id: 'exchange', transaction_type: 'exchange' },
    ];
    if (path.startsWith('vw_sec_form4_public?')) return [
      { id: 'award', transaction_code: 'A' }, { id: 'purchase', transaction_code: 'P' },
    ];
    return [];
  });
  const data = await fetchCompanyDetailData('XTB', 'XTB');
  expect(data.exchange).toBe('—');
  expect(data.sector).toBe('—');
  expect(data.description).not.toContain('amerykańskiej');
  expect(data.politicians).toMatchObject({ buyersCount: 1, sellsCount: 0 });
  expect(data.politicians.trades[0].amountLabel).toBe('—');
  expect(data.insiders).toMatchObject({ buysCount: 1, sellsCount: 0 });
});

it('surfaces a failed required read instead of displaying a successful empty company', async () => {
  vi.mocked(orcaSelect).mockRejectedValue(new Error('read failed'));
  await expect(fetchCompanyDetailData('NVDA')).rejects.toThrow('read failed');
});

it('reads GPW prices with an explicit market identity', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
  vi.mocked(orcaSelect).mockResolvedValue([]);
  const data = await fetchCompanyDetailData('XTB', 'XTB', 'gpw');
  expect(data.exchange).toBe('GPW');
  expect(data.price).toBeNull();
  expect(vi.mocked(orcaSelect).mock.calls.some(([path]) => path.startsWith('prices_daily?ticker=eq.XTB.WA&'))).toBe(true);
  expect(vi.mocked(orcaSelect).mock.calls.some(([path]) => /stock_act_trades|vw_consensus|vw_sec_form4_public/.test(path))).toBe(false);
});

it('keeps missing quarter comparisons unknown and includes positions no longer reported', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
  vi.mocked(orcaSelect).mockImplementation(async path => {
    if (path.startsWith('vw_sec13f_current_holdings?')) return [{
      investor_id: 'unpaired', shares: 100, value_usd: 20000, period_of_report: '2026-06-30', filing_url: 'https://www.sec.gov/current',
    }];
    if (path.startsWith('vw_sec13f_verified_changes?')) return [{
      investor_id: 'absent', shares_now: 0, shares_delta: -10, value_now: 0, change_type: 'reported_absent',
      period_of_report: '2026-06-30', previous_period: '2026-03-31',
      filing_url: 'https://www.sec.gov/new', previous_filing_url: 'https://www.sec.gov/old',
    }];
    return [];
  });
  const data = await fetchCompanyDetailData('NVDA');
  expect(data.holdings.find(row => row.investorId === 'unpaired')).toMatchObject({ sharesDelta: null, changeType: 'uncompared' });
  expect(data.holdings.find(row => row.investorId === 'absent')).toMatchObject({ sharesNow: 0, sharesDelta: -10, previousPeriod: '2026-03-31' });
  expect(data.holdings.find(row => row.investorId === 'absent')?.sourceUrls).toHaveLength(2);
  expect(data.fundChanges).toMatchObject({ comparedFunds: 1, decreases: 1, increases: 0 });
  expect(vi.mocked(orcaSelect).mock.calls.some(([path]) => path.startsWith('vw_holdings_changes?'))).toBe(false);
});
