import { format, parseISO } from 'date-fns';
import { MATRIX_LAYERS } from './multiDomainMatrixLayers';
import type { DayMatrixDetail, MatrixLayerId } from './multiDomainMatrixTypes';

const DOW_LABELS = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb', 'Nd'];

interface Props {
  weeks: DayMatrixDetail[][];
  selectedLayers: Set<MatrixLayerId>;
  onHoverDay: (day: DayMatrixDetail, rect: DOMRect) => void;
  onLeaveDay: () => void;
}

export function MultiDomainMatrixGrid({
  weeks,
  selectedLayers,
  onHoverDay,
  onLeaveDay,
}: Props) {
  return (
    <div className="pt-2">
      <div className="flex gap-1.5 items-start">
        {/* Day of week column labels */}
        <div className="flex flex-col gap-[var(--ds-arbitrary-5px-coll-2)] pt-7 mr-1">
          {DOW_LABELS.map(d => (
            <div key={d} className="text-2xs text-text-muted w-4 h-3.5 flex items-center">
              {d}
            </div>
          ))}
        </div>

        {/* Weeks columns */}
        <div className="flex gap-1 flex-1 overflow-hidden">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-[var(--ds-arbitrary-5px-coll-2)] flex-1">
              <div className="text-2xs text-text-muted h-6 flex items-end pb-0.5 font-mono">
                {wi % 3 === 0 ? format(parseISO(week[0].date), 'dd.MM') : ''}
              </div>

              {week.map((day, di) => {
                const matchingActiveLayers = MATRIX_LAYERS.filter(
                  l => selectedLayers.has(l.id) && day.activeLayers.includes(l.id)
                );

                const onEnter = (e: React.MouseEvent<HTMLDivElement>) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  onHoverDay(day, rect);
                };

                if (day.isFuture) {
                  return (
                    <div
                      key={di}
                      className="h-3.5 rounded-sm bg-transparent border border-border-custom/20 cursor-default"
                      onMouseEnter={onEnter}
                      onMouseLeave={onLeaveDay}
                    />
                  );
                }

                if (matchingActiveLayers.length === 0) {
                  return (
                    <div
                      key={di}
                      className={`h-3.5 rounded-sm bg-border-custom/40 transition-opacity hover:opacity-80 cursor-pointer ${
                        day.isToday ? 'ring-1 ring-primary' : ''
                      }`}
                      onMouseEnter={onEnter}
                      onMouseLeave={onLeaveDay}
                    />
                  );
                }

                if (matchingActiveLayers.length === 1) {
                  return (
                    <div
                      key={di}
                      className={`h-3.5 rounded-sm ${matchingActiveLayers[0].colorClass} transition-opacity hover:opacity-80 cursor-pointer ${
                        day.isToday ? 'ring-1 ring-white' : ''
                      }`}
                      onMouseEnter={onEnter}
                      onMouseLeave={onLeaveDay}
                    />
                  );
                }

                return (
                  <div
                    key={di}
                    className={`h-3.5 rounded-sm overflow-hidden flex transition-opacity hover:opacity-80 cursor-pointer ${
                      day.isToday ? 'ring-1 ring-white' : ''
                    }`}
                    onMouseEnter={onEnter}
                    onMouseLeave={onLeaveDay}
                  >
                    {matchingActiveLayers.map((layer, idx) => (
                      <div
                        key={idx}
                        className={`h-full flex-1 ${layer.colorClass}`}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
