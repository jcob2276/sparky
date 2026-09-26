/**
 * investmentsAiContext.ts — Dynamic Context Engine (RAG) dla Analityka AI.
 * Odpytuje rejestry live (SEC 13F, STOCK Act, KNF szorty, GPW MAR art. 19, GPW Teaser)
 * w zależności od intencji i podmiotów występujących w zapytaniu użytkownika.
 */

import { orcaSelect } from './superinvestorsApi';
import { fetchLiveGpwShorts, fetchLiveConsensus } from './superinvestorsApi';
import { fetchRecentCongress, fetchGpwInsiderTrades } from './publicDisclosures';
import { loadJakubPortfolio } from './jakubPortfolioStorage';
import { loadKondzioPortfolio } from './kondzioPortfolioStorage';

interface RawPoliticianTrade {
  ticker?: string | null;
  asset_description?: string | null;
  transaction_date?: string | null;
  disclosure_date?: string | null;
  transaction_type?: string | null;
  amount_low?: number | null;
  amount_high?: number | null;
  politicians?: { display_name?: string | null; party?: string | null; chamber?: string | null } | null;
}

interface RawGpwTeaser {
  ticker?: string | null;
  name?: string | null;
  sector?: string | null;
  mcap?: number | null;
  pe?: number | null;
  net_margin?: number | null;
  revenue_yoy?: number | null;
  roe?: number | null;
}

interface RawShortPosition {
  holder?: string | null; company?: string | null; ticker?: string | null; position_pct?: number | null; position_date?: string | null;
}

interface RawGpwInsider {
  company?: string | null; ticker?: string | null; side?: string | null; transaction_date?: string | null; report_date?: string | null; title?: string | null;
}

function fmtMoney(low?: number | null, high?: number | null): string {
  if (low == null && high == null) return 'nieujawniona';
  if (low != null && high != null) return `$${low.toLocaleString('pl-PL')} – $${high.toLocaleString('pl-PL')}`;
  const v = low ?? high ?? 0;
  return `$${v.toLocaleString('pl-PL')}`;
}

async function getPoliticianTargetedContext(query: string): Promise<string> {
  const q = query.toLowerCase();

  // Donald Trump - status specjalny (prezydent / kandydat, nie Kongres)
  if (q.includes('trump')) {
    return `[SPECJALNY STATUS PRAWNY: DONALD TRUMP]:
• Status formalny: Nie podlega pod Congressional STOCK Act (obejmuje wyłącznie kongresmenów/senatorów). Składa sprawozdania majątkowe OGE Form 278e do FEC.
• Główne aktywa: $DJT (Trump Media & Technology Group - NASDAQ, pakiet większościowy ~114,75 mln akcji), portfel krypto ETH ($1M-$5M) oraz obligacje skarbowe USA.
• Najaktywniejsi w STOCK Act na Kapitolu to m.in. Nancy Pelosi ($BE, $NVDA), Tommy Tuberville, Ro Khanna.\n\n`;
  }

  // Ro Khanna - reprezentant Doliny Krzemowej (CA-17)
  if (q.includes('khanna') || q.includes('rokhanna')) {
    return `[PROFIL POLITYKA STOCK ACT: RO KHANNA]:
• Izba Reprezentantów USA (Demokrata, Kalifornia CA-17, Dolina Krzemowa). Zgłoszenia realizowane głównie przez małżonkę i family trusts.
• Portfel: Amerykański Big Tech i półprzewodniki ($MSFT, $NVDA, $AAPL, $GOOGL, $AMZN, $META, $INTC, $AVGO). Setki transakcji rocznie w przedziałach $1k-$250k.\n\n`;
  }

  let nameFilter = '';
  if (q.includes('pelosi')) nameFilter = 'pelosi';
  else if (q.includes('tuberville')) nameFilter = 'tuberville';
  else if (q.includes('greene')) nameFilter = 'greene';
  else if (q.includes('mccaul')) nameFilter = 'mccaul';
  else if (q.includes('donalds')) nameFilter = 'donalds';
  else if (q.includes('gottheimer')) nameFilter = 'gottheimer';
  else if (q.includes('sessions')) nameFilter = 'sessions';
  else {
    const words = q.replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter((w) => w.length >= 4);
    for (const w of words) {
      if (['jakie', 'ruchy', 'kiedy', 'pokaz', 'kupil', 'sprzedal', 'transakcje', 'ostatnio'].includes(w)) continue;
      nameFilter = w;
      break;
    }
  }

  if (!nameFilter) return '';

  try {
    const rows = await orcaSelect<RawPoliticianTrade>(
      `stock_act_trades?select=ticker,asset_description,transaction_date,disclosure_date,transaction_type,amount_low,amount_high,politicians!inner(display_name,chamber,party)&politicians.display_name=ilike.*${encodeURIComponent(nameFilter)}*&order=disclosure_date.desc.nullslast&limit=12`
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
  if (!q.includes('dino') && !q.includes('żabk') && !q.includes('zabk') && !q.includes('duopol')) return '';

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
      const margin = f.net_margin != null ? `${(f.net_margin * 100).toFixed(1)}%` : '—';
      const mcapMld = f.mcap != null ? `${(f.mcap / 1e9).toFixed(2)} mld PLN` : '—';
      return `• ${f.ticker} (${f.name}): MCAP ${mcapMld}, C/Z: ${pe}, Marża: ${margin}, ROE: ${f.roe != null ? (f.roe * 100).toFixed(1) + '%' : '—'}`;
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

async function getSpecificTickerContext(query: string): Promise<string> {
  const tickerMatches = query.match(/\$([A-Za-z0-9_]+)/g);
  if (!tickerMatches?.length) return '';
  const ticker = tickerMatches[0]?.replace('$', '').toUpperCase();
  if (!ticker) return '';

  try {
    const [shortRows, congressRows] = await Promise.all([
      orcaSelect<RawShortPosition>(
        `gpw_short_positions?ticker=ilike.*${encodeURIComponent(ticker)}*&order=position_date.desc&limit=3`
      ).catch(() => []),
      orcaSelect<RawPoliticianTrade>(
        `stock_act_trades?ticker=ilike.*${encodeURIComponent(ticker)}*&order=disclosure_date.desc.nullslast&limit=4`
      ).catch(() => []),
    ]);

    const parts: string[] = [];
    if (shortRows.length) {
      parts.push(`Szorty KNF: ` + shortRows.map((s) => `${s.holder}: ${s.position_pct}% (${s.position_date})`).join(', '));
    }
    if (congressRows.length) {
      parts.push(`Kongres USA: ` + congressRows.map((c) => `${c.transaction_type} (${c.transaction_date})`).join(', '));
    }
    return parts.length ? `[DANE LIVE DLA $${ticker}]: ${parts.join(' | ')}\n` : '';
  } catch {
    return '';
  }
}

function getJakubPortfolioTargetedContext(query: string): string {
  const q = query.toLowerCase();
  const p = loadJakubPortfolio();
  const hasMatch = p.positions.some(
    (pos) => q.includes(pos.ticker.toLowerCase()) || q.includes(pos.name.toLowerCase())
  );
  if (!hasMatch && !q.includes('portfel') && !q.includes('moje') && !q.includes('jakub')) {
    return '';
  }
  const posLines = p.positions.map(
    (pos) => `  - ${pos.name} ($${pos.ticker}): ${pos.shares} szt., wycena ${pos.currentValue.toFixed(2)} PLN, PnL: ${pos.pnlPln > 0 ? '+' : ''}${pos.pnlPln.toFixed(2)} PLN (${pos.pnlPct.toFixed(1)}%) | Smart Money: ${pos.smartMoneySignal || 'Brak'}`
  );
  return `[PORTFEL JAKUBA (DANE LIVE)]:
Łączna wartość: ${p.totalValuePln.toFixed(2)} PLN | PnL: ${p.totalPnlPln.toFixed(2)} PLN (${p.totalPnlPct.toFixed(1)}%) | Wolne środki: ${p.freeCashPln.toFixed(2)} PLN
Pozycje:
${posLines.join('\n')}\n\n`;
}

function getKondzioPortfolioTargetedContext(query: string): string {
  const q = query.toLowerCase();
  const p = loadKondzioPortfolio();
  const hasMatch = p.positions.some(
    (pos) => q.includes(pos.ticker.toLowerCase()) || q.includes(pos.name.toLowerCase())
  );
  if (!hasMatch && !q.includes('kondzio') && !q.includes('xtb')) {
    return '';
  }
  const posLines = p.positions.map(
    (pos) => `  - ${pos.name} ($${pos.ticker}): ${pos.shares} szt., wycena ${pos.currentValue.toFixed(2)} PLN, PnL: +${pos.pnlPln.toFixed(2)} PLN (+${pos.pnlPct.toFixed(1)}%) | Smart Money: ${pos.smartMoneySignal || 'Brak'}`
  );
  return `[PORTFEL KONDZIA - XTB (DANE LIVE)]:
Łączna wartość: ${p.totalValuePln.toFixed(2)} PLN | PnL: +${p.totalPnlPln.toFixed(2)} PLN (+${p.totalPnlPct.toFixed(1)}%) | Wolne środki: ${p.freeCashPln.toFixed(2)} PLN
Pozycje:
${posLines.join('\n')}\n\n`;
}

export async function buildInvestmentsContext(query = ''): Promise<string> {
  try {
    const [targetedTicker, targetedPol, targetedDuopol, targetedBank, targetedScreen, shorts, consensus, congress, gpw] =
      await Promise.all([
        getSpecificTickerContext(query),
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

    const targetedJakub = getJakubPortfolioTargetedContext(query);
    const targetedKondzio = getKondzioPortfolioTargetedContext(query);
    const targetedBlocks = [targetedJakub, targetedKondzio, targetedTicker, targetedPol, targetedDuopol, targetedBank, targetedScreen].filter(Boolean).join('\n');

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
