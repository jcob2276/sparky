/** Neutralna siatka dni: kolumna = tydzień (pn–nd), poziom 0–4 to odcień akcentu. Brak danych to pusta komórka, nigdy poziom 0. */
export interface DayGridCell {
  key: string;
  /** 0–4 gdy dzień ma dane; null gdy brak danych (brak planu, brak zapisu). */
  level: 0 | 1 | 2 | 3 | 4 | null;
  /** Dzień z przyszłości: rysowany jako niewidoczny slot. */
  future?: boolean;
  label: string;
}

interface DayGridProps {
  /** Kolumny od najstarszego tygodnia; każda ma 7 komórek od poniedziałku. */
  weeks: DayGridCell[][];
  ariaLabel: string;
  className?: string;
}

function cellClass(cell: DayGridCell): string {
  if (cell.future) return 'border border-transparent';
  if (cell.level === null) return 'border border-dashed border-border-custom';
  return cell.level === 0 ? 'border border-border-custom' : 'border border-transparent';
}

function cellStyle(cell: DayGridCell): React.CSSProperties | undefined {
  if (cell.future || cell.level === null) return undefined;
  return { background: `color-mix(in srgb, var(--primary) ${cell.level * 25}%, var(--surface-3))` };
}

export default function DayGrid({ weeks, ariaLabel, className = '' }: DayGridProps) {
  return (
    <div role="img" aria-label={ariaLabel}
      className={`grid w-full gap-1 ${className}`}
      style={{ gridTemplateColumns: `repeat(${weeks.length}, minmax(0, 1fr))` }}>
      {weeks.map((week, index) => (
        <div key={index} className="grid gap-1" style={{ gridTemplateRows: 'repeat(7, minmax(0, 1fr))' }}>
          {week.map(cell => (
            <span key={cell.key} title={cell.label} aria-hidden="true"
              className={`aspect-square w-full rounded-[var(--radius-sm)] ${cellClass(cell)}`}
              style={cellStyle(cell)} />
          ))}
        </div>
      ))}
    </div>
  );
}
