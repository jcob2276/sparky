import { FC, useMemo, useState } from 'react';
import type { GpwInsiderDayCell } from '../../lib/investments/gpwInsidersService';
import { formatDotDate } from './gpwInsidersFormat';

interface Props {
  cells: GpwInsiderDayCell[];
  floor: string;
  className?: string;
}

const MONTHS = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'];

/** Poniedziałek = 0 (siatka tygodniowa zaczyna się od poniedziałku). */
function weekdayIndex(iso: string): number {
  return (new Date(`${iso}T00:00:00Z`).getUTCDay() + 6) % 7;
}

function colorClass(count: number, max: number): string {
  if (count <= 0) return 'bg-surface-3';
  const ratio = count / Math.max(max, 1);
  if (ratio > 0.75) return 'bg-primary';
  if (ratio > 0.5) return 'bg-primary/80';
  if (ratio > 0.25) return 'bg-primary/50';
  return 'bg-primary/25';
}

export const GpwInsidersHeatmap: FC<Props> = ({ cells, floor, className = '' }) => {
  const [hovered, setHovered] = useState<GpwInsiderDayCell | null>(null);
  const max = useMemo(() => cells.reduce((m, c) => Math.max(m, c.count), 0), [cells]);
  const lead = cells[0] ? weekdayIndex(cells[0].date) : 0;
  const months = useMemo(
    () => [...new Set(cells.map((c) => Number(c.date.slice(5, 7)) - 1))].map((m) => MONTHS[m]),
    [cells],
  );

  return (
    <section className={`bg-surface border border-border-custom/70 rounded-2xl p-4 sm:p-5 shadow-2xs ${className}`}>
      <div className="mb-4">
        <h2 className="text-sm sm:text-base font-bold text-text-primary tracking-tight">
          Natężenie zawiadomień MAR od 1 stycznia {floor.slice(0, 4)}
        </h2>
        <p className="text-2xs text-text-muted mt-0.5">
          Dzienna liczba transakcji menedżerskich na GPW (data transakcji) · kolor względem dnia szczytowego ({max})
        </p>
      </div>

      <div className="grid grid-flow-col grid-rows-7 gap-1 overflow-x-auto pb-2" role="img"
        aria-label={`Mapa cieplna zawiadomień MAR, szczyt ${max} dziennie`}>
        {Array.from({ length: lead }, (_, i) => <span key={`pad-${i}`} className="w-3 h-3 sm:w-3.5 sm:h-3.5" />)}
        {cells.map((cell) => (
          <span
            key={cell.date}
            title={`${formatDotDate(cell.date)}: ${cell.count}`}
            onMouseEnter={() => setHovered(cell)}
            onMouseLeave={() => setHovered(null)}
            className={`w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-2xs ${colorClass(cell.count, max)}`}
          />
        ))}
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-2xs font-mono text-text-muted border-t border-border-custom/40 pt-2">
        {hovered ? (
          <span className="text-text-primary font-semibold">
            {formatDotDate(hovered.date)}: <span className="text-primary">{hovered.count}</span> zawiadomień
          </span>
        ) : (
          <span>Najedź na dzień, aby zobaczyć liczbę zgłoszeń</span>
        )}
        <span>{months.join(' · ')}</span>
      </div>
    </section>
  );
};
