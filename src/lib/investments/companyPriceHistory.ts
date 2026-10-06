import { getTodayWarsaw, shiftDateStr } from '../date';

export interface CompanyPriceRow {
  date?: string; close_raw?: number; close_adj?: number;
  currency?: string; source_url?: string;
  open?: number; high?: number; low?: number; volume?: number;
}

export function summarizeCompanyPrices(rows: CompanyPriceRow[], today = getTodayWarsaw()) {
  const valid = rows.filter(row => row.date && /^\d{4}-\d{2}-\d{2}$/.test(row.date)
    && Number.isFinite(Date.parse(row.date)) && row.date <= today
    && typeof row.close_raw === 'number' && Number.isFinite(row.close_raw) && row.close_raw > 0
    && row.currency && row.source_url).sort((a, b) => a.date!.localeCompare(b.date!));
  const latest = valid.at(-1);
  // Do not connect prices denominated in different currencies.
  const series = valid.filter(row => row.currency === latest?.currency);
  const prices = series.map(row => ({ date: row.date!, close: row.close_raw!,
    open: row.open, high: row.high, low: row.low, volume: row.volume }));
  const previous = series.at(-2);
  const anniversary = latest?.date ? new Date(`${latest.date}T00:00:00Z`) : null;
  if (anniversary) anniversary.setUTCFullYear(anniversary.getUTCFullYear() - 1);
  const baselineDate = anniversary?.toISOString().slice(0, 10);
  const baseline = baselineDate ? series.filter(row => row.date! <= baselineDate
    && row.date! >= shiftDateStr(baselineDate, -7)).at(-1) : null;
  return {
    prices, price: latest?.close_raw ?? null,
    priceCurrency: latest?.currency ?? null, priceDate: latest?.date ?? null,
    priceSourceUrl: latest?.source_url ?? null,
    changeTodayPct: latest?.date === today && previous && previous.date! >= shiftDateStr(today, -7)
      ? ((latest.close_raw! / previous.close_raw!) - 1) * 100 : null,
    change1yPct: latest && baseline ? ((latest.close_raw! / baseline.close_raw!) - 1) * 100 : null,
  };
}
