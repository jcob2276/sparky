/**
 * jakubPortfolioStorage.ts — Zarządzanie danymi portfela IKE Jakuba w /inwestycje.
 * Domyślny seed pochodzi z rachunku maklerskiego IKE.
 */

export interface PortfolioPosition {
  id: string;
  ticker: string;
  name: string;
  type: 'Akcje' | 'ETF';
  market: 'GPW' | 'US' | 'EU';
  shares: number;
  avgBuyPrice: number; // PLN
  currentPrice: number; // PLN
  currentValue: number; // PLN
  pnlPln: number; // PLN
  pnlPct: number; // %
  smartMoneySignal?: string;
  knfShortStatus?: string;
}

export interface JakubPortfolioData {
  accountName: string;
  totalValuePln: number;
  totalPnlPln: number;
  totalPnlPct: number;
  marketValuePln: number;
  freeCashPln: number;
  remainingIkeLimitPln: number;
  annualIkeLimitPln: number;
  lastUpdated: string;
  positions: PortfolioPosition[];
}

const STORAGE_KEY = 'sparky_jakub_ike_portfolio_v1';

const INITIAL_JAKUB_PORTFOLIO: JakubPortfolioData = {
  accountName: 'Moje IKE',
  totalValuePln: 7050.45,
  totalPnlPln: -1526.31,
  totalPnlPct: -19.16,
  marketValuePln: 6441.74,
  freeCashPln: 608.71,
  remainingIkeLimitPln: 23999.01,
  annualIkeLimitPln: 25500.0,
  lastUpdated: new Date().toISOString(),
  positions: [
    {
      id: 'pos-vaneck-space',
      ticker: 'JEDI',
      name: 'VanEck Space Innovators',
      type: 'ETF',
      market: 'EU',
      shares: 15,
      avgBuyPrice: 428.93,
      currentPrice: 313.45,
      currentValue: 4701.79,
      pnlPln: -1732.21,
      pnlPct: -26.92,
      smartMoneySignal: 'Główna pozycja portfela (66.7%). Sektor infrastruktury orbitalnej, satelitów i obronności kosmicznej.',
    },
    {
      id: 'pos-marvell',
      ticker: 'MRVL',
      name: 'Marvell Technology',
      type: 'Akcje',
      market: 'US',
      shares: 1.4752,
      avgBuyPrice: 847.25,
      currentPrice: 997.99,
      currentValue: 1472.24,
      pnlPln: 222.37,
      pnlPct: 17.79,
      smartMoneySignal: 'Silna akumulacja funduszy 13F i zbieżność z sektorem półprzewodników AI / custom silicon.',
    },
    {
      id: 'pos-cdprojekt',
      ticker: 'CDR',
      name: 'CD Projekt RED',
      type: 'Akcje',
      market: 'GPW',
      shares: 1,
      avgBuyPrice: 262.7,
      currentPrice: 245.5,
      currentValue: 245.5,
      pnlPln: -17.2,
      pnlPct: -6.55,
      knfShortStatus: 'Marshall Wace & Point72 obecne w Rejestrze Krótkiej Sprzedaży KNF (>0.5% kapitału).',
      smartMoneySignal: 'Brak świeżych zakupów insiderów na ESPI MAR 19. Spółka w fazie produkcji Polaris/Wiedźmin 4.',
    },
    {
      id: 'pos-core-sp500',
      ticker: 'SXR8',
      name: 'Core S&P 500',
      type: 'ETF',
      market: 'EU',
      shares: 0.007,
      avgBuyPrice: 3068.57,
      currentPrice: 3172.86,
      currentValue: 22.21,
      pnlPln: 0.73,
      pnlPct: 3.4,
      smartMoneySignal: 'Pasywna ekspozycja na 500 największych spółek USA. Benchmark rynkowy.',
    },
  ],
};

export function loadJakubPortfolio(): JakubPortfolioData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_JAKUB_PORTFOLIO;
    const parsed = JSON.parse(raw) as JakubPortfolioData;
    if (!parsed || !Array.isArray(parsed.positions)) return INITIAL_JAKUB_PORTFOLIO;
    return parsed;
  } catch {
    return INITIAL_JAKUB_PORTFOLIO;
  }
}

export function saveJakubPortfolio(data: JakubPortfolioData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* tryb prywatny */
  }
}

export function resetJakubPortfolio(): JakubPortfolioData {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* noop */
  }
  return INITIAL_JAKUB_PORTFOLIO;
}
