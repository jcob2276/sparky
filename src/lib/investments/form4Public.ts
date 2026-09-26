import { InsiderTradeItem } from './investmentsApi';

function textOf(cell: Element | undefined): string {
  return (cell?.textContent ?? '').replace(/\s+/g, ' ').trim();
}

function daysBetween(from: string, to: string): number | null {
  const start = Date.parse(`${from}T12:00:00Z`);
  const end = Date.parse(`${to}T12:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  return Math.round((end - start) / 86_400_000);
}

function money(raw: string): number | null {
  const cleaned = raw.replace(/[$,+\s]/g, '');
  if (!cleaned || cleaned === '-') return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? Math.abs(value) : null;
}

function rowsFromDocument(doc: Document): InsiderTradeItem[] {
  const rows = [...doc.querySelectorAll('table.tinytable tbody tr')];
  return rows.flatMap((row) => {
    const cells = [...row.querySelectorAll('td')];
    if (cells.length < 13) return [];
    const filingRaw = textOf(cells[1]);
    const tradeDate = textOf(cells[2]).slice(0, 10);
    const filingDate = filingRaw.slice(0, 10);
    const ticker = textOf(cells[3]).toUpperCase();
    const company = textOf(cells[4]);
    const name = textOf(cells[5]);
    const title = textOf(cells[6]);
    const kind = textOf(cells[7]);
    const valueLabel = textOf(cells[12]);
    if (!name || !ticker || !/^\d{4}-\d{2}-\d{2}$/.test(tradeDate)) return [];
    const docUrl = cells[1]?.querySelector('a')?.getAttribute('href') ?? null;
    const value = money(valueLabel);
    return [{
      id: `${ticker}-${filingRaw || tradeDate}-${name}-${kind}`,
      source_id: null,
      filer_id: null,
      filer_name: name,
      branch: 'form4',
      chamber: title || 'Form 4',
      party: null,
      state: 'US',
      ticker,
      asset_name: company || ticker,
      asset_type: 'form4',
      transaction_type: kind.toLowerCase().includes('sale')
        ? 'sale'
        : kind.toLowerCase().includes('purchase')
          ? 'purchase'
          : kind || 'form4',
      amount_low: value,
      amount_high: value,
      amount_label: valueLabel || null,
      transaction_date: tradeDate,
      filing_date: /^\d{4}-\d{2}-\d{2}$/.test(filingDate) ? filingDate : null,
      days_to_file: /^\d{4}-\d{2}-\d{2}$/.test(filingDate) ? daysBetween(tradeDate, filingDate) : null,
      doc_url: docUrl,
      created_at: filingRaw || tradeDate,
    }];
  });
}

async function readTable(path: string): Promise<InsiderTradeItem[]> {
  const response = await fetch(path);
  if (!response.ok) return [];
  const html = await response.text();
  return rowsFromDocument(new DOMParser().parseFromString(html, 'text/html'));
}

export function fetchNamedForm4(): Promise<InsiderTradeItem[]> {
  return readTable('/openinsider/latest-insider-trading');
}

export const FORM4_HISTORY_PAGE_CAP = 8;

export interface Form4HistoryPage {
  rows: InsiderTradeItem[];
  truncated: boolean;
}

export async function fetchForm4History(query: string): Promise<Form4HistoryPage> {
  const needle = query.replace(/[%_]/g, '').trim();
  if (needle.length < 2) return { rows: [], truncated: false };
  const param = needle.includes(' ')
    ? `o=${encodeURIComponent(needle)}`
    : `s=${encodeURIComponent(needle.toUpperCase())}`;
  const rows: InsiderTradeItem[] = [];
  let truncated = false;
  for (let page = 1; page <= FORM4_HISTORY_PAGE_CAP; page += 1) {
    const batch = await readTable(`/openinsider/screener?${param}&fd=0&td=0&cnt=100&page=${page}`);
    if (batch.length === 0) break;
    rows.push(...batch);
    if (batch.length < 50) break;
    if (page === FORM4_HISTORY_PAGE_CAP) truncated = true;
  }
  return { rows, truncated };
}
