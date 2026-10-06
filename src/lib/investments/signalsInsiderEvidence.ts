import { orcaSelect } from './superinvestorsApi';
import type { SignalEvidenceItem } from './signalsApi';

export async function fetchSignalInsiderEvidence(ticker: string): Promise<SignalEvidenceItem[]> {
  const rows = await orcaSelect<{ id: string; filer_name?: string; transaction_date?: string;
    filing_date?: string; transaction_code: string; shares?: number; price_usd?: number; doc_url: string }>(
    `vw_sec_form4_public?select=id,filer_name,transaction_date,filing_date,transaction_code,shares,price_usd,doc_url&ticker=eq.${encodeURIComponent(ticker)}&is_derivative=eq.false&form_type=eq.4&transaction_code=in.(P,S)&order=filing_date.desc&limit=40`, { strict: true });
  return rows.map(row => ({
    id: `sec-${row.id}`, date: row.filing_date ?? null, actor: 'insider',
    who: row.filer_name || 'Insider', badge: row.transaction_code === 'P' ? 'Kupno (P)' : 'Sprzedaż (S)',
    tone: row.transaction_code === 'P' ? 'up' : 'down',
    detail: `Transakcja: ${row.transaction_date ?? 'data nieznana'} · Akcje: ${row.shares ?? '—'} · Cena USD: ${row.price_usd ?? '—'}`,
    sourceUrls: [row.doc_url],
  }));
}
