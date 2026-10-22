import { useMemo } from 'react';
import type { ValuedHolding } from '@vanguard/domain';
import { Pressable } from '../ui/ControlPrimitives';

interface FinanceTopMoversProps {
  holdings: ValuedHolding[];
  onShowAll: () => void;
}

const MAX_MOVERS = 8;
const MIN_BADGE = 3;
const MAX_BADGE = 5;

/** Najkrótszy unikalny prefiks symbolu (3–5 znaków), żeby podobne ETF-y nie dostały tego samego znaczka. */
function badgeFor(label: string, all: string[]): string {
  for (let length = MIN_BADGE; length < MAX_BADGE; length++) {
    const prefix = label.slice(0, length);
    if (all.filter((other) => other.startsWith(prefix)).length === 1) return prefix;
  }
  return label.slice(0, MAX_BADGE);
}

function shortTicker(ticker: string): string {
  return ticker.replace(/\.(WA|DE|L|AS|US|PL|UK)$/i, '');
}

export function FinanceTopMovers({ holdings, onShowAll }: FinanceTopMoversProps) {
  const movers = useMemo(
    () => holdings
      .filter((item) => item.dayChangePct != null)
      .sort((a, b) => Math.abs(b.dayChangePct ?? 0) - Math.abs(a.dayChangePct ?? 0))
      .slice(0, MAX_MOVERS),
    [holdings],
  );
  if (movers.length === 0) return null;
  const labels = movers.map((item) => shortTicker(item.ticker));

  return (
    <section aria-label="Najwięksi ruszający dziś" className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-base font-semibold">Dziś najbardziej się ruszają</h2>
        <Pressable type="button" onClick={onShowAll} className="text-sm font-semibold text-primary">Portfel</Pressable>
      </div>
      <ul className="no-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 pb-1">
        {movers.map((item, index) => {
          const change = item.dayChangePct ?? 0;
          const up = change >= 0;
          const label = labels[index];
          return (
            <li key={item.id} className="flex w-16 shrink-0 flex-col items-center gap-1.5">
              <span className={`flex h-16 w-16 items-center justify-center rounded-full bg-surface-1 text-xs font-bold ring-2 ${up ? 'ring-success/60' : 'ring-danger/60'}`}>
                {badgeFor(label, labels)}
              </span>
              <span className="w-full truncate text-center text-xs font-medium text-text-secondary">{label}</span>
              <span className={`text-xs font-semibold tabular-nums ${up ? 'text-success' : 'text-danger'}`}>
                {up ? '+' : '−'}{Math.abs(change).toFixed(2).replace('.', ',')}%
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
