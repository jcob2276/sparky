import { type TradeItemData } from './AnalystTradeCard';
import { parseChartSpec, type AnalystChartSpec } from './analystChartSpec';

export type ParsedBlock =
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'trade'; data: TradeItemData }
  | { type: 'heading'; level: number; text: string }
  | { type: 'disclaimer'; text: string }
  | { type: 'chart'; chart: AnalystChartSpec }
  | { type: 'source'; text: string }
  | { type: 'text'; text: string };

function parseTableBlock(lines: string[]): { headers: string[]; rows: string[][] } | null {
  if (lines.length < 2) return null;
  const headerLine = lines[0];
  const headers = headerLine.split('|').map((s) => s.trim()).filter(Boolean);

  const rows: string[][] = [];
  for (let i = 2; i < lines.length; i++) {
    const rowLine = lines[i];
    const cells = rowLine.split('|').map((s) => s.trim());
    if (cells.length >= 2) {
      const cleanCells = cells.slice(1, -1);
      if (cleanCells.length > 0) rows.push(cleanCells);
    }
  }
  return { headers, rows };
}

export function parseBlocks(raw: string): ParsedBlock[] {
  const lines = raw.split('\n');
  const blocks: ParsedBlock[] = [];
  let tableBuffer: string[] = [];
  let currentTrade: TradeItemData | null = null;

  const flushTable = () => {
    if (tableBuffer.length > 0) {
      const table = parseTableBlock(tableBuffer);
      if (table) blocks.push({ type: 'table', headers: table.headers, rows: table.rows });
      tableBuffer = [];
    }
  };

  const flushTrade = () => {
    if (currentTrade) {
      blocks.push({ type: 'trade', data: currentTrade });
      currentTrade = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Fenced block: ```chart {json}``` (jedno- lub wielolinijkowy)
    if (trimmed.startsWith('```')) {
      flushTable();
      flushTrade();
      const body: string[] = [trimmed.replace(/^```\w*/, '')];
      const lang = trimmed.slice(3).match(/^\w+/)?.[0]?.toLowerCase();
      let closed = trimmed.length > 3 && trimmed.slice(3).includes('```');
      while (!closed && i + 1 < lines.length) {
        i++;
        body.push(lines[i]);
        if (lines[i].includes('```')) closed = true;
      }
      const chart = lang === 'chart' ? parseChartSpec(body.join(' ').replace(/```/g, '')) : null;
      if (chart) blocks.push({ type: 'chart', chart });
      continue;
    }

    // Table line
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      flushTrade();
      tableBuffer.push(trimmed);
      continue;
    } else {
      flushTable();
    }

    // Trade header: e.g. * **BUY: BE** or * **SELL: AAPL** or * **BUY**: **INTC**
    const tradeMatch = trimmed.match(/^[*•-]\s+\*\*(BUY|SELL):?\s*([^(*]+)?\*\*(?:\s*\(([^)]+)\))?/i);
    if (tradeMatch) {
      flushTrade();
      const action = tradeMatch[1].toUpperCase() as 'BUY' | 'SELL';
      const ticker = tradeMatch[2]?.replace(/[:*\s]/g, '').trim() || '—';
      const desc = tradeMatch[3]?.trim() || '';
      currentTrade = {
        action,
        ticker,
        desc,
        amount: '',
        txDate: '',
        filingDate: '',
      };
      continue;
    }

    // Inside trade item
    if (currentTrade) {
      const kwotaMatch = trimmed.match(/Kwota:\s*\*?\*?([^*]+)\*?\*?/i);
      const txMatch = trimmed.match(/(?:Data transakcji|Transakcja):\s*\*?\*?([^*]+)\*?\*?/i);
      const filMatch = trimmed.match(/(?:Ujawnienie|Zgłoszenie):\s*\*?\*?([^*]+)\*?\*?/i);

      if (kwotaMatch) { currentTrade.amount = kwotaMatch[1].trim(); continue; }
      if (txMatch) { currentTrade.txDate = txMatch[1].trim(); continue; }
      if (filMatch) { currentTrade.filingDate = filMatch[1].trim(); continue; }

      if (trimmed === '' || trimmed.startsWith('*') || trimmed.startsWith('#')) {
        flushTrade();
      }
    }

    // Disclaimer
    if (trimmed.includes('Analizy mają charakter informacyjny') || trimmed.includes('rekomendacji inwestycyjnej')) {
      flushTrade();
      blocks.push({
        type: 'disclaimer',
        text: trimmed.replace(/[*_#-]/g, '').trim(),
      });
      continue;
    }

    // Headings
    if (trimmed.startsWith('### ') || trimmed.startsWith('## ') || trimmed.startsWith('# ')) {
      flushTrade();
      const level = trimmed.indexOf(' ');
      blocks.push({
        type: 'heading',
        level,
        text: trimmed.slice(level + 1).replace(/\*\*/g, '').trim(),
      });
      continue;
    }

    // Źródło / data danych
    if (/^\*{0,2}_?(Źródł[oa]|Zrodlo)/i.test(trimmed)) {
      flushTrade();
      blocks.push({ type: 'source', text: trimmed.replace(/[*_]/g, '').trim() });
      continue;
    }

    // Empty or separator line
    if (trimmed === '' || trimmed === '---' || trimmed === '***') {
      continue;
    }

    // Regular line
    blocks.push({ type: 'text', text: trimmed });
  }

  flushTable();
  flushTrade();

  return blocks;
}
