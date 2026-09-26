import { getTodayWarsaw, shiftDateStr } from '../date';
import { orcaSelect } from './superinvestorsApi';
import { rankDisclosureSignals, type SignalMetrics, type SignalRow } from './signalsScore';

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
}

interface ConsensusRaw {
  ticker?: string | null;
  company_name?: string | null;
  net_buyers?: number | null;
  holders?: number | null;
}

interface PoliticianEmbed {
  display_name?: string | null;
}

interface TradeRaw {
  ticker?: string | null;
  transaction_type?: string | null;
  transaction_date?: string | null;
  amount_low?: number | null;
  amount_high?: number | null;
  politicians?: PoliticianEmbed | PoliticianEmbed[] | null;
}

interface InsiderRaw {
  ticker?: string | null;
  transaction_date?: string | null;
}

interface HoldingRaw {
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

const boardCache = new Map<SignalWindow, { at: number; rows: SignalRow[] }>();
const inflight = new Map<SignalWindow, Promise<SignalRow[]>>();
const CACHE_MS = 5 * 60 * 1000;

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
  const name = person?.display_name?.trim();
  return name ? name : null;
}

function laterDate(current: string | null, next: string | null): string | null {
  if (!next) return current;
  if (!current || next > current) return next;
  return current;
}

function emptyMetric(ticker: string, companyName: string, fundNetBuyers: number, holders: number): SignalMetrics {
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
  };
}

export async function fetchSignalBoard(window: SignalWindow): Promise<SignalRow[]> {
  const cached = boardCache.get(window);
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.rows;
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
  const [consensus, trades, insiders] = await Promise.all([
    orcaSelect<ConsensusRaw>('vw_consensus?select=ticker,company_name,net_buyers,holders&order=ticker.asc'),
    orcaSelect<TradeRaw>(
      `stock_act_trades?select=ticker,transaction_type,transaction_date,amount_low,amount_high,politicians(display_name)&transaction_date=gte.${since}&order=id.asc`,
    ),
    orcaSelect<InsiderRaw>(
      `vw_insider_public?select=ticker,transaction_date&transaction_code=eq.P&transaction_date=gte.${since}&order=id.asc`,
    ),
  ]);

  const byTicker = new Map<string, SignalMetrics>();
  for (const item of consensus) {
    const ticker = item.ticker?.trim().toUpperCase();
    if (!ticker) continue;
    byTicker.set(
      ticker,
      emptyMetric(ticker, item.company_name?.trim() || ticker, item.net_buyers ?? 0, item.holders ?? 0),
    );
  }

  const buyerNames = new Map<string, Set<string>>();
  const allNames = new Map<string, Set<string>>();

  for (const trade of trades) {
    const ticker = trade.ticker?.trim().toUpperCase();
    if (!ticker) continue;
    const metric = byTicker.get(ticker);
    if (!metric) continue;
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
  }

  let insiderRows = 0;
  for (const insider of insiders) {
    const ticker = insider.ticker?.trim().toUpperCase();
    if (!ticker) continue;
    const metric = byTicker.get(ticker);
    if (!metric) continue;
    metric.insiderBuys += 1;
    insiderRows += 1;
    metric.lastTradeDate = laterDate(metric.lastTradeDate, insider.transaction_date ?? null);
  }

  const active: SignalMetrics[] = [];
  for (const metric of byTicker.values()) {
    if (metric.polBuys === 0 && metric.polSells === 0) continue;
    metric.politicianBuyers = buyerNames.get(metric.ticker)?.size ?? (metric.polBuys > 0 ? 1 : 0);
    metric.politicians = allNames.get(metric.ticker)?.size ?? (metric.polBuys + metric.polSells > 0 ? 1 : 0);
    active.push(metric);
  }

  const rows = rankDisclosureSignals(active, insiderRows > 0);
  boardCache.set(window, { at: Date.now(), rows });
  return rows;
}

const FUND_BADGE: Record<string, { badge: string; tone: SignalEvidenceItem['tone'] }> = {
  new: { badge: 'nowa pozycja', tone: 'up' },
  increased: { badge: 'dokupił', tone: 'up' },
  decreased: { badge: 'zredukował', tone: 'down' },
  sold: { badge: 'wyszedł z pozycji', tone: 'down' },
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
  const [holdings, trades] = await Promise.all([
    orcaSelect<HoldingRaw>(
      `vw_holdings_changes?select=investor_id,shares_delta,value_now,change_type&ticker=eq.${encodeURIComponent(symbol)}&change_type=neq.unchanged&order=value_now.desc&limit=40`,
    ),
    orcaSelect<TradeRaw>(
      `stock_act_trades?select=ticker,transaction_type,transaction_date,amount_low,amount_high,politicians(display_name)&ticker=eq.${encodeURIComponent(symbol)}&order=transaction_date.desc&limit=40`,
    ),
  ]);

  const investorIds = [...new Set(holdings.map((h) => h.investor_id).filter((id): id is string => Boolean(id)))];
  const investors = investorIds.length
    ? await orcaSelect<InvestorRaw>(
        `investors?select=id,display_name,fund_name&id=in.(${investorIds.join(',')})`,
      )
    : [];
  const names = new Map(investors.map((inv) => [inv.id, inv.display_name || inv.fund_name || 'Fundusz']));

  const events: SignalEvidenceItem[] = [];
  for (const holding of holdings) {
    const kind = FUND_BADGE[holding.change_type ?? ''] ?? { badge: holding.change_type || 'zmiana', tone: 'flat' as const };
    const shares = typeof holding.shares_delta === 'number' ? formatShares(holding.shares_delta) : null;
    const value = typeof holding.value_now === 'number' ? formatUsd(holding.value_now) : null;
    events.push({
      id: `fund-${holding.investor_id ?? events.length}`,
      date: null,
      actor: 'fund',
      who: names.get(holding.investor_id ?? '') || 'Fundusz',
      badge: kind.badge,
      tone: kind.tone,
      detail: [shares, value].filter(Boolean).join(' · ') || 'Zgłoszenie 13F',
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
      date: trade.transaction_date ?? null,
      actor: 'politician',
      who: politicianName(trade) || 'Polityk',
      badge: isBuy(type) ? 'Kupno' : 'Sprzedaż',
      tone: isBuy(type) ? 'up' : 'down',
      detail: range,
    });
  }

  return events.sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return b.date.localeCompare(a.date);
  });
}

const ALERT_KEY = 'sparky_signal_alerts_v1';

interface AlertSnapshot {
  seen: Record<string, number>;
}

function readSnapshots(): Record<string, AlertSnapshot> {
  try {
    const raw = localStorage.getItem(ALERT_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as Record<string, AlertSnapshot>;
  } catch {
    return {};
  }
}

export function freshSignalAlerts(window: SignalWindow, rows: SignalRow[]): SignalRow[] {
  const snapshots = readSnapshots();
  const prior = snapshots[window];
  if (!prior) {
    markSignalAlertsSeen(window, rows);
    return [];
  }
  return rows.filter((row) => row.convergent && (prior.seen[row.ticker] ?? -1) < row.score);
}

export function markSignalAlertsSeen(window: SignalWindow, rows: SignalRow[]): void {
  const snapshots = readSnapshots();
  const seen: Record<string, number> = {};
  for (const row of rows) {
    if (row.convergent) seen[row.ticker] = row.score;
  }
  snapshots[window] = { seen };
  try {
    localStorage.setItem(ALERT_KEY, JSON.stringify(snapshots));
  } catch {
    /* private mode */
  }
}
