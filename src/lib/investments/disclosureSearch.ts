import { orcaSelect } from './superinvestorsApi';

export type SearchSource = 'Polityk' | 'Superinwestor' | 'STOCK Act' | '13F';

export interface DisclosureSearchHit {
  source: SearchSource;
  title: string;
  detail: string;
  url?: string;
}

interface PoliticianRaw {
  display_name?: string | null;
  chamber?: string | null;
  state?: string | null;
  party?: string | null;
  slug?: string | null;
}

interface InvestorRaw {
  display_name?: string | null;
  fund_name?: string | null;
  category?: string | null;
  cik?: string | null;
}

interface TradeRaw {
  ticker?: string | null;
  transaction_type?: string | null;
  transaction_date?: string | null;
  amount_low?: number | null;
  amount_high?: number | null;
  politicians?: { display_name?: string | null } | { display_name?: string | null }[] | null;
}

interface ConsensusRaw {
  ticker?: string | null;
  company_name?: string | null;
  net_buyers?: number | null;
  holders?: number | null;
}

function needle(raw: string): string {
  return raw.replace(/[%_,()*]/g, ' ').trim();
}

function partyFilter(query: string): 'D' | 'R' | null {
  const q = query.toLowerCase();
  if (q.startsWith('demokr') || q.startsWith('democrat')) return 'D';
  if (q.startsWith('republ')) return 'R';
  return null;
}

function isCatalog(query: string, words: string[]): boolean {
  return words.includes(query.toLowerCase());
}

function chamberLabel(chamber: string | null | undefined): string {
  const value = (chamber ?? '').toLowerCase();
  if (value.includes('senate')) return 'Senat';
  if (value.includes('house')) return 'Izba';
  return chamber || 'Kongres';
}

function partyLabel(party: string | null | undefined): string {
  const value = (party ?? '').toUpperCase();
  if (value === 'D' || value.startsWith('DEMOCR')) return 'Demokrata';
  if (value === 'R' || value.startsWith('REPUBL')) return 'Republikanin';
  return party || 'brak partii';
}

function politicianName(raw: TradeRaw): string {
  const embedded = raw.politicians;
  const person = Array.isArray(embedded) ? embedded[0] : embedded;
  return person?.display_name?.trim() || 'Polityk';
}

function usd(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

function tradeDetail(trade: TradeRaw): string {
  const type = (trade.transaction_type ?? '').toLowerCase();
  const side = type.includes('buy') || type.includes('purchase') ? 'Kupno' : type.includes('sell') || type.includes('sale') ? 'Sprzedaż' : trade.transaction_type || 'Transakcja';
  const low = trade.amount_low;
  const high = trade.amount_high;
  const range = low != null && high != null ? `${usd(low)} – ${usd(high)}` : 'kwota nieujawniona';
  return `${side} · ${range} · ${trade.transaction_date ?? 'data nieznana'}`;
}

async function safe<T>(query: string): Promise<T[]> {
  try {
    return await orcaSelect<T>(query);
  } catch {
    return [];
  }
}

export async function searchDisclosures(raw: string): Promise<DisclosureSearchHit[]> {
  const q = needle(raw);
  if (q.length < 2) return [];
  const enc = encodeURIComponent(q);
  const party = partyFilter(q);
  const listPoliticians = isCatalog(q, ['kongres', 'politycy', 'congress']);
  const listInvestors = isCatalog(q, ['superinwestorzy', 'superinwestor', 'fundusze', '13f']);

  const politicianQuery = listPoliticians
    ? 'politicians?select=display_name,chamber,state,party,slug&order=display_name.asc'
    : party
      ? `politicians?select=display_name,chamber,state,party,slug&party=eq.${party}&order=display_name.asc`
      : `politicians?select=display_name,chamber,state,party,slug&or=(display_name.ilike.*${enc}*,party.ilike.*${enc}*)&order=display_name.asc&limit=12`;

  const investorQuery = listInvestors
    ? 'investors?select=display_name,fund_name,category,cik&order=display_name.asc'
    : `investors?select=display_name,fund_name,category,cik&or=(display_name.ilike.*${enc}*,fund_name.ilike.*${enc}*)&order=display_name.asc&limit=12`;

  const [politicians, investors, tradesByName, tradesByTicker, companies] = await Promise.all([
    safe<PoliticianRaw>(politicianQuery),
    safe<InvestorRaw>(investorQuery),
    listPoliticians || listInvestors || party
      ? Promise.resolve([] as TradeRaw[])
      : safe<TradeRaw>(
          `stock_act_trades?select=ticker,transaction_type,transaction_date,amount_low,amount_high,politicians!inner(display_name)&politicians.display_name=ilike.*${enc}*&order=transaction_date.desc&limit=8`,
        ),
    listPoliticians || listInvestors || party
      ? Promise.resolve([] as TradeRaw[])
      : safe<TradeRaw>(
          `stock_act_trades?select=ticker,transaction_type,transaction_date,amount_low,amount_high,politicians!inner(display_name)&or=(ticker.ilike.*${enc}*)&order=transaction_date.desc&limit=8`,
        ),
    listPoliticians || listInvestors || party
      ? Promise.resolve([] as ConsensusRaw[])
      : safe<ConsensusRaw>(
          `vw_consensus?select=ticker,company_name,net_buyers,holders&or=(ticker.ilike.*${enc}*,company_name.ilike.*${enc}*)&limit=8`,
        ),
  ]);

  const hits: DisclosureSearchHit[] = [];

  for (const person of politicians) {
    if (!person.display_name) continue;
    hits.push({
      source: 'Polityk',
      title: person.display_name,
      detail: `${partyLabel(person.party)} · ${chamberLabel(person.chamber)}${person.state ? ` · ${person.state}` : ''}`,
    });
  }

  for (const investor of investors) {
    if (!investor.display_name) continue;
    hits.push({
      source: 'Superinwestor',
      title: investor.display_name,
      detail: [investor.fund_name, investor.category].filter(Boolean).join(' · ') || 'Portfel 13F',
      url: investor.cik ? `https://www.sec.gov/edgar/browse/?CIK=${investor.cik}` : undefined,
    });
  }

  const seenTrades = new Set<string>();
  for (const trade of [...tradesByName, ...tradesByTicker]) {
    const key = `${trade.ticker}|${trade.transaction_date}|${politicianName(trade)}|${trade.transaction_type}`;
    if (seenTrades.has(key)) continue;
    seenTrades.add(key);
    const ticker = trade.ticker || '—';
    hits.push({
      source: 'STOCK Act',
      title: `${ticker} — ${politicianName(trade)}`,
      detail: tradeDetail(trade),
      url: ticker !== '—' ? `https://www.tradingview.com/symbols/${ticker}/` : undefined,
    });
  }

  for (const company of companies) {
    if (!company.ticker) continue;
    const net = company.net_buyers ?? 0;
    hits.push({
      source: '13F',
      title: `${company.ticker} — ${company.company_name || company.ticker}`,
      detail: `${net > 0 ? '+' : ''}${net} funduszy netto · ${company.holders ?? 0} posiadaczy`,
      url: `https://www.tradingview.com/symbols/${company.ticker}/`,
    });
  }

  return hits;
}
