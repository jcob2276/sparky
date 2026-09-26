import { orcaCount, orcaSelect } from './superinvestorsApi';
import type { InsiderTradeItem } from './investmentsApi';

interface PoliticianEmbed {
  display_name?: string | null;
  chamber?: string | null;
  state?: string | null;
  party?: string | null;
}

interface StockActRaw {
  id?: string | number;
  politician_id?: string | null;
  ticker?: string | null;
  asset_description?: string | null;
  transaction_date?: string | null;
  disclosure_date?: string | null;
  transaction_type?: string | null;
  amount_low?: number | null;
  amount_high?: number | null;
  external_id?: string | null;
  politicians?: PoliticianEmbed | PoliticianEmbed[] | null;
}

const STOCK_ACT_SELECT =
  'id,politician_id,ticker,asset_description,transaction_date,disclosure_date,transaction_type,amount_low,amount_high,external_id,politicians!inner(display_name,chamber,state,party)';

function money(value: number | null): string | null {
  if (value == null || !Number.isFinite(value)) return null;
  return `$${value.toLocaleString('pl-PL')}`;
}

function daysBetween(from: string | null, to: string | null): number | null {
  if (!from || !to) return null;
  const ms = Date.parse(to.slice(0, 10)) - Date.parse(from.slice(0, 10));
  if (!Number.isFinite(ms)) return null;
  return Math.round(ms / 86_400_000);
}

function politicianOf(raw: StockActRaw['politicians']): PoliticianEmbed {
  const row = Array.isArray(raw) ? raw[0] : raw;
  return row ?? {};
}

function mapStockAct(row: StockActRaw): InsiderTradeItem {
  const politician = politicianOf(row.politicians);
  const low = typeof row.amount_low === 'number' ? row.amount_low : null;
  const high = typeof row.amount_high === 'number' ? row.amount_high : null;
  const chamber = politician.chamber ?? null;
  return {
    id: String(row.id ?? `${row.external_id ?? row.ticker ?? 'trade'}-${row.transaction_date ?? ''}`),
    source_id: row.external_id ?? null,
    filer_id: row.politician_id ?? null,
    filer_name: politician.display_name || 'Polityk',
    branch: chamber === 'senate' ? 'senate' : chamber === 'house' ? 'house' : 'congress',
    chamber,
    party: politician.party ?? null,
    state: politician.state ?? null,
    ticker: row.ticker ?? null,
    asset_name: row.asset_description ?? null,
    asset_type: 'stock',
    transaction_type: row.transaction_type || 'unknown',
    amount_low: low,
    amount_high: high,
    amount_label: low != null && high != null ? `${money(low)}–${money(high)}` : money(high) ?? money(low),
    transaction_date: row.transaction_date ?? null,
    filing_date: row.disclosure_date ?? null,
    days_to_file: daysBetween(row.transaction_date ?? null, row.disclosure_date ?? null),
    doc_url: null,
    created_at: row.disclosure_date || row.transaction_date || '',
  };
}

export interface CongressFeed {
  trades: InsiderTradeItem[];
  total: number;
  truncated: boolean;
}

export interface PublicPolitician {
  id: string;
  name: string;
  party: string | null;
  chamber: string | null;
  state: string | null;
}

interface PoliticianRow {
  id?: string | null;
  display_name?: string | null;
  chamber?: string | null;
  state?: string | null;
  party?: string | null;
}

export async function fetchCongressFeed(): Promise<CongressFeed> {
  const query = `stock_act_trades?select=${STOCK_ACT_SELECT}&order=disclosure_date.desc.nullslast`;
  const [rows, total] = await Promise.all([
    orcaSelect<StockActRaw>(query),
    orcaCount('stock_act_trades?select=id'),
  ]);
  return {
    trades: rows.map(mapStockAct),
    total,
    truncated: total > rows.length,
  };
}

export async function fetchPublicPoliticians(): Promise<PublicPolitician[]> {
  const rows = await orcaSelect<PoliticianRow>(
    'politicians?select=id,display_name,chamber,state,party&order=display_name.asc',
  );
  const people: PublicPolitician[] = [];
  for (const row of rows) {
    const name = row.display_name?.trim();
    if (!row.id || !name) continue;
    people.push({
      id: row.id,
      name,
      party: row.party ?? null,
      chamber: row.chamber ?? null,
      state: row.state ?? null,
    });
  }
  return people;
}

export async function fetchPoliticianTrades(politicianId: string): Promise<InsiderTradeItem[]> {
  const rows = await orcaSelect<StockActRaw>(
    `stock_act_trades?select=${STOCK_ACT_SELECT}&politician_id=eq.${encodeURIComponent(politicianId)}&order=disclosure_date.desc.nullslast`,
  );
  return rows.map(mapStockAct);
}

export async function fetchRecentCongress(limit = 12): Promise<InsiderTradeItem[]> {
  const rows = await orcaSelect<StockActRaw>(
    `stock_act_trades?select=${STOCK_ACT_SELECT}&order=disclosure_date.desc.nullslast&limit=${limit}`,
  );
  return rows.map(mapStockAct);
}

interface Form4Raw {
  id?: string | number;
  ticker?: string | null;
  company_name?: string | null;
  transaction_code?: string | null;
  transaction_date?: string | null;
  filing_date?: string | null;
}

function form4Label(code: string | null): string {
  if (code === 'P') return 'purchase';
  if (code === 'S') return 'sale';
  return code || 'form4';
}

export async function fetchForm4Trades(): Promise<InsiderTradeItem[]> {
  const rows = await orcaSelect<Form4Raw>(
    'vw_insider_public?select=id,ticker,company_name,transaction_code,transaction_date,filing_date&order=filing_date.desc.nullslast&limit=1000',
  );
  return rows.map((row) => ({
    id: String(row.id ?? `${row.ticker ?? 'form4'}-${row.filing_date ?? ''}`),
    source_id: null,
    filer_id: null,
    filer_name: row.company_name || 'Form 4',
    branch: 'form4',
    chamber: null,
    party: null,
    state: 'US',
    ticker: row.ticker ?? null,
    asset_name: row.company_name ?? null,
    asset_type: 'form4',
    transaction_type: form4Label(row.transaction_code ?? null),
    amount_low: null,
    amount_high: null,
    amount_label: null,
    transaction_date: row.transaction_date ?? null,
    filing_date: row.filing_date ?? null,
    days_to_file: daysBetween(row.transaction_date ?? null, row.filing_date ?? null),
    doc_url: null,
    created_at: row.filing_date || row.transaction_date || '',
  }));
}

interface GpwRaw {
  id?: string | number;
  company?: string | null;
  ticker?: string | null;
  side?: string | null;
  transaction_date?: string | null;
  report_date?: string | null;
  title?: string | null;
}

export async function fetchGpwInsiderTrades(): Promise<InsiderTradeItem[]> {
  const rows = await orcaSelect<GpwRaw>(
    'vw_gpw_insider_public?select=id,company,ticker,side,transaction_date,report_date,title&order=transaction_date.desc.nullslast',
  );
  return rows.map((row) => ({
    id: String(row.id ?? `${row.ticker ?? 'gpw'}-${row.transaction_date ?? ''}`),
    source_id: null,
    filer_id: null,
    filer_name: row.company || 'Spółka GPW',
    branch: 'gpw_mar',
    chamber: null,
    party: null,
    state: 'PL',
    ticker: row.ticker ?? null,
    asset_name: row.title || row.company || null,
    asset_type: 'gpw',
    transaction_type: row.side || 'unknown',
    amount_low: null,
    amount_high: null,
    amount_label: null,
    transaction_date: row.transaction_date ?? null,
    filing_date: row.report_date ? row.report_date.slice(0, 10) : null,
    days_to_file: daysBetween(row.transaction_date ?? null, row.report_date ?? null),
    doc_url: null,
    created_at: row.report_date || row.transaction_date || '',
  }));
}

export interface ConvergenceSnapshot {
  topN: number;
  quarterStart: string;
  valuedTo: string;
  priced: number;
  returnPct: number;
}

export async function fetchConvergenceSnapshot(): Promise<ConvergenceSnapshot | null> {
  const rows = await orcaSelect<{
    top_n?: number;
    quarter_start?: string;
    valued_to?: string;
    priced?: number;
    ret?: number;
  }>('convergence_live?select=top_n,quarter_start,valued_to,priced,ret&limit=1');
  const row = rows[0];
  if (!row || typeof row.ret !== 'number') return null;
  return {
    topN: row.top_n ?? 0,
    quarterStart: row.quarter_start ?? '',
    valuedTo: row.valued_to ?? '',
    priced: row.priced ?? 0,
    returnPct: row.ret * 100,
  };
}
