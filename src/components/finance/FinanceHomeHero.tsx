import { useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, type LucideIcon } from 'lucide-react';
import type { PortfolioTotals } from '@vanguard/domain';
import { formatPln } from '../../lib/finance/formatMoney';
import { Pressable } from '../ui/ControlPrimitives';
import { Switch } from '../ui/Switch';
import type { FinanceMetrics } from './useFinanceMetrics';

type Segment = 'net' | 'invest' | 'bank' | 'cash';

const SEGMENTS: Array<{ key: Segment; label: string }> = [
  { key: 'net', label: 'Majątek' },
  { key: 'invest', label: 'Inwestycje' },
  { key: 'bank', label: 'Konta' },
  { key: 'cash', label: 'Gotówka' },
];

interface FinanceHomeHeroProps {
  metrics: FinanceMetrics;
  portfolio: PortfolioTotals;
  hasHoldings: boolean;
  hasAccounts: boolean;
  onQuickEntry: (kind: 'expense' | 'income') => void;
}

function ActionButton({ icon: Icon, label, onClick }: { icon: LucideIcon; label: string; onClick: () => void }) {
  return (
    <Pressable type="button" onClick={onClick} className="group flex w-16 flex-col items-center gap-2 text-xs font-semibold text-text-primary">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-background/40 ring-1 ring-text-primary/10 backdrop-blur-sm transition-transform duration-[var(--motion-instant)] group-active:scale-[var(--scale-pressed-strong)]">
        <Icon size={22} aria-hidden="true" />
      </span>
      {label}
    </Pressable>
  );
}

function changeLine(change: number, pct: number | null): { text: string; tone: string } {
  const sign = change > 0 ? '+' : change < 0 ? '−' : '';
  const percent = pct == null ? '' : ` (${sign}${Math.abs(pct).toFixed(2).replace('.', ',')}%)`;
  return {
    text: `${sign}${formatPln(Math.abs(change), 2)}${percent} wg ostatnich notowań`,
    tone: change > 0 ? 'text-success' : change < 0 ? 'text-danger' : 'text-text-secondary',
  };
}

export function FinanceHomeHero({ metrics, portfolio, hasHoldings, hasAccounts, onQuickEntry }: FinanceHomeHeroProps) {
  const [segment, setSegment] = useState<Segment>('net');
  const [includeSavings, setIncludeSavings] = useState(false);
  const excludedSavings = includeSavings ? 0 : metrics.savingsCash;
  const amounts: Record<Segment, number> = { net: metrics.netWorth - excludedSavings, invest: metrics.investments, bank: metrics.bankCash + (includeSavings ? metrics.savingsCash : 0), cash: metrics.physicalCash };
  const labels: Record<Segment, string> = { net: excludedSavings ? 'Majątek bez oszczędności' : 'Majątek netto', invest: 'Wartość inwestycji', bank: includeSavings ? 'Środki na kontach i oszczędności' : 'Środki na kontach', cash: 'Gotówka fizyczna' };
  const amount = amounts[segment];
  const label = labels[segment];
  const showChange = (segment === 'net' || segment === 'invest') && hasHoldings && !portfolio.unquotedCount;
  const isUnset = amount === 0 && !hasAccounts && !hasHoldings;
  const line = changeLine(portfolio.dayChangePln, portfolio.dayChangePct);

  return (
    <section className="space-y-6 text-center" aria-label={label}>
      <div className="mx-auto grid w-full max-w-lg grid-cols-4 gap-1" role="group" aria-label="Widok">
        {SEGMENTS.map((item) => (
          <Pressable
            key={item.key}
            type="button"
            onClick={() => setSegment(item.key)}
            aria-pressed={segment === item.key}
            className={`min-h-11 rounded-full px-1 text-xs font-semibold transition-colors duration-[var(--motion-fast)] sm:px-3 sm:text-sm ${segment === item.key ? 'bg-text-primary text-background' : 'bg-background/40 text-text-secondary'}`}
          >
            {item.label}
          </Pressable>
        ))}
      </div>

      <div className="space-y-1.5">
        <p className="text-sm text-text-secondary">{label}</p>
        <p className="ui-num text-[length:var(--finance-display-size)] font-semibold tabular-nums leading-[var(--line-height-display)] tracking-[var(--tracking-display)]">
          {isUnset ? '—' : formatPln(amount)}
        </p>
        {isUnset ? (
          <p className="mx-auto min-h-5 max-w-xs text-sm font-medium text-text-muted">
            Dodaj konto w ustawieniach finansów, a pokażemy tu stan.
          </p>
        ) : (
          <p className={`min-h-5 text-sm font-medium tabular-nums ${showChange ? line.tone : 'text-transparent'}`} aria-hidden={!showChange}>
            {showChange ? line.text : '.'}
          </p>
        )}
      </div>

      {metrics.savingsCash > 0 && (
        <div className="flex justify-center">
          <Switch label="Uwzględnij oszczędności" checked={includeSavings} onChange={event => setIncludeSavings(event.target.checked)} />
        </div>
      )}

      <div className="mx-auto flex justify-center gap-8">
        <ActionButton icon={ArrowUpRight} label="Wydatek" onClick={() => onQuickEntry('expense')} />
        <ActionButton icon={ArrowDownLeft} label="Wpływ" onClick={() => onQuickEntry('income')} />
      </div>
    </section>
  );
}
