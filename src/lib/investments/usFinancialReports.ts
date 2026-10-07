import { orcaSelect } from './superinvestorsApi';

export interface UsFinancialReport {
  accession: string;
  form: string;
  periodStart: string;
  periodEnd: string;
  publicationDate: string;
  currency: string;
  sourceUrl: string;
  metrics: Record<string, number>;
}

export function parseUsFinancialReport(value: unknown): UsFinancialReport | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  const dates = [raw.period_start, raw.period_end, raw.publication_date];
  if (dates.some(date => typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)
    || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date)
    || String(raw.period_start) >= String(raw.period_end) || String(raw.publication_date) < String(raw.period_end)
    || typeof raw.currency !== 'string' || !/^[A-Z]{3}$/.test(raw.currency)
    || typeof raw.accession !== 'string' || !/^\d{10}-\d{2}-\d{6}$/.test(raw.accession)
    || typeof raw.form_type !== 'string' || !/^(10-K|10-Q|20-F|40-F)(\/A)?$/.test(raw.form_type)) return null;
  const cik = Number(raw.cik);
  if (!Number.isSafeInteger(cik) || cik <= 0) return null;
  let source: URL;
  try { source = new URL(String(raw.source_url)); } catch { return null; }
  const prefix = `/Archives/edgar/data/${cik}/${raw.accession.replace(/-/g, '')}/`;
  if (source.protocol !== 'https:' || source.hostname !== 'www.sec.gov' || source.username || source.password
    || !source.pathname.startsWith(prefix) || source.search || source.hash) return null;
  const metrics: Record<string, number> = {};
  if (raw.metrics && typeof raw.metrics === 'object') {
    for (const [key, metric] of Object.entries(raw.metrics)) {
      if (!metric || typeof metric !== 'object') continue;
      const amount: unknown = (metric as Record<string, unknown>).value;
      if (typeof amount !== 'string' || !/^-?\d+(?:\.\d+)?$/.test(amount)) continue;
      const number = Number(amount);
      if (Number.isFinite(number)) metrics[key] = number;
    }
  }
  return { accession: raw.accession, form: raw.form_type, periodStart: String(raw.period_start),
    periodEnd: String(raw.period_end), publicationDate: String(raw.publication_date), currency: raw.currency,
    sourceUrl: source.href, metrics };
}

export async function fetchUsFinancialReports(ticker: string): Promise<UsFinancialReport[]> {
  const rows = await orcaSelect<unknown>(`us_company_financial_reports?ticker=eq.${encodeURIComponent(ticker)}&order=period_end.desc,publication_date.desc&limit=16`, { strict: true });
  return rows.flatMap(row => {
    const report = parseUsFinancialReport(row);
    return report ? [report] : [];
  });
}
