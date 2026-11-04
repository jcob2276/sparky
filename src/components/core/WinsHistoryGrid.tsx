import { useUserId } from '../../store/useStore';
import { useWinsHistory, type WinsHistoryDay } from '../../lib/winsHistory';
import { pluralPl } from '../../lib/formatPl';
import DayGrid, { type DayGridCell } from '../ui/DayGrid';

const WEEKS = 8;

function toCell(day: WinsHistoryDay): DayGridCell {
  if (day.future) return { key: day.date, level: null, future: true, label: day.date };
  if (day.planned === 0) return { key: day.date, level: null, label: `${day.date}: brak planu` };
  const level = Math.min(4, Math.round((day.done / day.planned) * 4)) as 0 | 1 | 2 | 3 | 4;
  return { key: day.date, level, label: `${day.date}: ${day.done} z ${day.planned}` };
}

/** Historia „Pięciu zwycięstw” z ostatnich tygodni: odcień = ukończone z zaplanowanych; pusta komórka = brak planu. */
export default function WinsHistoryGrid() {
  const userId = useUserId();
  const { data } = useWinsHistory(userId ?? '', WEEKS);
  if (!userId || !data) return null;

  const days = data.flat().filter(day => !day.future && day.planned > 0);
  const done = days.reduce((sum, day) => sum + day.done, 0);
  const planned = days.reduce((sum, day) => sum + day.planned, 0);
  const summary = planned > 0
    ? `${done} z ${planned} zadań w ${days.length} ${pluralPl(days.length, 'dniu', 'dniach', 'dniach')} z planem`
    : 'Brak planów w tym okresie';

  return (
    <section aria-label="Historia zwycięstw" className="space-y-2">
      <h3 className="px-1 text-xs font-semibold text-text-muted">Ostatnie {WEEKS} tygodni</h3>
      <div className="ui-card--surface space-y-3 rounded-[var(--radius-grouped)] bg-surface-solid p-4">
        <DayGrid weeks={data.map(week => week.map(toCell))} ariaLabel={`Zwycięstwa z ostatnich ${WEEKS} tygodni. ${summary}`} />
        <p className="text-2xs font-semibold text-text-muted">{summary}. Pusta komórka to dzień bez planu.</p>
      </div>
    </section>
  );
}
