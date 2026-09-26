/**
 * Typy rejestru krótkiej sprzedaży KNF. Liczby pochodzą z publicznego widoku,
 * nie z lokalnej próbki.
 */

interface KnfShortPosition {
  id: string;
  ticker: string;
  companyName: string;
  holderName: string;
  shortPercent: number;
  positionDate: string;
  previousPercent?: number;
}

export interface CompanyShortSummary {
  ticker: string;
  companyName: string;
  totalShortPercent: number;
  fundsCount: number;
  netChange14d: number | null;
  positions: KnfShortPosition[];
}
