import React, { FC, useMemo } from 'react';
import { AnalystTable } from './AnalystTable';
import { AnalystTradeCard, type TradeItemData } from './AnalystTradeCard';
import { Landmark, BarChart3, Sparkles, ShieldCheck, ShieldAlert, ArrowRight } from 'lucide-react';

interface Props {
  content: string;
}

type ParsedBlock =
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'trade'; data: TradeItemData }
  | { type: 'heading'; level: number; text: string }
  | { type: 'disclaimer'; text: string }
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

function parseBlocks(raw: string): ParsedBlock[] {
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

function renderFormattedLine(text: string): React.ReactNode {
  // Replace **bold** with styled strong and $TICKER with badge
  const parts = text.split(/(\*\*[^*]+\*\*|\$[A-Z0-9.]+)/g);

  return (
    <>
      {parts.map((part, idx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={idx} className="font-bold text-text-primary">
              {part.slice(2, -2)}
            </strong>
          );
        }
        if (part.startsWith('$') && part.length > 1) {
          return (
            <span
              key={idx}
              className="inline-block px-1.5 py-0.2 rounded-md font-mono font-bold text-xs bg-surface border border-border-custom text-text-primary shadow-2xs mx-0.5"
            >
              {part}
            </span>
          );
        }
        return part;
      })}
    </>
  );
}

function HeadingIcon({ text }: { text: string }) {
  const t = text.toLowerCase();
  if (t.includes('pelosi') || t.includes('stock act') || t.includes('kongres')) {
    return <Landmark size={15} className="text-info shrink-0" />;
  }
  if (t.includes('wskaźnik') || t.includes('porównanie') || t.includes('wycen')) {
    return <BarChart3 size={15} className="text-primary shrink-0" />;
  }
  if (t.includes('szort') || t.includes('knf')) {
    return <ShieldAlert size={15} className="text-danger shrink-0" />;
  }
  return <Sparkles size={15} className="text-primary shrink-0" />;
}

export const AnalystMessageRenderer: FC<Props> = ({ content }) => {
  const blocks = useMemo(() => parseBlocks(content), [content]);

  return (
    <div className="space-y-3.5 text-xs sm:text-sm leading-relaxed">
      {blocks.map((block, idx) => {
        if (block.type === 'heading') {
          return (
            <div key={idx} className="pt-2 pb-1 border-b border-border-custom/50 flex items-center gap-2">
              <HeadingIcon text={block.text} />
              <h4 className="font-extrabold text-sm sm:text-base text-text-primary tracking-tight">
                {block.text}
              </h4>
            </div>
          );
        }

        if (block.type === 'table') {
          return <AnalystTable key={idx} headers={block.headers} rows={block.rows} />;
        }

        if (block.type === 'trade') {
          return <AnalystTradeCard key={idx} {...block.data} />;
        }

        if (block.type === 'disclaimer') {
          return (
            <div
              key={idx}
              className="mt-4 p-3 rounded-xl bg-surface-2/60 border border-border-custom text-2xs text-text-muted flex items-center gap-2"
            >
              <ShieldCheck size={14} className="text-text-muted shrink-0" />
              <span>{block.text}</span>
            </div>
          );
        }

        // Regular text line
        const isBullet = block.text.startsWith('* ') || block.text.startsWith('- ') || block.text.startsWith('• ');
        const cleanText = isBullet ? block.text.slice(2).trim() : block.text;

        if (isBullet) {
          return (
            <div key={idx} className="flex items-start gap-2.5 pl-1.5 py-0.5">
              <ArrowRight size={12} className="text-primary/70 shrink-0 mt-1" />
              <div className="flex-1 text-text-secondary">{renderFormattedLine(cleanText)}</div>
            </div>
          );
        }

        return (
          <p key={idx} className="text-text-secondary">
            {renderFormattedLine(block.text)}
          </p>
        );
      })}
    </div>
  );
};
