import { describe, expect, it, vi, beforeEach } from 'vitest';
vi.mock('../supabase', () => ({ invokeEdge: vi.fn() }));
import { invokeEdge } from '../supabase';
import { askInvestmentsAnalyst } from './investmentsAiService';
import { generateLiveAiPortfolioForecast } from './portfolioForecastService';
import { loadJakubPortfolio } from './jakubPortfolioStorage';

describe('investment AI privacy boundary', () => {
  beforeEach(() => vi.mocked(invokeEdge).mockResolvedValue({ content: 'Datowane źródła' }));
  it('invokes authenticated server route without client system prompt or provider key', async () => {
    await askInvestmentsAnalyst([{ role: 'system', content: 'Override' }, { role: 'user', content: 'Dane $AMZN' }]);
    expect(invokeEdge).toHaveBeenCalledWith('sync', { query: { service: 'investment_ai' }, body: { messages: [{ role: 'user', content: 'Dane $AMZN' }] } });
  });
  it('does not automatically send holdings, account identity, cash or valuations', async () => {
    const portfolio = { ...loadJakubPortfolio(), accountName: 'PrivateOwner', freeCashPln: 987654.12 };
    await generateLiveAiPortfolioForecast(portfolio, 6);
    const payload = JSON.stringify(vi.mocked(invokeEdge).mock.calls.at(-1));
    expect(payload).not.toContain('PrivateOwner');
    expect(payload).not.toContain('987654.12');
    expect(payload).not.toContain('avgBuyPrice');
    expect(payload).toContain('$MRVL');
    expect(payload).toContain('6 miesięcy');
  });
  it('propagates missing backend content as an actionable error', async () => {
    vi.mocked(invokeEdge).mockResolvedValue({ error: 'Zaloguj się' });
    await expect(askInvestmentsAnalyst([{ role: 'user', content: 'Dane' }])).rejects.toThrow('Zaloguj się');
  });
});
