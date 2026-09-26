import { FC, useState } from 'react';

interface Props {
  className?: string;
}

interface IntensityCell {
  date: string;
  dayOfWeek: number;
  count: number;
}

// Generate realistic 90-day distribution (roughly 13 weeks)
function generate90DayCells(): IntensityCell[] {
  const cells: IntensityCell[] = [];
  const baseCounts = [
    3, 5, 8, 12, 18, 22, 14, 9, 6, 15, 27, 34, 42, 19, 11,
    8, 14, 25, 30, 21, 16, 12, 19, 28, 35, 22, 18, 14, 9,
    7, 12, 19, 26, 31, 24, 17, 13, 21, 33, 40, 28, 19, 15,
    10, 16, 23, 29, 38, 25, 18, 14, 22, 35, 48, 32, 21, 17,
    11, 15, 24, 30, 44, 29, 20, 16, 25, 39, 52, 36, 24, 19,
    14, 18, 27, 33, 49, 31, 22, 18, 28, 41, 58, 39, 27, 21,
  ];

  for (let i = 0; i < 90; i++) {
    const d = new Date(2026, 5, 15); // June 15, 2026
    d.setDate(d.getDate() + i);
    const dayStr = `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}`;
    const count = baseCounts[i % baseCounts.length] ?? 5;
    cells.push({
      date: dayStr,
      dayOfWeek: d.getDay(),
      count,
    });
  }
  return cells;
}

export const GpwInsidersHeatmap: FC<Props> = ({ className = '' }) => {
  const [cells] = useState<IntensityCell[]>(generate90DayCells);
  const [hoveredCell, setHoveredCell] = useState<IntensityCell | null>(null);

  const getColorClass = (count: number) => {
    if (count >= 40) return 'bg-primary';
    if (count >= 25) return 'bg-primary/80';
    if (count >= 15) return 'bg-primary/50';
    if (count >= 6) return 'bg-primary/25';
    return 'bg-primary/10';
  };

  return (
    <div className={`bg-surface border border-border-custom/70 rounded-2xl p-4 sm:p-5 shadow-2xs ${className}`}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-sm sm:text-base font-bold text-text-primary tracking-tight">
            Natężenie zakupów insiderów, 90 dni
          </h2>
          <p className="text-3xs text-text-muted mt-0.5">
            Dzienny rozkład transakcji osób zarządzających i rad nadzorczych na GPW
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-3xs font-mono uppercase tracking-wider text-text-muted">
            KOLOR = LICZBA TRANSAKCJI
          </span>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-xs bg-primary/10" title="1-5" />
            <span className="w-2.5 h-2.5 rounded-xs bg-primary/25" title="6-15" />
            <span className="w-2.5 h-2.5 rounded-xs bg-primary/50" title="16-25" />
            <span className="w-2.5 h-2.5 rounded-xs bg-primary/80" title="26-40" />
            <span className="w-2.5 h-2.5 rounded-xs bg-primary" title="40+" />
          </div>
        </div>
      </div>

      {/* Grid container */}
      <div className="relative">
        <div className="grid grid-flow-col grid-rows-7 gap-1 overflow-x-auto pb-2">
          {cells.map((cell, idx) => (
            <div
              key={`${cell.date}-${idx}`}
              onMouseEnter={() => setHoveredCell(cell)}
              onMouseLeave={() => setHoveredCell(null)}
              className={`w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-2xs cursor-pointer transition-transform hover:scale-125 ${getColorClass(
                cell.count
              )}`}
            />
          ))}
        </div>

        {/* Hover detail bar */}
        <div className="mt-2 flex items-center justify-between text-3xs font-mono text-text-muted border-t border-border-custom/40 pt-2">
          <div>
            {hoveredCell ? (
              <span className="text-text-primary font-semibold">
                {hoveredCell.date}: <span className="text-primary">{hoveredCell.count}</span> transakcji MAR art. 19
              </span>
            ) : (
              <span>Najedź na dzień, aby zobaczyć wolumen zgłoszeń</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span>Czerwiec 2026</span>
            <span>Lipiec 2026</span>
            <span>Sierpień 2026</span>
            <span>Wrzesień 2026</span>
          </div>
        </div>
      </div>
    </div>
  );
};
