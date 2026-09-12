/**
 * @component TerminyYearDistribution
 * @role 12-miesięczny horyzont rozkładu obowiązków w roku.
 *       Pozwala natychmiast zauważyć spiętrzenia terminów (np. podatki + ubezpieczenia w marcu)
 *       oraz filtrować widok do konkretnego miesiąca.
 */
import { Pressable } from '../ui/ControlPrimitives';
import { CalendarRange, X } from 'lucide-react';
import { getMonthlyCounts, type DerivedObligation } from './terminyDerived';

const MONTH_NAMES = [
  'Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze',
  'Lip', 'Sie', 'Wrz', 'Paź', 'Lis', 'Gru'
];

interface Props {
  monthlyCounts?: Record<number, number>;
  rows?: DerivedObligation[];
  selectedMonth: number | null;
  onSelectMonth: (month: number | null) => void;
  currentMonth?: number;
}

export function TerminyYearDistribution({
  monthlyCounts: initialCounts,
  rows,
  selectedMonth,
  onSelectMonth,
  currentMonth = new Date().getMonth() + 1,
}: Props) {
  const counts = initialCounts ?? (rows ? getMonthlyCounts(rows) : {});
  const totalInYear = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <section aria-label="Rozkład terminów w roku" className="rounded-[22px] border border-border-custom/30 bg-surface-solid/60 backdrop-blur-md p-4 shadow-xs space-y-3">
      <div className="flex items-center justify-between px-0.5">
        <div className="flex items-center gap-2">
          <CalendarRange size={15} className="text-primary" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">
            Rozkład w roku ({totalInYear} {totalInYear === 1 ? 'termin' : totalInYear >= 2 && totalInYear <= 4 ? 'terminy' : 'terminów'})
          </h3>
        </div>
        {selectedMonth !== null && (
          <Pressable
            onClick={() => onSelectMonth(null)}
            className="flex items-center gap-1 text-2xs font-semibold text-primary hover:underline"
            aria-label="Pokaż wszystkie miesiące"
          >
            <span>Wszystkie miesiące</span>
            <X size={12} />
          </Pressable>
        )}
      </div>

      <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5">
        {MONTH_NAMES.map((name, idx) => {
          const mNum = idx + 1;
          const count = counts[mNum] || 0;
          const isSelected = selectedMonth === mNum;
          const isCurrent = currentMonth === mNum;
          const hasItems = count > 0;

          return (
            <Pressable
              key={name}
              onClick={() => {
                if (!hasItems && !isSelected) return;
                onSelectMonth(isSelected ? null : mNum);
              }}
              aria-label={`${name}: ${count} terminów`}
              title={`${name}: ${count} ${count === 1 ? 'termin' : 'terminów'}${isCurrent ? ' (bieżący miesiąc)' : ''}`}
              className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all duration-150 relative text-center ${
                isSelected
                  ? 'bg-primary text-on-accent font-bold shadow-xs scale-[1.02]'
                  : isCurrent
                  ? 'border border-primary/40 bg-primary/5 hover:bg-primary/10'
                  : hasItems
                  ? 'bg-surface-2/80 hover:bg-surface-3 text-text-primary hover:scale-[1.02]'
                  : 'bg-surface-solid/20 text-text-muted/40 cursor-default opacity-60'
              }`}
            >
              <span className={`text-2xs font-bold uppercase tracking-tight ${
                isSelected ? 'text-on-accent' : isCurrent ? 'text-primary' : 'text-text-muted'
              }`}>
                {name}
              </span>
              <span className={`mt-0.5 text-xs font-black tabular-nums ${
                isSelected ? 'text-on-accent' : hasItems ? 'text-text-primary' : 'text-text-muted/30'
              }`}>
                {count}
              </span>
              {isCurrent && !isSelected && (
                <span className="absolute -bottom-1 h-1 w-1 rounded-full bg-primary" />
              )}
            </Pressable>
          );
        })}
      </div>
    </section>
  );
}
