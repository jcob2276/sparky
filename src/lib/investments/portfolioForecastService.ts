/**
 * portfolioForecastService.ts — Modelowanie prognoz analityków, wycen docelowych i scenariuszy rynkowych (Bull / Base / Bear).
 * Łączy konsensus analityków Wall Street i GPW z dynamiczną analizą AI & Jev.
 */

import { askInvestmentsAnalyst } from './investmentsAiService';
import type { JakubPortfolioData } from './jakubPortfolioStorage';
import type { KondzioPortfolioData } from './kondzioPortfolioStorage';

export type ForecastHorizon = 6 | 12 | 24;
export type ScenarioType = 'bull' | 'base' | 'bear';

export interface PositionAnalystTarget {
  ticker: string;
  name: string;
  currentPricePln: number;
  meanTargetPricePln: number;
  meanUpsidePct: number;
  rating: 'Strong Buy' | 'Buy' | 'Hold' | 'Speculative Buy';
  numAnalysts: number;
  source: string;
  keyCatalyst: string;
  bullTargetPln: number;
  bullReturnPct: number;
  bearTargetPln: number;
  bearReturnPct: number;
  whatMustHappen: {
    bull: string[];
    base: string[];
    bear: string[];
  };
}

export interface ScenarioBreakdown {
  type: ScenarioType;
  label: string;
  probabilityPct: number;
  simulatedPortfolioValuePln: number;
  simulatedProfitPln: number;
  simulatedRoiPct: number;
  headline: string;
  coreConditions: string[];
  positionsDetail: {
    ticker: string;
    targetPricePln: number;
    simulatedValuePln: number;
    returnPct: number;
  }[];
}

export interface PortfolioForecastModel {
  accountName: string;
  currentTotalPln: number;
  freeCashPln: number;
  horizonMonths: ForecastHorizon;
  positions: PositionAnalystTarget[];
  scenarios: {
    bull: ScenarioBreakdown;
    base: ScenarioBreakdown;
    bear: ScenarioBreakdown;
  };
  summary: {
    baseTargetPln: number;
    baseProfitPln: number;
    baseRoiPct: number;
    highestAsymmetryTicker: string;
    safestAnchorTicker: string;
  };
}

import { TICKER_ANALYST_DATABASE } from './portfolioForecastData';

function getHorizonMultiplier(horizon: ForecastHorizon): number {
  if (horizon === 6) return 0.55;
  if (horizon === 24) return 1.75;
  return 1.0;
}

export function calculatePortfolioForecast(
  portfolio: JakubPortfolioData | KondzioPortfolioData,
  horizon: ForecastHorizon = 12
): PortfolioForecastModel {
  const mult = getHorizonMultiplier(horizon);

  const positions: PositionAnalystTarget[] = portfolio.positions.map((p) => {
    const db = TICKER_ANALYST_DATABASE[p.ticker] || {
      base12mUpside: 15.0,
      bull12mUpside: 35.0,
      bear12mUpside: -10.0,
      rating: 'Buy' as const,
      numAnalysts: 10,
      source: 'Konsensus rynkowy',
      keyCatalyst: 'Wzrost organiczny i realizacja strategii biznesowej',
      whatMustHappen: {
        bull: ['Przyspieszenie przychodów i poprawa marż powyżej oczekiwań analityków.'],
        base: ['Realizacja prognoz zarządu zgodnie z planem.'],
        bear: ['Pogorszenie otoczenia makroekonomicznego i presja kosztowa.'],
      },
    };

    const meanUpside = db.base12mUpside * mult;
    const bullUpside = db.bull12mUpside * mult;
    const bearUpside = db.bear12mUpside * mult;

    const meanTargetPrice = p.currentPrice * (1 + meanUpside / 100);
    const bullTarget = p.currentPrice * (1 + bullUpside / 100);
    const bearTarget = p.currentPrice * (1 + bearUpside / 100);

    return {
      ticker: p.ticker,
      name: p.name,
      currentPricePln: p.currentPrice,
      meanTargetPricePln: meanTargetPrice,
      meanUpsidePct: meanUpside,
      rating: db.rating,
      numAnalysts: db.numAnalysts,
      source: db.source,
      keyCatalyst: db.keyCatalyst,
      bullTargetPln: bullTarget,
      bullReturnPct: bullUpside,
      bearTargetPln: bearTarget,
      bearReturnPct: bearUpside,
      whatMustHappen: db.whatMustHappen,
    };
  });

  // Calculate scenarios
  const calculateScenarioOutcome = (
    type: ScenarioType,
    label: string,
    probabilityPct: number,
    headline: string
  ): ScenarioBreakdown => {
    let simulatedAssetsValue = 0;
    const positionsDetail = positions.map((p, idx) => {
      const orig = portfolio.positions[idx];
      const returnPct =
        type === 'bull'
          ? p.bullReturnPct
          : type === 'base'
          ? p.meanUpsidePct
          : p.bearReturnPct;
      const targetPrice =
        type === 'bull'
          ? p.bullTargetPln
          : type === 'base'
          ? p.meanTargetPricePln
          : p.bearTargetPln;
      const simulatedVal = orig.shares * targetPrice;
      simulatedAssetsValue += simulatedVal;

      return {
        ticker: p.ticker,
        targetPricePln: targetPrice,
        simulatedValuePln: simulatedVal,
        returnPct,
      };
    });

    const simulatedTotalValuePln = simulatedAssetsValue + portfolio.freeCashPln;
    const simulatedProfitPln = simulatedTotalValuePln - portfolio.totalValuePln;
    const simulatedRoiPct = (simulatedProfitPln / portfolio.totalValuePln) * 100;

    const coreConditions = positions.map(
      (p) => `${p.ticker}: ${p.whatMustHappen[type][0] || p.keyCatalyst}`
    );

    return {
      type,
      label,
      probabilityPct,
      simulatedPortfolioValuePln: simulatedTotalValuePln,
      simulatedProfitPln,
      simulatedRoiPct,
      headline,
      coreConditions,
      positionsDetail,
    };
  };

  const bull = calculateScenarioOutcome(
    'bull',
    'Scenariusz Hossa (Bull)',
    25,
    'Szybka adopcja technologii AI, udane misje kosmiczne i stopy procentowe w dół'
  );

  const base = calculateScenarioOutcome(
    'base',
    'Scenariusz Bazowy (Konsensus)',
    55,
    'Stabilna realizacja prognoz finansowych przy umiarkowanym wzroście gospodarczym'
  );

  const bear = calculateScenarioOutcome(
    'bear',
    'Scenariusz Bessa (Bear)',
    20,
    'Spowolnienie capexu Big Tech, opóźnienia premier i przedłużająca się restrykcyjna polityka monetarna'
  );

  const sortedByUpside = [...positions].sort((a, b) => b.meanUpsidePct - a.meanUpsidePct);
  const highestAsymmetryTicker = sortedByUpside[0]?.ticker || 'JEDI';
  const safestAnchorTicker = sortedByUpside.at(-1)?.ticker || 'SXR8';

  return {
    accountName: portfolio.accountName,
    currentTotalPln: portfolio.totalValuePln,
    freeCashPln: portfolio.freeCashPln,
    horizonMonths: horizon,
    positions,
    scenarios: { bull, base, bear },
    summary: {
      baseTargetPln: base.simulatedPortfolioValuePln,
      baseProfitPln: base.simulatedProfitPln,
      baseRoiPct: base.simulatedRoiPct,
      highestAsymmetryTicker,
      safestAnchorTicker,
    },
  };
}

/**
 * Uruchamia pełną, dogłębną syntezę predykcyjną AI & Jev (no-limit) dla portfela
 */
export async function generateLiveAiPortfolioForecast(
  portfolio: JakubPortfolioData | KondzioPortfolioData,
  horizon: ForecastHorizon = 12
): Promise<string> {
  const model = calculatePortfolioForecast(portfolio, horizon);
  const prompt = `Przeprowadź pełną, bezkompromisową prognozę analityczną dla mojego portfela "${portfolio.accountName}" na horyzoncie ${horizon} miesięcy:

DANE PORTFELA:
- Wartość bieżąca: ${portfolio.totalValuePln.toFixed(2)} PLN
- Wolna gotówka: ${portfolio.freeCashPln.toFixed(2)} PLN
- Otwarte pozycje:
${portfolio.positions
  .map(
    (p) =>
      `  * $${p.ticker} (${p.name}): ${p.shares} szt., wartość bieżąca ${p.currentValue.toFixed(2)} PLN, PnL: ${p.pnlPln.toFixed(2)} PLN (${p.pnlPct.toFixed(1)}%)`
  )
  .join('\n')}

WYLICZENIA KONSENSUSU ANALITYKÓW WALL STREET & GPW:
- Scenariusz Bazowy (Konsensus): wycena ~${model.scenarios.base.simulatedPortfolioValuePln.toFixed(2)} PLN (+${model.scenarios.base.simulatedRoiPct.toFixed(1)}%)
- Scenariusz Byczy (Bull Case): wycena ~${model.scenarios.bull.simulatedPortfolioValuePln.toFixed(2)} PLN (+${model.scenarios.bull.simulatedRoiPct.toFixed(1)}%)
- Scenariusz Niedźwiedzi (Bear Case): wycena ~${model.scenarios.bear.simulatedPortfolioValuePln.toFixed(2)} PLN (${model.scenarios.bear.simulatedRoiPct.toFixed(1)}%)

WYMAGANIA DO TWOJEJ ANALIZY (Bądź precyzyjny, nie oszczędzaj słów ani głębi):
1. ### 1. SYNTEZA WYCENY I ZWROTU Z KAPITAŁU
   Szczegółowa ocena asymetrii zysku do ryzyka (Risk/Reward Ratio) dla tego portfela.
2. ### 2. HARMONOGRAM KATALIZATORÓW (KWARTAŁ PO KWARTALE)
   Dokładna oś czasu: co i kiedy musi się wydarzyć w spółkach ($JEDI, $MRVL, $CDR, $SXR8 itd.) w kolejnych kwartałach (Q4 2026, Q1 2027, Q2 2027).
3. ### 3. DETALE 3 SCENARIUSZY (CO KONKRETNIE MUSI SIĘ WYDARZYĆ)
   Wypisz bezwzględne warunki brzegowe: co musi osiągnąć każda ze spółek, aby portfel zrealizował zysk +${model.scenarios.bull.simulatedRoiPct.toFixed(0)}%, a jakie sygnały ostrzegawcze zwiastują scenariusz Bear.
4. ### 4. REKOMENDACJA ZAGOSPODAROWANIA WOLNYCH ŚRODKÓW (${portfolio.freeCashPln.toFixed(2)} PLN)
   Gdzie ulokować wolną gotówkę: czy uśredniać w dół, czekać na breakout, czy dokupić szeroki rynek?`;

  const answer = await askInvestmentsAnalyst([{ role: 'user', content: prompt }]);
  return answer.content;
}
