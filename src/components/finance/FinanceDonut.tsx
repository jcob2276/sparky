import type { ReactNode } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import { Pressable } from '../ui/ControlPrimitives';

interface DonutSlice {
  key: string;
  label: string;
  /** Used for the slice angle; already positive. */
  amount: number;
  /** Right-hand text of the legend row, e.g. "390,00 zł · 29%". */
  value: ReactNode;
}

/** Role tokens in a fixed order, so the same share keeps the same colour in light and dark. */
const PALETTE = ['var(--primary)', 'var(--color-success)', 'var(--color-warning)', 'var(--attention)', 'var(--color-danger)',
  'color-mix(in srgb, var(--primary) 50%, var(--color-success))', 'color-mix(in srgb, var(--color-danger) 50%, var(--attention))'];
const REST = 'var(--text-muted)';

interface Props {
  slices: DonutSlice[];
  /** Small line above the central figure ("Razem", "Wydane"). */
  centerLabel: string;
  center: ReactNode;
  ariaLabel: string;
  onSelect?: (key: string) => void;
}

/**
 * Donut with the total in the middle and a legend of coloured dots below: the pattern EveryDollar, Spendee and Wallet use.
 * The legend carries every number, so the chart never has to be read on its own.
 */
export function FinanceDonut({ slices, centerLabel, center, ariaLabel, onSelect }: Props) {
  const colorOf = (index: number, key: string) => (key === '__rest' ? REST : PALETTE[index % PALETTE.length]);
  return (
    <div>
      <div className="relative mx-auto h-48 w-48" role="img" aria-label={ariaLabel}>
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 192, height: 192 }}>
          <PieChart>
            <Pie data={slices} dataKey="amount" nameKey="label" innerRadius="68%" outerRadius="100%" paddingAngle={slices.length > 1 ? 2 : 0} cornerRadius={5} stroke="none" isAnimationActive={false}>
              {slices.map((slice, index) => <Cell key={slice.key} fill={colorOf(index, slice.key)} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <p className="text-xs text-text-muted">{centerLabel}</p>
          <div className="text-2xl font-bold tracking-tight text-text-primary">{center}</div>
        </div>
      </div>
      <ul className="mt-3 divide-y divide-border-custom/15">
        {slices.map((slice, index) => {
          const row = (
            <>
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: colorOf(index, slice.key) }} aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate text-sm text-text-primary">{slice.label}</span>
              <span className="shrink-0 text-sm tabular-nums text-text-secondary">{slice.value}</span>
            </>
          );
          return (
            <li key={slice.key}>
              {onSelect && slice.key !== '__rest'
                ? <Pressable type="button" onClick={() => onSelect(slice.key)} className="flex min-h-11 w-full items-center gap-3 px-4 text-left hover:bg-text-primary/[0.04]">{row}</Pressable>
                : <div className="flex min-h-11 items-center gap-3 px-4">{row}</div>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
