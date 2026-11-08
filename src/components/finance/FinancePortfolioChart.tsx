import { useMemo, useState } from 'react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { ValuedHolding } from '@vanguard/domain';
import { formatWarsawDate } from '../../lib/date';
import { formatPln } from '../../lib/finance/formatMoney';
import { HISTORY_RANGES, buildPortfolioSeries, sliceRange, summarizeRange, type HistoryRange } from '../../lib/finance/portfolioHistory';
import { usePortfolioPrices } from '../../lib/finance/portfolioHistoryApi';
import Skeleton from '../ui/Skeleton';
import Tabs from '../ui/Tabs';

const signed = (value: number, digits = 0) => `${value > 0 ? '+' : ''}${formatPln(value, digits)}`;
const pctText = (value: number | null) => (value == null ? '' : ` · ${value > 0 ? '+' : ''}${value.toFixed(2).replace('.', ',')}%`);

interface TipProps { active?: boolean; payload?: Array<{ payload: { date: string; value: number } }> }
function ChartTip({ active, payload }: TipProps) {
  const point = active ? payload?.[0]?.payload : undefined;
  if (!point) return null;
  return (
    <div className="rounded-lg border border-border-custom bg-surface-solid px-3 py-2 shadow-sm">
      <p className="text-xs text-text-muted">{formatWarsawDate(point.date)}</p>
      <p className="text-sm font-semibold tabular-nums text-text-primary">{formatPln(point.value)}</p>
    </div>
  );
}

/** Wartość dzisiejszych pozycji wstecz (obecne ilości × ceny zamknięcia), z przełącznikiem zakresu. */
export function FinancePortfolioChart({ holdings }: { holdings: ValuedHolding[] }) {
  const [range, setRange] = useState<HistoryRange>('3M');
  const tickers = useMemo(() => holdings.filter((h) => h.quantity > 0).map((h) => h.ticker), [holdings]);
  const { data, isLoading, isError } = usePortfolioPrices(tickers);
  const series = useMemo(
    () => (data ? buildPortfolioSeries(data, holdings.map((h) => ({ ticker: h.ticker, quantity: h.quantity }))) : null),
    [data, holdings],
  );
  const points = useMemo(() => (series ? sliceRange(series.points, range) : []), [series, range]);
  const change = summarizeRange(points);

  if (!tickers.length || isError) return null;
  if (isLoading) return <Skeleton variant="block" className="h-52" />;
  if (!series || series.points.length < 2) {
    return <p className="text-sm text-text-muted">Wykres pojawi się, gdy będzie dość historii cen (po kilku dniach notowań).</p>;
  }

  const rising = (change?.change ?? 0) >= 0;
  const color = rising ? 'var(--color-success)' : 'var(--color-danger)';

  return (
    <section className="space-y-3" aria-label="Wartość pozycji w czasie">
      <div>
        <p className="text-sm text-text-muted">Zmiana w wybranym okresie</p>
        {change && (
          <p className={`text-lg font-semibold tabular-nums ${rising ? 'text-success' : 'text-danger'}`}>
            {signed(change.change)}{pctText(change.pct)}
          </p>
        )}
      </div>
      <div className="h-44" role="img" aria-label={`Wykres wartości pozycji, zakres ${range}`}>
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 320, height: 176 }}>
          <AreaChart data={points} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="portfolioFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" style={{ stopColor: color, stopOpacity: 0.28 }} />
                <stop offset="100%" style={{ stopColor: color, stopOpacity: 0 }} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" hide />
            <YAxis hide domain={[(min: number) => min * 0.995, (max: number) => max * 1.005]} />
            <Tooltip content={<ChartTip />} cursor={{ stroke: 'var(--text-muted)', strokeDasharray: '3 3' }} />
            <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill="url(#portfolioFill)" dot={false} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <Tabs
        className="rounded-xl bg-surface-2 p-0.5"
        active={range}
        onChange={(key) => setRange(key as HistoryRange)}
        tabs={HISTORY_RANGES.map((r) => ({ key: r.key, label: r.label }))}
      />
      <p className="text-xs text-text-muted">
        To dzisiejsze ilości wstecz, bez zakupów, sprzedaży i wpłat. Ceny zamknięcia z notowań.
        {series.missing.length > 0 && ` Bez historii cen: ${series.missing.join(', ')}.`}
      </p>
    </section>
  );
}
