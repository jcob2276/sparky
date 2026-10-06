import { askInvestmentsAnalyst } from './investmentsAiService';
import type { JakubPortfolioData } from './jakubPortfolioStorage';
import type { KondzioPortfolioData } from './kondzioPortfolioStorage';
import { portfolioQuoteTicker } from './portfolioSyncService';

export type ForecastHorizon = 6 | 12 | 24;
export type ScenarioType = 'bull' | 'base' | 'bear';
export type ManualScenarioReturns = Partial<Record<ScenarioType, number | null>>;
export interface PositionAnalystTarget {
  ticker: string; name: string; currentPricePln: number;
  meanTargetPricePln: number | null; meanUpsidePct: number | null;
  rating: string | null; numAnalysts: number | null; source: string | null;
  sourceUrl: string | null; sourceDate: string | null;
}
export interface ScenarioBreakdown {
  type: ScenarioType; label: string; probabilityPct: null;
  assumedReturnPct: number | null;
  simulatedPortfolioValuePln: number | null; simulatedProfitPln: number | null;
  simulatedRoiPct: number | null; headline: string; coreConditions: string[];
}
export interface PortfolioForecastModel {
  accountName: string; currentTotalPln: number; freeCashPln: number;
  horizonMonths: ForecastHorizon; positions: PositionAnalystTarget[];
  scenarios: Record<ScenarioType, ScenarioBreakdown>;
}

/** Sensitivity calculator, not analyst forecast. No unstated default returns. */
export function calculatePortfolioForecast(
  portfolio: JakubPortfolioData | KondzioPortfolioData,
  horizon: ForecastHorizon = 12, assumptions: ManualScenarioReturns = {},
): PortfolioForecastModel {
  const marketValue = portfolio.positions.reduce((sum, p) => sum + p.shares * p.currentPrice, 0);
  const currentTotal = marketValue + portfolio.freeCashPln;
  const scenario = (type: ScenarioType, label: string): ScenarioBreakdown => {
    const input = assumptions[type];
    const assumedReturnPct = input != null && Number.isFinite(input) && input >= -100 ? input : null;
    const value = assumedReturnPct == null ? null : marketValue * (1 + assumedReturnPct / 100) + portfolio.freeCashPln;
    const profit = value == null ? null : value - currentTotal;
    return { type, label, probabilityPct: null, assumedReturnPct,
      simulatedPortfolioValuePln: value, simulatedProfitPln: profit,
      simulatedRoiPct: profit == null || currentTotal <= 0 ? null : profit / currentTotal * 100,
      headline: 'Założenie użytkownika dla wszystkich aktywów; gotówka bez oprocentowania. Bez prognozy kursu walut, podatków, opłat i dywidend.',
      coreConditions: [assumedReturnPct == null ? 'Wpisz założony zwrot aktywów w PLN dla wybranego horyzontu.' : `Zwrot aktywów w PLN wyniesie ${assumedReturnPct}% w ${horizon} miesięcy. To założenie, nie konsensus ani prawdopodobieństwo.`],
    };
  };
  return { accountName: portfolio.accountName, currentTotalPln: currentTotal,
    freeCashPln: portfolio.freeCashPln, horizonMonths: horizon,
    positions: portfolio.positions.map((p) => ({ ticker: p.ticker, name: p.name, currentPricePln: p.currentPrice,
      meanTargetPricePln: null, meanUpsidePct: null, rating: null, numAnalysts: null,
      source: null, sourceUrl: null, sourceDate: null })),
    scenarios: { bull: scenario('bull', 'Wzrost'), base: scenario('base', 'Bazowy'), bear: scenario('bear', 'Spadek') },
  };
}

/** Only public instrument identifiers leave the local portfolio. */
export async function generateLiveAiPortfolioForecast(
  portfolio: JakubPortfolioData | KondzioPortfolioData, horizon: ForecastHorizon = 12,
): Promise<string> {
  const tickers = [...new Set(portfolio.positions.map(portfolioQuoteTicker))];
  const answer = await askInvestmentsAnalyst([{ role: 'user', content:
    `Analiza publicznych danych dla instrumentów ${tickers.map((t) => `$${t}`).join(', ')}. Horyzont ${horizon} miesięcy. Przedstaw dostępne datowane źródła, ryzyka i brakujące dane. Nie znasz wielkości pozycji ani gotówki. Nie wymyślaj cen docelowych, konsensusu, dat zdarzeń, ocen ani prawdopodobieństw. Rozdziel fakty od warunkowych scenariuszy.` }]);
  return answer.content;
}
