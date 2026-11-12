import { useState } from 'react';
import type { PortfolioTotals } from '@vanguard/domain';
import { formatPln } from '../../lib/finance/formatMoney';
import { Money } from './FinanceMoney';
import Tabs from '../ui/Tabs';
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
}

function changeLine(change: number, pct: number | null): { text: string; tone: string } {
  const sign = change > 0 ? '+' : change < 0 ? '−' : '';
  const percent = pct == null ? '' : ` (${sign}${Math.abs(pct).toFixed(2).replace('.', ',')}%)`;
  return {
    text: `${sign}${formatPln(Math.abs(change), 2)}${percent} wg ostatnich notowań`,
    tone: change > 0 ? 'text-success' : change < 0 ? 'text-danger' : 'text-text-secondary',
  };
}

export function FinanceHomeHero({ metrics, portfolio, hasHoldings, hasAccounts }: FinanceHomeHeroProps) {
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
    <section className="rounded-3xl bg-surface-1 px-4 py-6 text-center sm:px-6 sm:py-8 space-y-6" aria-label={label}>
      <Tabs className="mx-auto max-w-md" tabs={SEGMENTS} active={segment} onChange={key => setSegment(key as Segment)} />

      <div className="space-y-1.5">
        <p className="text-sm text-text-secondary">{label}</p>
        <p className="ui-num text-[length:var(--finance-display-size)] font-semibold tabular-nums leading-[var(--line-height-display)] tracking-[var(--tracking-display)]">
          {isUnset ? '—' : <Money value={amount} />}
        </p>
        {isUnset ? (
          <p className="mx-auto min-h-5 max-w-xs text-sm font-medium text-text-muted">
            Dodaj konto w ustawieniach finansów, a pokażemy tu stan.
          </p>
        ) : (
          <p className="flex min-h-7 justify-center" aria-hidden={!showChange}>
            {showChange && <span className={`rounded-full bg-text-primary/[0.06] px-3 py-1 text-sm font-medium tabular-nums ${line.tone}`}>{line.text}</span>}
          </p>
        )}
      </div>

      {metrics.savingsCash > 0 && (
        <div className="flex flex-col items-center gap-1">
          <Switch label="Uwzględnij oszczędności" checked={includeSavings} onChange={event => setIncludeSavings(event.target.checked)} />
          <p className="text-xs text-text-muted">
            {includeSavings ? `W kwocie: konta, inwestycje, gotówka i oszczędności (${formatPln(metrics.savingsCash)}).` : `Bez oszczędności (${formatPln(metrics.savingsCash)}): konta, inwestycje i gotówka.`}
          </p>
        </div>
      )}
    </section>
  );
}
