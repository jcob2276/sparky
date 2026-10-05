import type { GpwCompanyFundamental } from './gpwFundamentalsService';

export interface GpwPresetFilters {
  peBelowMedian: boolean;
  divYieldAbove4: boolean;
  revenueYoyAbove15: boolean;
  roeAbove15: boolean;
  fcfYieldAbove5: boolean;
  debtToEbitdaAbove3: boolean;
  forwardPeBelowPe: boolean;
}

export const DEFAULT_GPW_PRESETS: GpwPresetFilters = {
  peBelowMedian: false, divYieldAbove4: false, revenueYoyAbove15: false,
  roeAbove15: false, fcfYieldAbove5: false, debtToEbitdaAbove3: false,
  forwardPeBelowPe: false,
};

export function filterGpwFundamentals(
  companies: GpwCompanyFundamental[], search: string, sector: string,
  marketCapFilter: string, presets: GpwPresetFilters, sortBy: string,
  sectorMedians: Map<string, number>,
): GpwCompanyFundamental[] {
  const query = search.trim().toLowerCase();
  const result = companies.filter((c) => {
    if (query && !c.ticker.toLowerCase().includes(query) && !c.name.toLowerCase().includes(query)) return false;
    if (sector !== 'all' && c.sectorPl !== sector) return false;
    if (marketCapFilter === 'large' && (c.mcapMld == null || c.mcapMld < 10)) return false;
    if (marketCapFilter === 'mid' && (c.mcapMld == null || c.mcapMld < 1 || c.mcapMld >= 10)) return false;
    if (marketCapFilter === 'small' && (c.mcapMld == null || c.mcapMld >= 1)) return false;
    const median = sectorMedians.get(c.sectorPl);
    if (presets.peBelowMedian && (c.pe == null || c.pe <= 0 || median == null || c.pe >= median)) return false;
    if (presets.divYieldAbove4 && (c.divYieldPct == null || c.divYieldPct <= 4)) return false;
    if (presets.revenueYoyAbove15 && (c.revenueYoyPct == null || c.revenueYoyPct <= 15)) return false;
    if (presets.roeAbove15 && (c.roePct == null || c.roePct <= 15)) return false;
    if (presets.fcfYieldAbove5 && (c.fcfYieldPct == null || c.fcfYieldPct <= 5)) return false;
    if (presets.debtToEbitdaAbove3 && (c.debtToEbitda == null || c.debtToEbitda <= 3)) return false;
    if (presets.forwardPeBelowPe && (c.pe == null || c.pe <= 0 || c.forwardPe == null || c.forwardPe <= 0 || c.forwardPe >= c.pe)) return false;
    return true;
  });
  const sortFields: Record<string, keyof GpwCompanyFundamental> = {
    mcap_desc: 'mcapMld', mcap_asc: 'mcapMld', pe_asc: 'pe', pe_desc: 'pe',
    div_desc: 'divYieldPct', roe_desc: 'roePct', rev_desc: 'revenueYoyPct', margin_desc: 'netMarginPct',
  };
  const field = sortFields[sortBy] ?? 'mcapMld';
  const direction = sortBy.endsWith('_asc') ? 1 : -1;
  return result.sort((a, b) => {
    const x = a[field]; const y = b[field];
    if (x == null && y == null) return a.ticker.localeCompare(b.ticker);
    if (x == null) return 1;
    if (y == null) return -1;
    return (Number(x) - Number(y)) * direction || a.ticker.localeCompare(b.ticker);
  });
}
