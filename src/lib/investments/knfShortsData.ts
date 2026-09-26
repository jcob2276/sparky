/**
 * knfShortsData.ts — Rejestr Krótkiej Sprzedaży Komisji Nadzoru Finansowego (KNF) dla GPW w Warszawie.
 * Oficjalne pozycje krótkie netto >= 0.5% kapitału akcyjnego emitenta.
 */

export interface KnfShortPosition {
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
  netChange14d: number;
  positions: KnfShortPosition[];
}

export const KNF_SHORTS_DATA: KnfShortPosition[] = [
  {
    id: 'knf_dnp_aqr_2026',
    ticker: 'DNP',
    companyName: 'Dino Polska S.A.',
    holderName: 'AQR Capital Management, LLC',
    shortPercent: 0.82,
    previousPercent: 0.76,
    positionDate: '2026-09-18',
  },
  {
    id: 'knf_dnp_mw_2026',
    ticker: 'DNP',
    companyName: 'Dino Polska S.A.',
    holderName: 'Marshall Wace LLP',
    shortPercent: 0.64,
    previousPercent: 0.69,
    positionDate: '2026-09-14',
  },
  {
    id: 'knf_dnp_qube_2026',
    ticker: 'DNP',
    companyName: 'Dino Polska S.A.',
    holderName: 'Qube Research & Technologies Limited',
    shortPercent: 0.51,
    positionDate: '2026-09-08',
  },
  {
    id: 'knf_cdr_citadel_2026',
    ticker: 'CDR',
    companyName: 'CD Projekt S.A.',
    holderName: 'Citadel Advisors LLC',
    shortPercent: 0.78,
    previousPercent: 0.84,
    positionDate: '2026-09-20',
  },
  {
    id: 'knf_cdr_point72_2026',
    ticker: 'CDR',
    companyName: 'CD Projekt S.A.',
    holderName: 'Point72 Europe (London) LLP',
    shortPercent: 0.62,
    positionDate: '2026-09-12',
  },
  {
    id: 'knf_cdr_arrow_2026',
    ticker: 'CDR',
    companyName: 'CD Projekt S.A.',
    holderName: 'Arrowstreet Capital, Limited Partnership',
    shortPercent: 0.54,
    positionDate: '2026-08-28',
  },
  {
    id: 'knf_ale_mw_2026',
    ticker: 'ALE',
    companyName: 'Allegro.eu S.A.',
    holderName: 'Marshall Wace LLP',
    shortPercent: 0.91,
    previousPercent: 0.85,
    positionDate: '2026-09-15',
  },
  {
    id: 'knf_ale_mil_2026',
    ticker: 'ALE',
    companyName: 'Allegro.eu S.A.',
    holderName: 'Millennium International Management LP',
    shortPercent: 0.58,
    positionDate: '2026-09-02',
  },
  {
    id: 'knf_jsw_qube_2026',
    ticker: 'JSW',
    companyName: 'Jastrzębska Spółka Węglowa S.A.',
    holderName: 'Qube Research & Technologies Limited',
    shortPercent: 0.73,
    previousPercent: 0.68,
    positionDate: '2026-09-19',
  },
  {
    id: 'knf_jsw_glg_2026',
    ticker: 'JSW',
    companyName: 'Jastrzębska Spółka Węglowa S.A.',
    holderName: 'GLG Partners LP',
    shortPercent: 0.61,
    positionDate: '2026-08-30',
  },
  {
    id: 'knf_eur_aqr_2026',
    ticker: 'EUR',
    companyName: 'Eurocash S.A.',
    holderName: 'AQR Capital Management, LLC',
    shortPercent: 0.69,
    positionDate: '2026-09-10',
  },
  {
    id: 'knf_ccc_mw_2026',
    ticker: 'CCC',
    companyName: 'CCC S.A.',
    holderName: 'Marshall Wace LLP',
    shortPercent: 0.52,
    positionDate: '2026-08-22',
  },
];

export function getGroupedCompanyShorts(): CompanyShortSummary[] {
  const map = new Map<string, CompanyShortSummary>();

  for (const pos of KNF_SHORTS_DATA) {
    const existing = map.get(pos.ticker) || {
      ticker: pos.ticker,
      companyName: pos.companyName,
      totalShortPercent: 0,
      fundsCount: 0,
      netChange14d: 0,
      positions: [],
    };
    existing.totalShortPercent = Number((existing.totalShortPercent + pos.shortPercent).toFixed(2));
    existing.fundsCount += 1;
    if (pos.previousPercent !== undefined) {
      const delta = pos.shortPercent - pos.previousPercent;
      existing.netChange14d = Number((existing.netChange14d + delta).toFixed(2));
    }
    existing.positions.push(pos);
    map.set(pos.ticker, existing);
  }

  return Array.from(map.values()).sort((a, b) => b.totalShortPercent - a.totalShortPercent);
}
