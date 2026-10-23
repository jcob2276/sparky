import { FC, useMemo } from 'react';
import type { PortfolioPosition } from '../../../lib/investments/jakubPortfolioStorage';
import { buildAllocation } from '../../../lib/investments/portfolioAllocation';
import { Card } from '../../ui/Card';

interface Props {
  positions: PortfolioPosition[];
  freeCashPln: number;
}

const SLICE_COLORS = [
  'var(--color-primary)', 'var(--color-info)', 'var(--color-accent-purple)', 'var(--color-success)',
  'var(--color-warning)', 'var(--color-text-secondary)', 'var(--color-text-muted)',
];
const pct = (n: number) => `${n.toFixed(1).replace('.', ',')}%`;
const pln = (n: number) => n.toLocaleString('pl-PL', { maximumFractionDigits: 0 });

/** Donut alokacji (wartość bieżąca w PLN + gotówka) z legendą i podziałem na rynki. */
export const PortfolioAllocationCard: FC<Props> = ({ positions, freeCashPln }) => {
  const allocation = useMemo(() => buildAllocation(positions, freeCashPln), [positions, freeCashPln]);
  const starts = useMemo(() => allocation.slices.map((_, i) => allocation.slices.slice(0, i).reduce((sum, s) => sum + s.weightPct, 0)), [allocation]);
  return (
    <Card padding="1.25rem" className="space-y-4">
      <div>
        <h3 className="text-sm sm:text-base font-semibold text-text-primary tracking-tight">Alokacja portfela</h3>
        <p className="text-2xs text-text-muted">Źródło: wycena lokalna (PLN) · top 3 pozycje = {pct(allocation.top3Pct)} wartości</p>
      </div>
      {allocation.total <= 0 ? (
        <p className="text-xs text-text-muted py-6 text-center">Brak wycenionych pozycji do pokazania alokacji.</p>
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          <svg viewBox="0 0 42 42" role="img" className="w-40 h-40 shrink-0 mx-auto -rotate-90"
            aria-label={`Alokacja: ${allocation.slices.map(s => `${s.label} ${pct(s.weightPct)}`).join(', ')}`}>
            <circle cx="21" cy="21" r="15.9155" fill="none" stroke="var(--color-border-custom)" strokeWidth="5" />
            {allocation.slices.map((slice, i) => {
              const start = starts[i];
              return <circle key={slice.id} cx="21" cy="21" r="15.9155" fill="none" strokeWidth="5"
                stroke={SLICE_COLORS[i % SLICE_COLORS.length]} strokeDasharray={`${Math.max(slice.weightPct - 0.4, 0.1)} ${100 - Math.max(slice.weightPct - 0.4, 0.1)}`}
                strokeDashoffset={-start} />;
            })}
          </svg>
          <ul className="flex-1 grid grid-cols-1 gap-1.5 text-xs min-w-0">
            {allocation.slices.map((slice, i) => (
              <li key={slice.id} className="flex items-center gap-2 min-w-0">
                <span aria-hidden="true" className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: SLICE_COLORS[i % SLICE_COLORS.length] }} />
                <span className="font-mono font-semibold text-text-primary truncate">{slice.label}</span>
                <span className="ml-auto font-mono tabular-nums text-text-secondary">{pct(slice.weightPct)}</span>
                <span className="hidden sm:block w-20 text-right font-mono tabular-nums text-text-muted">{pln(slice.valuePln)} zł</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {allocation.byMarket.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex h-2 rounded-full overflow-hidden bg-surface-elevated" role="img"
            aria-label={`Podział na rynki: ${allocation.byMarket.map(m => `${m.label} ${pct(m.weightPct)}`).join(', ')}`}>
            {allocation.byMarket.map((m, i) => <div key={m.id} style={{ width: `${m.weightPct}%`, background: SLICE_COLORS[i % SLICE_COLORS.length] }} />)}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-2xs font-mono text-text-muted">
            {allocation.byMarket.map(m => <span key={m.id}>{m.label} {pct(m.weightPct)}</span>)}
          </div>
        </div>
      )}
    </Card>
  );
};
