/**
 * gpwInsidersService.ts — odczyt zawiadomień MAR art. 19 (insiderzy GPW) z `vw_gpw_insider_public`.
 * Wszystkie zapytania mają dolną granicę = 1 stycznia bieżącego roku (yearFloor).
 */

import { orcaSelect } from './superinvestorsApi';
import { yearFloor } from './yearFloor';
import type { GpwInsiderNotice } from './gpwInsidersStats';

export type { GpwInsiderNotice, GpwInsiderKpis, GpwInsiderCluster, GpwInsiderDayCell } from './gpwInsidersStats';
/** Alias zachowany dla istniejących konsumentów (wiersz feedu). */
export type GpwInsiderLiveTrade = GpwInsiderNotice;

interface RawInsiderRow {
  id?: number | string;
  company?: string | null;
  ticker?: string | null;
  side?: string | null;
  transaction_date?: string | null;
  report_date?: string | null;
  title?: string | null;
}

const SELECT = 'vw_gpw_insider_public?select=id,company,ticker,side,transaction_date,report_date,title';

function mapGpwInsiderRow(r: RawInsiderRow, index: number): GpwInsiderNotice {
  const sideRaw = (r.side || 'other').toLowerCase();
  const side: GpwInsiderNotice['side'] = sideRaw === 'buy' ? 'buy' : sideRaw === 'sell' ? 'sell' : 'other';
  const repDate = r.report_date ? r.report_date.slice(0, 10) : '';
  const txDate = r.transaction_date ? r.transaction_date.slice(0, 10) : repDate;
  return {
    id: String(r.id ?? `${r.ticker ?? 'gpw'}-${txDate}-${index}`),
    company: r.company || '—',
    ticker: r.ticker || '—',
    side,
    transactionDate: txDate,
    reportDate: repDate,
    title: r.title || 'Zawiadomienie w trybie art. 19 MAR',
    sourceUrl: `https://www.gpw.pl/szukaj?q=${encodeURIComponent(r.ticker || r.company || '')}`,
  };
}

/** Wszystkie zawiadomienia od 1 stycznia (do agregatów: KPI, klastry, natężenie). */
export async function fetchGpwInsiderNoticesYtd(): Promise<GpwInsiderNotice[]> {
  const floor = yearFloor();
  const rows = await orcaSelect<RawInsiderRow>(
    `${SELECT}&report_date=gte.${floor}&order=report_date.desc`,
    { strict: true },
  );
  return rows.map(mapGpwInsiderRow).filter((n) => !n.transactionDate || n.transactionDate >= floor);
}

export async function fetchGpwInsiderLiveFeed(params?: {
  query?: string;
  side?: 'all' | 'buy' | 'sell' | 'other';
}): Promise<GpwInsiderNotice[]> {
  let path = `${SELECT}&report_date=gte.${yearFloor()}`;
  if (params?.side && params.side !== 'all') path += `&side=eq.${params.side}`;
  if (params?.query?.trim()) {
    const q = encodeURIComponent(params.query.trim());
    path += `&or=(ticker.ilike.*${q}*,company.ilike.*${q}*,title.ilike.*${q}*)`;
  }
  path += '&order=report_date.desc&limit=60';
  const rows = await orcaSelect<RawInsiderRow>(path, { strict: true });
  return rows.map(mapGpwInsiderRow);
}
