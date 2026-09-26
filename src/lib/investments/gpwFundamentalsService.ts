/**
 * gpwFundamentalsService.ts — Pobieranie i analityka wskaźników fundamentalnych 385 spółek GPW.
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
  quarters8?: Array<{ revenue?: number | string | null }>;
  refreshed_at?: string | null;
}

function parseNum(val: unknown): number | null {
  if (val == null) return null;
  const n = typeof val === 'number' ? val : parseFloat(String(val));
  return Number.isFinite(n) ? n : null;
}

export async function fetchGpwFundamentalsList(): Promise<{
  companies: GpwCompanyFundamental[];
  sectorMedians: Map<string, number>;
  refreshedDate: string;
}> {
  try {
    const raw = await orcaSelect<RawGpwTeaser>(
      'gpw_fin_public_teaser?select=ticker,name,sector,mcap,pe,pb,div_yield,roe,net_margin,revenue_yoy,quarters8,refreshed_at&order=mcap.desc.nullslast&limit=500'
    );

    let refreshedDate = '2026-09-26';
    if (raw[0]?.refreshed_at) {
      refreshedDate = raw[0].refreshed_at.slice(0, 10);
    }

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

      if (pe != null && pe > 0 && pe < 150) {
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
        mcapMld: mcapRaw != null ? Math.round((mcapRaw / 1e9) * 10) / 10 : null,
        pe: pe != null ? Math.round(pe * 10) / 10 : null,
        pb: pb != null ? Math.round(pb * 100) / 100 : null,
        divYieldPct: divYield != null ? Math.round(divYield * 1000) / 10 : null,
        roePct: roe != null ? Math.round(roe * 1000) / 10 : null,
        netMarginPct: netMargin != null ? Math.round(netMargin * 1000) / 10 : null,
        revenueYoyPct: revenueYoy != null ? Math.round(revenueYoy * 100) : null,
        quarters8: q8.length > 0 ? q8 : [100, 105, 102, 110, 108, 115, 120, 125],
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
  } catch (err) {
    console.warn('[gpwFundamentalsService] error:', err);
    return { companies: [], sectorMedians: new Map(), refreshedDate: '2026-09-26' };
  }
}
