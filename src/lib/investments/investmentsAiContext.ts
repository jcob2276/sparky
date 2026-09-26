/**
 * investmentsAiContext.ts — Dynamic Context Engine (RAG) dla Analityka AI.
 * Odpytuje rejestry live (SEC 13F, STOCK Act, KNF szorty, GPW MAR art. 19, GPW Teaser)
 * w zależności od intencji i podmiotów występujących w zapytaniu użytkownika.
 */

import { orcaSelect } from './superinvestorsApi';
import { fetchLiveGpwShorts, fetchLiveConsensus } from './superinvestorsApi';
import { fetchRecentCongress, fetchGpwInsiderTrades } from './publicDisclosures';

interface RawPoliticianTrade {
  ticker?: string | null;
  asset_description?: string | null;
  transaction_date?: string | null;
  disclosure_date?: string | null;
  transaction_type?: string | null;
  amount_low?: number | null;
  amount_high?: number | null;
  politicians?: {
    display_name?: string | null;
    party?: string | null;
    chamber?: string | null;
  } | null;
}

interface RawGpwTeaser {
  ticker?: string | null;
  name?: string | null;
  sector?: string | null;
  mcap?: number | null;
  pe?: number | null;
  ps?: number | null;
  pb?: number | null;
  roe?: number | null;
  net_margin?: number | null;
  revenue_yoy?: number | null;
}

interface RawShortPosition {
  holder?: string | null;
  company?: string | null;
  ticker?: string | null;
  position_pct?: number | null;
  position_date?: string | null;
}

interface RawGpwInsider {
  company?: string | null;
  ticker?: string | null;
  side?: string | null;
  transaction_date?: string | null;
  report_date?: string | null;
  title?: string | null;
}

function fmtMoney(low?: number | null, high?: number | null): string {
  if (low == null && high == null) return 'nieujawniona';
  if (low != null && high != null) return `$${low.toLocaleString('pl-PL')} – $${high.toLocaleString('pl-PL')}`;
  const v = low ?? high ?? 0;
  return `$${v.toLocaleString('pl-PL')}`;
}

async function getPoliticianTargetedContext(query: string): Promise<string> {
  const q = query.toLowerCase();
  let nameFilter = '';
  if (q.includes('pelosi')) nameFilter = 'pelosi';
  else if (q.includes('trump')) nameFilter = 'trump';
  else if (q.includes('tuberville')) nameFilter = 'tuberville';
  else if (q.includes('greene')) nameFilter = 'greene';
  else if (q.includes('mccaul')) nameFilter = 'mccaul';

  if (!nameFilter) return '';

  try {
    const rows = await orcaSelect<RawPoliticianTrade>(
      `stock_act_trades?select=ticker,asset_description,transaction_date,disclosure_date,transaction_type,amount_low,amount_high,politicians!inner(display_name,chamber,party)&politicians.display_name=ilike.*${nameFilter}*&order=disclosure_date.desc.nullslast&limit=12`
    );
    if (!rows.length) return '';
    const polName = rows[0]?.politicians?.display_name || nameFilter;
    const lines = rows.map((r) => {
      const ticker = r.ticker || '—';
      const desc = r.asset_description || '';
      const amount = fmtMoney(r.amount_low, r.amount_high);
      return `• ${r.transaction_type?.toUpperCase() || 'TRANSAKCJA'}: ${ticker} (${desc}) | Kwota: ${amount} | Transakcja: ${r.transaction_date || '—'} | Ujawnienie: ${r.disclosure_date || '—'}`;
    });
    return `[SZCZEGÓŁOWE ZGŁOSZENIA STOCK ACT DLA: ${polName.toUpperCase()}]:\n${lines.join('\n')}\n`;
  } catch {
    return '';
  }
}

async function getDuopolTargetedContext(query: string): Promise<string> {
  const q = query.toLowerCase();
  if (!q.includes('dino') && !q.includes('żabk') && !q.includes('zabk') && !q.includes('duopol')) {
    return '';
  }

  try {
    const [finances, shorts] = await Promise.all([
      orcaSelect<RawGpwTeaser>(
        'gpw_fin_public_teaser?or=(ticker.in.(DNP,ZAB),name.ilike.*DINO*,name.ilike.*ZABKA*,name.ilike.*ŻABKA*)&limit=5'
      ).catch(() => []),
      orcaSelect<RawShortPosition>(
        'gpw_short_positions?or=(ticker.in.(DNP,ZAB),ticker.ilike.*ZABKA*,company.ilike.*DINO*,company.ilike.*ZABKA*)&order=position_date.desc&limit=10'
      ).catch(() => []),
    ]);

    const finLines = finances.map((f) => {
      const pe = f.pe != null ? f.pe.toFixed(2) : '—';
      const ps = f.ps != null ? f.ps.toFixed(2) : '—';
      const pb = f.pb != null ? f.pb.toFixed(2) : '—';
      const margin = f.net_margin != null ? `${(f.net_margin * 100).toFixed(2)}%` : '—';
      const growth = f.revenue_yoy != null ? `${(f.revenue_yoy * 100).toFixed(1)}%` : '—';
      const roe = f.roe != null ? `${(f.roe * 100).toFixed(1)}%` : '—';
      const mcapMld = f.mcap != null ? `${(f.mcap / 1_000_000_000).toFixed(2)} mld PLN` : '—';
      return `• ${f.ticker} (${f.name}): Kapitalizacja ${mcapMld}, C/Z (P/E): ${pe}, C/P (P/S): ${ps}, C/WK (P/B): ${pb}, Marża netto: ${margin}, Wzrost przychodów r/r: ${growth}, ROE: ${roe}`;
    });

    const shortLines = shorts.map(
      (s) => `• ${s.company} (${s.ticker}): fundusz ${s.holder} posiada ${s.position_pct ?? '<0.5'}% (stan na ${s.position_date})`
    );

    return `[SZCZEGÓŁOWE PORÓWNANIE DUOPOLU DINO VS ŻABKA (FUNDAMENTY + SZORTY KNF)]:
Wskaźniki finansowe i wycena:
${finLines.join('\n') || 'Brak danych'}

Pozycje funduszy w rejestrze KNF:
${shortLines.join('\n') || 'Brak aktywnych pozycji'}\n`;
  } catch {
    return '';
  }
}

async function getBankTargetedContext(query: string): Promise<string> {
  const q = query.toLowerCase();
  if (
    !q.includes('bank') &&
    !q.includes('pko') &&
    !q.includes('pekao') &&
    !q.includes('alior') &&
    !q.includes('santander') &&
    !q.includes('mbank') &&
    !q.includes('ing')
  ) {
    return '';
  }

  try {
    const rows = await orcaSelect<RawGpwInsider>(
      'vw_gpw_insider_public?or=(company.ilike.*BANK*,company.ilike.*PKO*,company.ilike.*PEKAO*,company.ilike.*ALIOR*,company.ilike.*SANTANDER*,ticker.in.(PKO,PEO,ALR,SPL,BHW,MBK,ING,MIL))&order=report_date.desc.nullslast&limit=12'
    );
    if (!rows.length) return '';
    const lines = rows.map((r) => {
      const side = r.side === 'buy' ? 'KUPNO' : r.side === 'sell' ? 'SPRZEDAŻ' : r.side || 'INNA';
      return `• ${r.ticker || r.company}: ${side} | Data transakcji: ${r.transaction_date || '—'} | Raport: ${r.report_date?.slice(0, 10) || '—'} | Tytuł: ${r.title || ''}`;
    });
    return `[TRANSAKCJE INSIDERÓW W SEKTORZE BANKOWYM (GPW MAR)]:
${lines.join('\n')}\n(Uwaga: jeśli PKO, Pekao lub Alior nie pojawiają się na liście, oznacza to brak zgłoszeń MAR w tym rejestrze w ostatnim okresie).\n`;
  } catch {
    return '';
  }
}

async function getScreenerTargetedContext(query: string): Promise<string> {
  const q = query.toLowerCase();
  if (!q.includes('przychód') && !q.includes('przychody') && !q.includes('c/z') && !q.includes('p/e') && !q.includes('fundament')) {
    return '';
  }

  try {
    const rows = await orcaSelect<RawGpwTeaser>(
      'gpw_fin_public_teaser?revenue_yoy=gt.0.10&pe=gt.0&pe=lt.10&mcap=gt.500000000&order=mcap.desc&limit=10'
    );
    if (!rows.length) return '';
    const lines = rows.map((r) => {
      const pe = r.pe?.toFixed(2) || '—';
      const rev = r.revenue_yoy != null ? `+${(r.revenue_yoy * 100).toFixed(1)}%` : '—';
      const mcap = r.mcap != null ? `${(r.mcap / 1_000_000_000).toFixed(2)} mld PLN` : '—';
      return `• ${r.ticker} (${r.name}): C/Z = ${pe}, Wzrost przychodów r/r = ${rev}, Kapitalizacja = ${mcap}, Sektor: ${r.sector || '—'}`;
    });
    return `[SCREENER GPW: WZROST PRZYCHODÓW > 10% r/r, C/Z < 10, MCAP > 500 MLN PLN]:
${lines.join('\n')}\n`;
  } catch {
    return '';
  }
}

export async function buildInvestmentsContext(query = ''): Promise<string> {
  try {
    const [targetedPol, targetedDuopol, targetedBank, targetedScreen, shorts, consensus, congress, gpw] =
      await Promise.all([
        getPoliticianTargetedContext(query),
        getDuopolTargetedContext(query),
        getBankTargetedContext(query),
        getScreenerTargetedContext(query),
        fetchLiveGpwShorts().catch(() => []),
        fetchLiveConsensus().catch(() => []),
        fetchRecentCongress(12).catch(() => []),
        fetchGpwInsiderTrades().catch(() => []),
      ]);

    const shortLines = shorts.slice(0, 8).map(
      (s) => `• ${s.ticker} (${s.companyName}): szort łącznie ${s.totalShortPercent}%, fundusze: ${s.fundsCount}`
    );

    const consensusLines = consensus.slice(0, 8).map(
      (c) => `• ${c.ticker} (${c.name}): netto kupujących +${c.netScore}, łącznie ${c.buyers} kupujących vs ${c.sellers} sprzedających`
    );

    const congressLines = congress.slice(0, 8).map(
      (t) => `• ${t.filer_name}: ${t.transaction_type} ${t.ticker || '—'} (${t.asset_name || ''}) kwota ${t.amount_label || 'nieujawniona'}, data ${t.filing_date || t.transaction_date}`
    );

    const gpwLines = gpw.slice(0, 6).map(
      (g) => `• ${g.ticker || g.filer_name}: ${g.transaction_type}, data: ${g.filing_date || g.transaction_date}`
    );

    const targetedBlocks = [targetedPol, targetedDuopol, targetedBank, targetedScreen].filter(Boolean).join('\n');

    return `\n\n[DANE LIVE Z PUBLICZNYCH REJESTRÓW]:
${targetedBlocks ? `${targetedBlocks}\n` : ''}REJESTR SZORTÓW KNF (TOP NAJWYŻSZYCH POZYCJI):
${shortLines.join('\n') || 'Brak danych'}

TOP KONSENSUS 13F (AKUMULACJA PRZEZ FUNDUSZE):
${consensusLines.join('\n') || 'Brak danych'}

OSTATNIE UJAWNIENIA KONGRESU USA (STOCK ACT):
${congressLines.join('\n') || 'Brak danych'}

OSTATNIE TRANSAKCJE ZARZĄDÓW GPW (MAR ART. 19):
${gpwLines.join('\n') || 'Brak danych'}`;
  } catch {
    return '';
  }
}
