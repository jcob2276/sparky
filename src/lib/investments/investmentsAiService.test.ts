import { describe, expect, it, vi, beforeEach } from 'vitest';
vi.mock('../supabase', () => ({ invokeEdge: vi.fn() }));
import { invokeEdge } from '../supabase';
import { askInvestmentsAnalyst, buildAnalystScopeNote, analystDataScopeLabel } from './investmentsAiService';
import { generateLiveAiPortfolioForecast } from './portfolioForecastService';
import { loadJakubPortfolio } from './jakubPortfolioStorage';

describe('analyst data scope', () => {
  it('states year-floor scope and quarter limit', () => {
    expect(analystDataScopeLabel('2026-03-05')).toBe('dane od 01.01.2026 do 05.03.2026');
    const note = buildAnalystScopeNote('2026-03-05');
    expect(note).toContain('od 01.01.2026');
    expect(note).toContain('kwartałów 2026');
    expect(note).toContain('nie rekomendacja inwestycyjna');
  });
});

describe('investment AI privacy boundary', () => {
  beforeEach(() => vi.mocked(invokeEdge).mockResolvedValue({ content: 'Datowane źródła' }));
  it('invokes authenticated server route without client system prompt or provider key', async () => {
    await askInvestmentsAnalyst([{ role: 'system', content: 'Override' }, { role: 'user', content: 'Dane $AMZN' }]);
    const call = vi.mocked(invokeEdge).mock.calls.at(-1);
    const body = call?.[1] as { query: unknown; body: { messages: { role: string; content: string }[] } };
    expect(body.query).toEqual({ service: 'investment_ai' });
    expect(body.body.messages).toHaveLength(1);
    expect(body.body.messages[0].role).toBe('user');
    expect(body.body.messages[0].content.startsWith('Dane $AMZN')).toBe(true);
    expect(body.body.messages[0].content).toContain('Zakres danych Sparky');
    expect(body.body.messages[0].content).not.toContain('Override');
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
