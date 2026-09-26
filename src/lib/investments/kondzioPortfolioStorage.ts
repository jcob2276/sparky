/**
 * kondzioPortfolioStorage.ts — Zarządzanie danymi portfela Kondzia w /inwestycje.
 * Rachunek maklerski XTB z 10 otwartymi pozycjami ze zrzutu ekranu.
 */

import type { PortfolioPosition } from './jakubPortfolioStorage';

export interface KondzioPortfolioData {
  accountName: string;
  broker: string;
  totalValuePln: number;
  totalPnlPln: number;
  totalPnlPct: number;
  marketValuePln: number;
  freeCashPln: number;
  lastUpdated: string;
  positions: PortfolioPosition[];
}

const STORAGE_KEY = 'sparky_kondzio_portfolio_v1';

const INITIAL_KONDZIO_PORTFOLIO: KondzioPortfolioData = {
  accountName: 'Portfel Kondzia',
  broker: 'XTB',
  totalValuePln: 6761.63,
  totalPnlPln: 1495.19,
  totalPnlPct: 28.52,
  marketValuePln: 6737.34,
  freeCashPln: 24.29,
  lastUpdated: new Date().toISOString(),
  positions: [
    {
      id: 'pos-asbis',
      ticker: 'ASB',
      name: 'Asbis',
      type: 'Akcje',
      market: 'GPW',
      shares: 5,
      avgBuyPrice: 93.84,
      currentPrice: 172.9,
      currentValue: 864.5,
      pnlPln: 395.3,
      pnlPct: 84.25,
      smartMoneySignal:
        'Dystrybutor IT i elektroniki, rynki CEE, Kaukaz i Bliski Wschód. Regularne dywidendy dwucyfrowe.',
    },
    {
      id: 'pos-bloom-energy',
      ticker: 'BE',
      name: 'Bloom Energy',
      type: 'Akcje',
      market: 'US',
      shares: 0.6527,
      avgBuyPrice: 765.94,
      currentPrice: 1098.18,
      currentValue: 716.78,
      pnlPln: 216.85,
      pnlPct: 43.38,
      smartMoneySignal:
        'Ogniwa paliwowe Solid Oxide, bezpośrednie zasilanie centrów danych AI off-grid. Boom energetyczny AI.',
    },
    {
      id: 'pos-intel',
      ticker: 'INTC',
      name: 'Intel',
      type: 'Akcje',
      market: 'US',
      shares: 1.512,
      avgBuyPrice: 325.46,
      currentPrice: 468.49,
      currentValue: 708.35,
      pnlPln: 216.26,
      pnlPct: 43.95,
      smartMoneySignal:
        'Głęboka wycena wartościowa, dotacje rządu USA z CHIPS Act, rozwój procesów 18A i Intel Foundry.',
    },
    {
      id: 'pos-xtb',
      ticker: 'XTB',
      name: 'XTB',
      type: 'Akcje',
      market: 'GPW',
      shares: 5,
      avgBuyPrice: 121.69,
      currentPrice: 151.66,
      currentValue: 758.3,
      pnlPln: 149.86,
      pnlPct: 24.63,
      smartMoneySignal:
        'Fintech brokerski, dynamiczny wzrost bazy klientów w Europie i LatAm, wysoki udział produktów pasywnych.',
    },
    {
      id: 'pos-nebius',
      ticker: 'NBIS',
      name: 'Nebius Group NV',
      type: 'Akcje',
      market: 'US',
      shares: 0.7172,
      avgBuyPrice: 697.11,
      currentPrice: 903.96,
      currentValue: 648.32,
      pnlPln: 148.35,
      pnlPct: 29.67,
      smartMoneySignal:
        'Czołowy europejski dostawca infrastruktury obliczeniowej AI i klastrów GPU Nvidia H100/B200.',
    },
    {
      id: 'pos-marvell',
      ticker: 'MRVL',
      name: 'Marvell',
      type: 'Akcje',
      market: 'US',
      shares: 0.6058,
      avgBuyPrice: 825.29,
      currentPrice: 997.99,
      currentValue: 604.58,
      pnlPln: 104.62,
      pnlPct: 20.93,
      smartMoneySignal:
        'Zbieżność z portfelem Jakuba! Custom silicon dla hyperscalerów, kontrolery pamięci i optoelektronika.',
    },
    {
      id: 'pos-micron',
      ticker: 'MU',
      name: 'Micron',
      type: 'Akcje',
      market: 'US',
      shares: 0.1431,
      avgBuyPrice: 3493.01,
      currentPrice: 4123.06,
      currentValue: 590.01,
      pnlPln: 90.16,
      pnlPct: 18.04,
      smartMoneySignal:
        'Pamięci HBM3e dla akceleratorów Nvidia, wysoka marża brutto i strukturalny niedobór pamięci AI.',
    },
    {
      id: 'pos-allegro',
      ticker: 'ALE',
      name: 'Allegro',
      type: 'Akcje',
      market: 'GPW',
      shares: 8,
      avgBuyPrice: 38.465,
      currentPrice: 49.33,
      currentValue: 394.64,
      pnlPln: 86.92,
      pnlPct: 28.25,
      smartMoneySignal:
        'Monopolista e-commerce w Polsce, ekspansja CEE (Czechy, Słowacja, Węgry), rosnące przepływy pieniężne.',
    },
    {
      id: 'pos-msci-acwi',
      ticker: 'ISAC',
      name: 'MSCI ACWI',
      type: 'ETF',
      market: 'EU',
      shares: 2,
      avgBuyPrice: 432.56,
      currentPrice: 472.18,
      currentValue: 944.36,
      pnlPln: 79.24,
      pnlPct: 9.16,
      smartMoneySignal:
        'Globalny indeks całego świata (All Country World Index), pasywna baza stabilizująca zmienność portfela.',
    },
    {
      id: 'pos-nvidia',
      ticker: 'NVDA',
      name: 'Nvidia',
      type: 'Akcje',
      market: 'US',
      shares: 0.5915,
      avgBuyPrice: 845.09,
      currentPrice: 857.99,
      currentValue: 507.5,
      pnlPln: 7.63,
      pnlPct: 1.53,
      smartMoneySignal:
        'Niekwestionowany hegemon architektury obliczeniowej AI, platforma CUDA i sieć Quantum InfiniBand.',
    },
  ],
};

export function loadKondzioPortfolio(): KondzioPortfolioData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_KONDZIO_PORTFOLIO;
    const parsed = JSON.parse(raw) as KondzioPortfolioData;
    if (!parsed || !Array.isArray(parsed.positions)) return INITIAL_KONDZIO_PORTFOLIO;
    return parsed;
  } catch {
    return INITIAL_KONDZIO_PORTFOLIO;
  }
}

export function saveKondzioPortfolio(data: KondzioPortfolioData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* tryb prywatny */
  }
}

export function resetKondzioPortfolio(): KondzioPortfolioData {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* noop */
  }
  return INITIAL_KONDZIO_PORTFOLIO;
}
