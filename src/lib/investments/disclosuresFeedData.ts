export interface DisclosureStreamItem {
  id: string;
  dateLabel: string;
  sourceType: 'FORM 4' | 'KNF' | 'STOCK';
  ticker: string;
  description: string;
  amountOrPercent: string;
  sentiment?: 'buy' | 'sell' | 'neutral';
}

export const DISCLOSURE_STREAM_ITEMS: DisclosureStreamItem[] = [
  {
    id: 'disc_1',
    dateLabel: 'DZIŚ',
    sourceType: 'FORM 4',
    ticker: 'CUEN',
    description: 'Zgłoszenie Form 4: kupno akcji własnych przez insidera',
    amountOrPercent: '—',
    sentiment: 'buy',
  },
  {
    id: 'disc_2',
    dateLabel: 'DZIŚ',
    sourceType: 'FORM 4',
    ticker: 'AFL',
    description: 'Zgłoszenie Form 4: sprzedaż akcji własnych',
    amountOrPercent: '—',
    sentiment: 'sell',
  },
  {
    id: 'disc_3',
    dateLabel: 'DZIŚ',
    sourceType: 'FORM 4',
    ticker: 'RGCO',
    description: 'Zgłoszenie Form 4: kupno akcji własnych przez zarząd',
    amountOrPercent: '—',
    sentiment: 'buy',
  },
  {
    id: 'disc_4',
    dateLabel: 'DZIŚ',
    sourceType: 'FORM 4',
    ticker: 'SMWB',
    description: 'Zgłoszenie Form 4: planowa sprzedaż akcji',
    amountOrPercent: '—',
    sentiment: 'sell',
  },
  {
    id: 'disc_5',
    dateLabel: '23 WRZ',
    sourceType: 'KNF',
    ticker: 'JSW',
    description: 'Pozycje krótkie -0,13 p.p., wyjście części QUBE RESEARCH & TECHNOLOGIES LIMITED',
    amountOrPercent: '5,73%',
    sentiment: 'buy',
  },
  {
    id: 'disc_6',
    dateLabel: '23 WRZ',
    sourceType: 'KNF',
    ticker: 'ALE',
    description: 'Pozycje krótkie -0,07 p.p., wyjście części QUBE RESEARCH & TECHNOLOGIES LIMITED',
    amountOrPercent: '3,28%',
    sentiment: 'buy',
  },
  {
    id: 'disc_7',
    dateLabel: '22 WRZ',
    sourceType: 'STOCK',
    ticker: 'AVGO',
    description: 'Richard W. Allen (Kongres), kupno akcji Broadcom (transakcja 12 sie)',
    amountOrPercent: '1–15K USD',
    sentiment: 'buy',
  },
  {
    id: 'disc_8',
    dateLabel: '22 WRZ',
    sourceType: 'STOCK',
    ticker: 'GOOGL',
    description: 'Sheri Biggs (Kongres), kupno Alphabet Inc. (transakcja 1 wrz)',
    amountOrPercent: '500K–1M USD',
    sentiment: 'buy',
  },
  {
    id: 'disc_9',
    dateLabel: '22 WRZ',
    sourceType: 'STOCK',
    ticker: 'NVDA',
    description: 'Sheri Biggs (Kongres), sprzedaż części pozycji (transakcja 19 sie)',
    amountOrPercent: '500K–1M USD',
    sentiment: 'sell',
  },
  {
    id: 'disc_10',
    dateLabel: '22 WRZ',
    sourceType: 'STOCK',
    ticker: 'MSFT',
    description: 'Sheri Biggs (Kongres), kupno Microsoft Corp. (transakcja 28 sie)',
    amountOrPercent: '1–15K USD',
    sentiment: 'buy',
  },
  {
    id: 'disc_11',
    dateLabel: '21 WRZ',
    sourceType: 'KNF',
    ticker: 'KRU',
    description: 'Pozycje krótkie +0,08 p.p., zwiększenie pozycji TWO SIGMA INVESTMENTS, LP',
    amountOrPercent: '0,60%',
    sentiment: 'sell',
  },
  {
    id: 'disc_12',
    dateLabel: '18 WRZ',
    sourceType: 'KNF',
    ticker: 'MDV',
    description: 'Pozycje krótkie -0,11 p.p., wyjście części TAGES CAPITAL LLP',
    amountOrPercent: '6,01%',
    sentiment: 'buy',
  },
];
