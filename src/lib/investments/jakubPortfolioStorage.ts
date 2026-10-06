/**
 * jakubPortfolioStorage.ts — Zarządzanie danymi portfela Jakuba w /inwestycje.
 * Domyślny seed pochodzi ze zweryfikowanego rachunku maklerskiego.
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
  quoteAsOf?: string;
  quoteSource?: string;
  quoteSourceUrl?: string;
  quoteCurrency?: string;
}

export interface JakubPortfolioData {
  accountName: string;
  totalValuePln: number;
  totalPnlPln: number;
  totalPnlPct: number;
  marketValuePln: number;
  freeCashPln: number;
  lastUpdated: string;
  positions: PortfolioPosition[];
}

const STORAGE_KEY = 'sparky_jakub_portfolio_v3';

const INITIAL_JAKUB_PORTFOLIO: JakubPortfolioData = {
  accountName: 'Portfel Jakuba',
  totalValuePln: 7226.46,
  totalPnlPln: 278.29,
  totalPnlPct: 4.01,
  marketValuePln: 7226.46,
  freeCashPln: 0,
  lastUpdated: new Date().toISOString(),
  positions: [
    {
      id: 'pos-amazon',
      ticker: 'AMZN',
      name: 'Amazon',
      type: 'Akcje',
      market: 'US',
      shares: 0.5053,
      avgBuyPrice: 989.37,
      currentPrice: 977.30,
      currentValue: 493.83,
      pnlPln: -6.10,
      pnlPct: -1.22,
      smartMoneySignal: 'Dominacja w chmurze hyperscalers (AWS) oraz infrastrukturze obliczeniowej AI. Rekordowy FCF i wysoka konwersja operacyjna.',
    },
    {
      id: 'pos-bloom-energy',
      ticker: 'BE',
      name: 'Bloom Energy',
      type: 'Akcje',
      market: 'US',
      shares: 0.4384,
      avgBuyPrice: 1140.28,
      currentPrice: 1116.06,
      currentValue: 489.28,
      pnlPln: -10.62,
      pnlPct: -2.12,
      smartMoneySignal: 'Ogniwa paliwowe i zasilanie on-site dla centrów danych AI. Rosnący popyt na mikrosieci energetyczne przy przeciążonej sieci przesyłowej w USA.',
    },
    {
      id: 'pos-cdprojekt',
      ticker: 'CDR',
      name: 'CD Projekt RED',
      type: 'Akcje',
      market: 'GPW',
      shares: 1,
      avgBuyPrice: 262.70,
      currentPrice: 259.50,
      currentValue: 259.50,
      pnlPln: -3.20,
      pnlPct: -1.22,
      knfShortStatus: 'Marshall Wace & Point72 obecne w Rejestrze Krótkiej Sprzedaży KNF (>0.5% kapitału).',
      smartMoneySignal: 'Faza produkcji Polaris (Wiedźmin 4). Płynny bilans z ponad 1 mld PLN gotówki i zero długu odsetkowego.',
    },
    {
      id: 'pos-core-sp500',
      ticker: 'CSPX',
      name: 'Core S&P 500',
      type: 'ETF',
      market: 'EU',
      shares: 0.3112,
      avgBuyPrice: 3281.59,
      currentPrice: 3253.12,
      currentValue: 1012.37,
      pnlPln: -8.86,
      pnlPct: -0.87,
      smartMoneySignal: 'iShares Core S&P 500 UCITS ETF (CSPX.L). Pasywny filar ekspozycji na 500 największych korporacji USA (benchmark rynkowy).',
    },
    {
      id: 'pos-marvell',
      ticker: 'MRVL',
      name: 'Marvell Technology',
      type: 'Akcje',
      market: 'US',
      shares: 1.4752,
      avgBuyPrice: 847.25,
      currentPrice: 1047.09,
      currentValue: 1544.67,
      pnlPln: 294.80,
      pnlPct: 23.59,
      smartMoneySignal: 'Silna akumulacja funduszy 13F i zbieżność z sektorem półprzewodników AI / custom silicon i optyki centrów danych.',
    },
    {
      id: 'pos-nvidia',
      ticker: 'NVDA',
      name: 'Nvidia',
      type: 'Akcje',
      market: 'US',
      shares: 1.0762,
      avgBuyPrice: 929.18,
      currentPrice: 931.61,
      currentValue: 1002.60,
      pnlPln: 2.62,
      pnlPct: 0.26,
      smartMoneySignal: 'Maksymalny Piotroski F-Score (9/9). Monopol w architekturze akceleratorów AI (Blackwell/Hopper), ekspansja CUDA i marża brutto >75%.',
    },
    {
      id: 'pos-spacex-etf',
      ticker: 'SPCX',
      name: 'SpaceX / Space Company ETF',
      type: 'ETF',
      market: 'US',
      shares: 1.5291,
      avgBuyPrice: 654.10,
      currentPrice: 669.32,
      currentValue: 1023.46,
      pnlPln: 23.27,
      pnlPct: 2.33,
      smartMoneySignal: 'Sektor infrastruktury kosmicznej, obronności orbitalnej i technologii satelitarnych. Tematyczna asymetria zysku.',
    },
    {
      id: 'pos-vistra-energy',
      ticker: 'VST',
      name: 'Vistra Energy',
      type: 'Akcje',
      market: 'US',
      shares: 1.744,
      avgBuyPrice: 573.30,
      currentPrice: 566.69,
      currentValue: 988.31,
      pnlPln: -11.52,
      pnlPct: -1.15,
      smartMoneySignal: 'Kluczowy beneficjent zapotrzebowania energetycznego centrów danych AI. Baza nuklearna i wieloletnie umowy PPA z Big Tech.',
    },
    {
      id: 'pos-xtb',
      ticker: 'XTB',
      name: 'XTB',
      type: 'Akcje',
      market: 'GPW',
      shares: 3,
      avgBuyPrice: 138.18,
      currentPrice: 137.48,
      currentValue: 412.44,
      pnlPln: -2.10,
      pnlPct: -0.51,
      smartMoneySignal: 'Bardzo wysoki wskaźnik ROE (>40%), zerowe zadłużenie zewnętrzne, potężne rezerwy gotówkowe i regularna wysoka dywidenda.',
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
