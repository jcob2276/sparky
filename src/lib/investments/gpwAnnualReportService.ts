import { orcaSelect } from './superinvestorsApi';

export interface GpwAnnualReport {
  reportingScope?: 'consolidated' | 'standalone';
  isin: string;
  periodStart: string;
  periodEnd: string;
  publicationDate: string;
  currency: string;
  sourceUrl: string;
  revenue: number | null;
  netProfit: number | null;
  assets: number | null;
  equity: number | null;
  operatingCashFlow: number | null;
  freeCashFlow: number | null;
}

export function parseAnnualReport(value: unknown): GpwAnnualReport | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  if (raw.reporting_scope != null && !['consolidated', 'standalone'].includes(String(raw.reporting_scope))) return null;
  const dates = [raw.period_start, raw.period_end, raw.publication_date];
  if (dates.some(date => typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)
    || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date)
    || String(raw.period_start) >= String(raw.period_end)
    || String(raw.publication_date) < String(raw.period_end)
    || typeof raw.isin !== 'string' || typeof raw.currency !== 'string' || !/^[A-Z]{3}$/.test(raw.currency)) return null;
  let source: URL;
  try { source = new URL(String(raw.source_url)); } catch { return null; }
  if (source.protocol !== 'https:' || source.username || source.password) return null;
  const metrics = raw.metrics as Record<string, { value?: unknown } | null> | undefined;
  const fact = (key: string): number | null => {
    const value = metrics?.[key]?.value;
    if (typeof value !== 'string' || !/^-?\d+(?:\.\d+)?$/.test(value)) return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  };
  const cfo = fact('operating_cash_flow');
  const ppe = fact('ppe_purchases');
  const intangible = fact('intangible_purchases');
  return { isin: raw.isin, reportingScope: raw.reporting_scope === 'standalone' ? 'standalone' : 'consolidated',
    periodStart: String(raw.period_start), periodEnd: String(raw.period_end),
    publicationDate: String(raw.publication_date), currency: raw.currency, sourceUrl: source.href,
    revenue: fact('revenue'), netProfit: fact('net_profit'), assets: fact('assets'), equity: fact('equity'),
    operatingCashFlow: cfo, freeCashFlow: cfo != null && ppe != null && ppe >= 0 && intangible != null && intangible >= 0
      ? cfo - ppe - intangible : null };
}

export async function fetchGpwAnnualReports(): Promise<Map<string, GpwAnnualReport>> {
  const rows = await orcaSelect<unknown>('gpw_latest_annual_reports?select=isin,reporting_scope,period_start,period_end,publication_date,currency,metrics,source_url', { strict: true });
  return new Map(rows.flatMap(raw => {
    const report = parseAnnualReport(raw);
    return report ? [[report.isin, report] as const] : [];
  }));
}
