/**
 * gpwFundamentalsService.ts — Rzeczywiste wskaźniki fundamentalne spółek GPW.
 * Wszystkie filtry i wskaźniki w 100% odblokowane (bez etykiet i ograniczeń „Pro”).
 */

import { orcaSelect } from './superinvestorsApi';

export interface GpwCompanyFundamental {
  ticker: string;
  name: string;
  sector: string;
  sectorPl: string;
  mcapMld: number | null;
  pe: number | null;
  pb: number | null;
  divYieldPct: number | null;
  roePct: number | null;
  netMarginPct: number | null;
  revenueYoyPct: number | null;
  fcfYieldPct: number | null;
  debtToEbitda: number | null;
  forwardPe: number | null;
  forwardEps?: number | null;
  forwardPeBasis?: 'provider_fy' | 'rolling_fy' | null;
  quotePrice?: number | null;
  quoteCurrency?: string | null;
  financialCurrency?: string | null;
  quarters8: number[];
  refreshedAt: string;
}

const GPW_SECTORS_PL: Record<string, string> = {
  'Energy Minerals': 'Paliwa',
  Finance: 'Finanse',
  'Non-Energy Minerals': 'Surowce',
  'Electronic Technology': 'Technologia',
  'Technology Services': 'Technologia',
  'Process Industries': 'Przemysł chemiczny',
  'Producer Manufacturing': 'Produkcja przemysłowa',
  'Consumer Non-Durables': 'Dobra konsumpcyjne',
  'Consumer Durables': 'Dobra trwałe',
  'Retail Trade': 'Handel detaliczny',
  'Health Technology': 'Ochrona zdrowia',
  'Health Services': 'Ochrona zdrowia',
  Utilities: 'Energetyka',
  Transportation: 'Transport',
  Communications: 'Telekomunikacja',
  'Commercial Services': 'Usługi',
  'Distribution Services': 'Dystrybucja',
  'Consumer Services': 'Usługi konsumenckie',
  'Industrial Services': 'Usługi przemysłowe',
};

function getSectorPl(sectorRaw?: string | null): string {
  if (!sectorRaw) return 'Inne';
  return GPW_SECTORS_PL[sectorRaw] || sectorRaw;
}

interface RawGpwTeaser {
  ticker?: string;
  name?: string;
  sector?: string;
  mcap?: number | string | null;
  pe?: number | string | null;
  pb?: number | string | null;
  div_yield?: number | string | null;
  roe?: number | string | null;
  net_margin?: number | string | null;
  revenue_yoy?: number | string | null;
  fcf_yield?: number | string | null;
  net_debt_ebitda?: number | string | null;
  forward_pe?: number | string | null;
  forward_eps?: number | string | null;
  forward_pe_basis?: string | null;
  quote_price?: number | string | null;
  quote_currency?: string | null;
  financial_currency?: string | null;
  quarters8?: Array<{ revenue?: number | string | null }>;
  refreshed_at?: string | null;
}

function parseNum(val: unknown): number | null {
  if (typeof val !== 'number' && typeof val !== 'string') return null;
  if (typeof val === 'string' && !val.trim()) return null;
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
}

export async function fetchGpwFundamentalsList(): Promise<{
  companies: GpwCompanyFundamental[];
  sectorMedians: Map<string, number>;
  refreshedDate: string | null;
}> {
  const raw = await orcaSelect<RawGpwTeaser>(
    'gpw_fin_public_teaser?select=ticker,name,sector,mcap,pe,pb,div_yield,roe,net_margin,revenue_yoy,fcf_yield,net_debt_ebitda,forward_pe,forward_eps,forward_pe_basis,quote_price,quote_currency,financial_currency,quarters8,refreshed_at&order=mcap.desc.nullslast',
    { strict: true },
  );

  // Oldest row determines freshness of the complete list, not the largest company.
  const dates = raw.map((r) => r.refreshed_at?.slice(0, 10)).filter((d): d is string => Boolean(d));
  const refreshedDate = dates.length === raw.length && dates.length ? dates.sort()[0] : null;

  const sectorValues = new Map<string, number[]>();

  const companies: GpwCompanyFundamental[] = raw.flatMap((r) => {
    if (!r.ticker) return [];

    const mcapRaw = parseNum(r.mcap);
    const pe = parseNum(r.pe);
    const pb = parseNum(r.pb);
    const divYield = parseNum(r.div_yield);
    const roe = parseNum(r.roe);
    const netMargin = parseNum(r.net_margin);
    const revenueYoy = parseNum(r.revenue_yoy);

    const sector = r.sector || '';
    const sectorPl = getSectorPl(sector);

    if (pe != null && pe > 0) {
      const list = sectorValues.get(sectorPl) || [];
      list.push(pe);
      sectorValues.set(sectorPl, list);
    }

    const q8 = Array.isArray(r.quarters8)
      ? r.quarters8.map((q) => parseNum(q?.revenue)).filter((v): v is number => v != null)
      : [];

    return [{
      ticker: r.ticker,
      name: r.name || r.ticker,
      sector,
      sectorPl,
      mcapMld: mcapRaw != null ? mcapRaw / 1e9 : null,
      pe,
      pb,
      divYieldPct: divYield != null ? divYield * 100 : null,
      roePct: roe != null ? roe * 100 : null,
      netMarginPct: netMargin != null ? netMargin * 100 : null,
      revenueYoyPct: revenueYoy != null ? revenueYoy * 100 : null,
      fcfYieldPct: parseNum(r.fcf_yield) != null ? Number(r.fcf_yield) * 100 : null,
      debtToEbitda: parseNum(r.net_debt_ebitda),
      forwardPe: parseNum(r.forward_pe),
      forwardEps: parseNum(r.forward_eps),
      forwardPeBasis: r.forward_pe_basis === 'provider_fy' || r.forward_pe_basis === 'rolling_fy' ? r.forward_pe_basis : null,
      quotePrice: parseNum(r.quote_price),
      quoteCurrency: r.quote_currency || null,
      financialCurrency: r.financial_currency || null,
      quarters8: q8,
      refreshedAt: r.refreshed_at || '',
    }];
  });

  // Oblicz mediany C/Z dla każdego sektora
  const sectorMedians = new Map<string, number>();
  sectorValues.forEach((vals, sec) => {
    vals.sort((a, b) => a - b);
    const mid = Math.floor(vals.length / 2);
    const med = vals.length % 2 !== 0 ? vals[mid] : (vals[mid - 1] + vals[mid]) / 2;
    sectorMedians.set(sec, med);
  });

  return { companies, sectorMedians, refreshedDate };
}
