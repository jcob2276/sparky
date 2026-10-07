import { getTodayWarsaw, shiftDateStr } from '../date';
import { orcaSelect } from './superinvestorsApi';
import { rankDisclosureSignals, type SignalMetrics, type SignalRow } from './signalsScore';
import { fetchSignalInsiderEvidence } from './signalsInsiderEvidence';

export type SignalWindow = '90d' | '365d';
export type { SignalRow };

export interface SignalEvidenceItem {
  id: string;
  date: string | null;
  actor: 'fund' | 'politician' | 'insider';
  who: string;
  badge: string;
  tone: 'up' | 'down' | 'flat';
  detail: string;
  sourceUrls?: string[];
}

interface ConsensusRaw {
  ticker?: string | null;
  company_name?: string | null;
  net_changes?: number | null;
  holders?: number | null;
}

interface PoliticianEmbed {
  display_name?: string | null;
}

interface TradeRaw {
  source_url?: string;
  disclosure_date?: string;
  external_id?: string | null;
  filer_name?: string | null;
  ticker?: string | null;
  transaction_type?: string | null;
  transaction_date?: string | null;
  amount_low?: number | null;
  amount_high?: number | null;
  politicians?: PoliticianEmbed | PoliticianEmbed[] | null;
}

interface InsiderRaw {
  id?: string | number;
  ticker?: string | null;
  transaction_date?: string | null;
}

interface HoldingRaw {
  source_urls?: string[];
  period_of_report?: string;
  previous_period?: string;
  filing_url?: string;
  previous_filing_url?: string;
  investor_id?: string | null;
  shares_delta?: number | null;
  value_now?: number | null;
  change_type?: string | null;
}

interface InvestorRaw {
  id?: string | null;
  display_name?: string | null;
  fund_name?: string | null;
}

const inflight = new Map<SignalWindow, Promise<SignalRow[]>>();

function windowStart(window: SignalWindow): string {
  const days = window === '90d' ? -90 : -365;
  return shiftDateStr(getTodayWarsaw(), days);
}

function isBuy(type: string): boolean {
  const value = type.toLowerCase();
  return value.includes('buy') || value.includes('purchase');
}

function isSell(type: string): boolean {
  const value = type.toLowerCase();
  return value.includes('sell') || value.includes('sale');
}

function politicianName(raw: TradeRaw): string | null {
  const embedded = raw.politicians;
  const person = Array.isArray(embedded) ? embedded[0] : embedded;
  const name = person?.display_name?.trim() || raw.filer_name?.trim();
  return name ? name : null;
}

function laterDate(current: string | null, next: string | null): string | null {
  if (!next) return current;
  if (!current || next > current) return next;
  return current;
}

function emptyMetric(ticker: string, companyName: string, fundNetBuyers: number | null, holders: number): SignalMetrics {
  return {
    ticker,
    companyName,
    fundNetBuyers,
    holders,
    polBuys: 0,
    polSells: 0,
    politicianBuyers: 0,
    politicians: 0,
    insiderBuys: 0,
    buyVolumeMid: 0,
    lastTradeDate: null,
    disclosureIds: [],
  };
}

export async function fetchSignalBoard(window: SignalWindow): Promise<SignalRow[]> {
  const pending = inflight.get(window);
  if (pending) return pending;
  const job = loadSignalBoard(window).finally(() => {
    inflight.delete(window);
  });
  inflight.set(window, job);
  return job;
}

async function loadSignalBoard(window: SignalWindow): Promise<SignalRow[]> {

  const since = windowStart(window);
  const today = getTodayWarsaw();
  const [consensus, trades, insiders] = await Promise.all([
    orcaSelect<ConsensusRaw>('vw_sec13f_screener?select=ticker,company_name,net_changes,holders&order=ticker.asc', { strict: true }),
    orcaSelect<TradeRaw>(
      `stock_act_trades?select=external_id,ticker,transaction_type,transaction_date,amount_low,amount_high,filer_name,politicians(display_name)&source_url=not.is.null&disclosure_date=not.is.null&transaction_date=gte.${since}&transaction_date=lte.${today}&order=id.asc`,
      { strict: true },
    ),
    orcaSelect<InsiderRaw>(
      `vw_sec_form4_public?select=id,ticker,transaction_date&transaction_code=eq.P&is_derivative=eq.false&form_type=eq.4&transaction_date=gte.${since}&transaction_date=lte.${today}&order=transaction_date.asc`,
      { strict: true },
    ),
  ]);

  const byTicker = new Map<string, SignalMetrics>();
  for (const item of consensus) {
    const ticker = item.ticker?.trim().toUpperCase();
    if (!ticker) continue;
    byTicker.set(
      ticker,
      emptyMetric(ticker, item.company_name?.trim() || ticker, item.net_changes ?? null, item.holders ?? 0),
    );
  }

  const buyerNames = new Map<string, Set<string>>();
  const allNames = new Map<string, Set<string>>();

  for (const trade of trades) {
    const ticker = trade.ticker?.trim().toUpperCase();
    if (!ticker) continue;
    const metric = byTicker.get(ticker) ?? emptyMetric(ticker, ticker, null, 0);
    byTicker.set(ticker, metric);
    const type = trade.transaction_type ?? '';
    const name = politicianName(trade);
    if (isBuy(type)) {
      metric.polBuys += 1;
      const low = trade.amount_low ?? 0;
      const high = trade.amount_high ?? low;
      metric.buyVolumeMid += (low + high) / 2;
      if (name) {
        const buyers = buyerNames.get(ticker) ?? new Set<string>();
        buyers.add(name);
        buyerNames.set(ticker, buyers);
      }
    } else if (isSell(type)) {
      metric.polSells += 1;
    } else {
      continue;
    }
    if (name) {
      const names = allNames.get(ticker) ?? new Set<string>();
      names.add(name);
      allNames.set(ticker, names);
    }
    metric.lastTradeDate = laterDate(metric.lastTradeDate, trade.transaction_date ?? null);
    if (trade.external_id) metric.disclosureIds?.push(`stock-act:${trade.external_id}`);
  }

  let insiderRows = 0;
  for (const insider of insiders) {
    const ticker = insider.ticker?.trim().toUpperCase();
    if (!ticker) continue;
    const metric = byTicker.get(ticker) ?? emptyMetric(ticker, ticker, null, 0);
    byTicker.set(ticker, metric);
    metric.insiderBuys += 1;
    if (insider.id != null) metric.disclosureIds?.push(`sec:${insider.id}`);
    insiderRows += 1;
    metric.lastTradeDate = laterDate(metric.lastTradeDate, insider.transaction_date ?? null);
  }

  const active: SignalMetrics[] = [];
  for (const metric of byTicker.values()) {
    if (metric.polBuys === 0 && metric.polSells === 0 && metric.insiderBuys === 0) continue;
    metric.politicianBuyers = buyerNames.get(metric.ticker)?.size ?? 0;
    metric.politicians = allNames.get(metric.ticker)?.size ?? 0;
    active.push(metric);
  }

  const rows = rankDisclosureSignals(active, insiderRows > 0);
  return rows;
}

const FUND_BADGE: Record<string, { badge: string; tone: SignalEvidenceItem['tone'] }> = {
  reported_new: { badge: 'nowo wykazana pozycja', tone: 'up' },
  reported_increase: { badge: 'wzrost raportowanej pozycji', tone: 'up' },
  reported_decrease: { badge: 'spadek raportowanej pozycji', tone: 'down' },
  reported_absent: { badge: 'pozycja niewykazana', tone: 'down' },
};

function formatShares(delta: number): string {
  const sign = delta > 0 ? '+' : '';
  return `${sign}${new Intl.NumberFormat('pl-PL').format(delta)} akcji`;
}

function formatUsd(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

export async function fetchSignalEvidence(ticker: string): Promise<SignalEvidenceItem[]> {
  const symbol = ticker.trim().toUpperCase();
  const [holdings, trades, insiderEvents] = await Promise.all([
    orcaSelect<HoldingRaw>(
      `vw_sec13f_verified_changes?select=investor_id,shares_delta,value_now,change_type,period_of_report,previous_period,filing_url,previous_filing_url,source_urls&ticker=eq.${encodeURIComponent(symbol)}&change_type=neq.reported_unchanged&order=value_now.desc&limit=40`, { strict: true },
    ),
    orcaSelect<TradeRaw>(
      `stock_act_trades?select=external_id,filer_name,ticker,transaction_type,transaction_date,disclosure_date,source_url,amount_low,amount_high,politicians(display_name)&source_url=not.is.null&disclosure_date=not.is.null&ticker=eq.${encodeURIComponent(symbol)}&order=disclosure_date.desc&limit=40`, { strict: true },
    ),
    fetchSignalInsiderEvidence(symbol),
  ]);

  const investorIds = [...new Set(holdings.map((h) => h.investor_id).filter((id): id is string => Boolean(id)))];
  const investors = investorIds.length
    ? await orcaSelect<InvestorRaw>(
        `investors?select=id,display_name,fund_name&id=in.(${investorIds.join(',')})`, { strict: true },
      )
    : [];
  const names = new Map(investors.map((inv) => [inv.id, inv.display_name || inv.fund_name || 'Fundusz']));

  const events: SignalEvidenceItem[] = [...insiderEvents];
  for (const holding of holdings) {
    const kind = FUND_BADGE[holding.change_type ?? ''] ?? { badge: holding.change_type || 'zmiana', tone: 'flat' as const };
    const shares = typeof holding.shares_delta === 'number' ? formatShares(holding.shares_delta) : null;
    const value = typeof holding.value_now === 'number' ? formatUsd(holding.value_now) : null;
    events.push({
      id: `fund-${holding.investor_id ?? events.length}`,
      date: holding.period_of_report ?? null,
      actor: 'fund',
      who: names.get(holding.investor_id ?? '') || 'Fundusz',
      badge: kind.badge,
      tone: kind.tone,
      detail: `${holding.previous_period} → ${holding.period_of_report} · ${[shares, value && `wartość pozycji ${value}`].filter(Boolean).join(' · ')}. Zmiana stanu raportowanego, nie potwierdzona transakcja.`,
      sourceUrls: holding.source_urls ?? [holding.previous_filing_url, holding.filing_url].filter((url): url is string => Boolean(url)),
    });
  }

  for (const trade of trades) {
    const type = trade.transaction_type ?? '';
    if (!isBuy(type) && !isSell(type)) continue;
    const low = trade.amount_low;
    const high = trade.amount_high;
    const range = low != null && high != null ? `${formatUsd(low)} – ${formatUsd(high)}` : 'kwota nieujawniona';
    events.push({
      id: `pol-${trade.transaction_date ?? ''}-${politicianName(trade) ?? events.length}`,
      date: trade.disclosure_date ?? null,
      actor: 'politician',
      who: politicianName(trade) || 'Polityk',
      badge: isBuy(type) ? 'Kupno' : 'Sprzedaż',
      tone: isBuy(type) ? 'up' : 'down',
      detail: `Transakcja: ${trade.transaction_date ?? 'data nieznana'} · ${range}`,
      sourceUrls: trade.source_url ? [trade.source_url] : [],
    });
  }

  return events.sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return b.date.localeCompare(a.date);
  });
}

export { freshSignalAlerts, markSignalAlertsSeen } from './signalsAlerts';
