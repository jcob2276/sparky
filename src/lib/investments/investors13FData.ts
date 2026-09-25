/**
 * investors13FData.ts — Baza portfeli 13F najsłynniejszych inwestorów instytucjonalnych (SEC EDGAR Form 13F-HR).
 * Zgodnie z modelem OrcaFolio: wartość koszyka, wagi %, zmiany QoQ (nowa, zwiększona, zmniejszona, bez zmian).
 */

type PositionChangeType = 'new' | 'increased' | 'reduced' | 'unchanged' | 'sold_out';

export interface Holding13F {
  ticker: string;
  name: string;
  weightPercent: number;
  shares: number;
  valueUsd: number;
  changeType: PositionChangeType;
  changeSharesPercent?: number;
  sector: string;
}

export interface Investor13F {
  id: string;
  name: string;
  fundName: string;
  cik: string;
  aumFormatted: string;
  filingDate: string;
  periodEnded: string;
  topHoldingsCount: number;
  description: string;
  holdings: Holding13F[];
  sectorBreakdown: { sector: string; percent: number }[];
}

export const INVESTORS_13F_DATA: Investor13F[] = [
  {
    id: 'warren-buffett',
    name: 'Warren Buffett',
    fundName: 'Berkshire Hathaway Inc.',
    cik: '0001067983',
    aumFormatted: '$279.4 mld',
    filingDate: '2026-08-14',
    periodEnded: '2026-06-30',
    topHoldingsCount: 41,
    description: 'Najsłynniejszy inwestor wartościowy wszech czasów. Filozofia długoterminowego posiadania spółek z trwałą przewagą konkurencyjną („moat”).',
    holdings: [
      { ticker: 'AAPL', name: 'Apple Inc.', weightPercent: 28.5, shares: 300000000, valueUsd: 79600000000, changeType: 'reduced', changeSharesPercent: -25, sector: 'Technologia' },
      { ticker: 'AXP', name: 'American Express Co.', weightPercent: 14.8, shares: 151610700, valueUsd: 41300000000, changeType: 'unchanged', sector: 'Finanse' },
      { ticker: 'BAC', name: 'Bank of America Corp.', weightPercent: 11.2, shares: 766000000, valueUsd: 31200000000, changeType: 'reduced', changeSharesPercent: -12, sector: 'Finanse' },
      { ticker: 'KO', name: 'The Coca-Cola Company', weightPercent: 9.1, shares: 400000000, valueUsd: 25400000000, changeType: 'unchanged', sector: 'Dobra konsumpcyjne' },
      { ticker: 'CVX', name: 'Chevron Corporation', weightPercent: 6.4, shares: 118600000, valueUsd: 17800000000, changeType: 'unchanged', sector: 'Energetyka' },
      { ticker: 'OXY', name: 'Occidental Petroleum Corp.', weightPercent: 5.8, shares: 255281526, valueUsd: 16100000000, changeType: 'increased', changeSharesPercent: 4.2, sector: 'Energetyka' },
      { ticker: 'KHC', name: 'The Kraft Heinz Company', weightPercent: 3.7, shares: 325634818, valueUsd: 10400000000, changeType: 'unchanged', sector: 'Dobra konsumpcyjne' },
      { ticker: 'MCO', name: "Moody's Corporation", weightPercent: 3.5, shares: 24669778, valueUsd: 9800000000, changeType: 'unchanged', sector: 'Finanse' },
      { ticker: 'CB', name: 'Chubb Limited', weightPercent: 2.8, shares: 27033784, valueUsd: 7800000000, changeType: 'increased', changeSharesPercent: 4.1, sector: 'Finanse / Ubezpieczenia' },
    ],
    sectorBreakdown: [
      { sector: 'Technologia', percent: 28.5 },
      { sector: 'Finanse', percent: 32.3 },
      { sector: 'Dobra konsumpcyjne', percent: 12.8 },
      { sector: 'Energetyka', percent: 12.2 },
      { sector: 'Inne', percent: 14.2 },
    ],
  },
  {
    id: 'michael-burry',
    name: 'Michael Burry',
    fundName: 'Scion Asset Management, LLC',
    cik: '0001649339',
    aumFormatted: '$128.5 mln',
    filingDate: '2026-08-14',
    periodEnded: '2026-06-30',
    topHoldingsCount: 16,
    description: 'Bohater książki i filmu „The Big Short”. Legendarny inwestor kontrariański, słynący z przewidywania pęknięć baniek i głębokiego value.',
    holdings: [
      { ticker: 'BABA', name: 'Alibaba Group Holding', weightPercent: 16.5, shares: 200000, valueUsd: 21200000, changeType: 'increased', changeSharesPercent: 25, sector: 'Technologia / E-commerce' },
      { ticker: 'JD', name: 'JD.com Inc.', weightPercent: 14.2, shares: 500000, valueUsd: 18200000, changeType: 'increased', changeSharesPercent: 33, sector: 'Technologia / E-commerce' },
      { ticker: 'BIDU', name: 'Baidu, Inc.', weightPercent: 10.8, shares: 150000, valueUsd: 13900000, changeType: 'new', sector: 'Technologia / AI' },
      { ticker: 'SQ', name: 'Block, Inc.', weightPercent: 8.4, shares: 120000, valueUsd: 10800000, changeType: 'new', sector: 'FinTech' },
      { ticker: 'BMY', name: 'Bristol-Myers Squibb', weightPercent: 7.2, shares: 180000, valueUsd: 9200000, changeType: 'increased', changeSharesPercent: 20, sector: 'Ochrona zdrowia' },
      { ticker: 'CBPX', name: 'Continental Building Products', weightPercent: 5.5, shares: 110000, valueUsd: 7100000, changeType: 'unchanged', sector: 'Przemysł' },
    ],
    sectorBreakdown: [
      { sector: 'E-commerce & Tech (Chiny)', percent: 41.5 },
      { sector: 'FinTech', percent: 8.4 },
      { sector: 'Ochrona zdrowia', percent: 7.2 },
      { sector: 'Inne', percent: 42.9 },
    ],
  },
  {
    id: 'bill-ackman',
    name: 'Bill Ackman',
    fundName: 'Pershing Square Capital Management',
    cik: '0001336528',
    aumFormatted: '$10.4 mld',
    filingDate: '2026-08-14',
    periodEnded: '2026-06-30',
    topHoldingsCount: 8,
    description: 'Inwestor aktywistyczny prowadzący silnie skoncentrowany portfel 8-10 wspaniałych spółek generujących przewidywalne przepływy pieniężne.',
    holdings: [
      { ticker: 'HLT', name: 'Hilton Worldwide Holdings Inc.', weightPercent: 18.2, shares: 8900000, valueUsd: 1890000000, changeType: 'unchanged', sector: 'Hotelarstwo' },
      { ticker: 'CMG', name: 'Chipotle Mexican Grill Inc.', weightPercent: 16.8, shares: 28500000, valueUsd: 1750000000, changeType: 'reduced', changeSharesPercent: -5, sector: 'Restauracje' },
      { ticker: 'QSR', name: 'Restaurant Brands International', weightPercent: 15.4, shares: 23200000, valueUsd: 1600000000, changeType: 'unchanged', sector: 'Restauracje' },
      { ticker: 'GOOGL', name: 'Alphabet Inc. Class A & C', weightPercent: 14.1, shares: 9800000, valueUsd: 1470000000, changeType: 'unchanged', sector: 'Technologia' },
      { ticker: 'CP', name: 'Canadian Pacific Kansas City', weightPercent: 12.3, shares: 14900000, valueUsd: 1280000000, changeType: 'unchanged', sector: 'Kolej / Transport' },
      { ticker: 'NKE', name: 'Nike, Inc.', weightPercent: 8.5, shares: 10500000, valueUsd: 880000000, changeType: 'new', sector: 'Dobra konsumpcyjne' },
      { ticker: 'UMG', name: 'Universal Music Group', weightPercent: 7.9, shares: 32000000, valueUsd: 820000000, changeType: 'unchanged', sector: 'Rozrywka' },
    ],
    sectorBreakdown: [
      { sector: 'Restauracje & Hotele', percent: 50.4 },
      { sector: 'Technologia', percent: 14.1 },
      { sector: 'Transport', percent: 12.3 },
      { sector: 'Dobra konsumpcyjne', percent: 8.5 },
      { sector: 'Rozrywka', percent: 7.9 },
    ],
  },
  {
    id: 'stanley-druckenmiller',
    name: 'Stanley Druckenmiller',
    fundName: 'Duquesne Family Office LLC',
    cik: '0001536411',
    aumFormatted: '$3.7 mld',
    filingDate: '2026-08-14',
    periodEnded: '2026-06-30',
    topHoldingsCount: 54,
    description: 'Uczeń George’a Sorosa, który przez 30 lat nie zanotował ani jednego ujemnego roku. Genialny makroinwestor łączący rynki stóp, walut i akcji technologicznych.',
    holdings: [
      { ticker: 'COHR', name: 'Coherent Corp.', weightPercent: 12.4, shares: 5100000, valueUsd: 460000000, changeType: 'increased', changeSharesPercent: 32, sector: 'Technologia / Optyka AI' },
      { ticker: 'MSFT', name: 'Microsoft Corporation', weightPercent: 11.2, shares: 920000, valueUsd: 415000000, changeType: 'unchanged', sector: 'Technologia' },
      { ticker: 'NVDA', name: 'NVIDIA Corporation', weightPercent: 8.8, shares: 2800000, valueUsd: 325000000, changeType: 'reduced', changeSharesPercent: -45, sector: 'Półprzewodniki' },
      { ticker: 'SE', name: 'Sea Limited', weightPercent: 7.5, shares: 4200000, valueUsd: 278000000, changeType: 'new', sector: 'E-commerce / Azja' },
      { ticker: 'LLY', name: 'Eli Lilly and Company', weightPercent: 6.2, shares: 250000, valueUsd: 230000000, changeType: 'reduced', changeSharesPercent: -15, sector: 'Farmacja' },
      { ticker: 'VIST', name: 'Vista Energy', weightPercent: 5.1, shares: 3800000, valueUsd: 190000000, changeType: 'increased', changeSharesPercent: 12, sector: 'Energetyka' },
    ],
    sectorBreakdown: [
      { sector: 'Technologia & Półprzewodniki', percent: 45.2 },
      { sector: 'Ochrona zdrowia', percent: 14.5 },
      { sector: 'Energetyka & Surowce', percent: 12.8 },
      { sector: 'Konsumpcja & Inne', percent: 27.5 },
    ],
  },
  {
    id: 'ray-dalio',
    name: 'Ray Dalio',
    fundName: 'Bridgewater Associates, LP',
    cik: '0001350694',
    aumFormatted: '$18.9 mld',
    filingDate: '2026-08-14',
    periodEnded: '2026-06-30',
    topHoldingsCount: 680,
    description: 'Twórca największego funduszu hedgingowego świata (Bridgewater). Architekt strategii All Weather (Risk Parity) opartej na globalnych cyklach długu.',
    holdings: [
      { ticker: 'IVV', name: 'iShares Core S&P 500 ETF', weightPercent: 6.8, shares: 2400000, valueUsd: 1280000000, changeType: 'increased', changeSharesPercent: 5, sector: 'Indeksy' },
      { ticker: 'IEMG', name: 'iShares Core MSCI EM ETF', weightPercent: 5.4, shares: 18500000, valueUsd: 1020000000, changeType: 'unchanged', sector: 'Rynki wschodzące' },
      { ticker: 'GOOGL', name: 'Alphabet Inc.', weightPercent: 4.8, shares: 5100000, valueUsd: 910000000, changeType: 'increased', changeSharesPercent: 14, sector: 'Technologia' },
      { ticker: 'NVDA', name: 'NVIDIA Corporation', weightPercent: 4.2, shares: 6500000, valueUsd: 790000000, changeType: 'unchanged', sector: 'Półprzewodniki' },
      { ticker: 'META', name: 'Meta Platforms, Inc.', weightPercent: 3.9, shares: 1450000, valueUsd: 735000000, changeType: 'new', sector: 'Technologia' },
      { ticker: 'PG', name: 'Procter & Gamble Co.', weightPercent: 3.5, shares: 4100000, valueUsd: 660000000, changeType: 'reduced', changeSharesPercent: -8, sector: 'Dobra konsumpcyjne' },
    ],
    sectorBreakdown: [
      { sector: 'Fundusze ETF (Makro)', percent: 35.0 },
      { sector: 'Technologia', percent: 24.2 },
      { sector: 'Dobra konsumpcyjne', percent: 18.5 },
      { sector: 'Ochrona zdrowia', percent: 12.1 },
      { sector: 'Inne', percent: 10.2 },
    ],
  },
];
