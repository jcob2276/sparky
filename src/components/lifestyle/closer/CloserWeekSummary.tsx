import type { CloserDailyLogRow } from '../../../lib/closer/closerApi';
import { formatPhoneUsageDuration } from '../../../lib/date';
/** Liczby sprzedaży tygodnia są w karcie Sprzedaż wyżej; tu zostaje tylko czas pracy. */
export default function CloserWeekSummary({ logs }: { logs: CloserDailyLogRow[] }) {
  const hours = logs.reduce((total, row) => total + Number(row.work_hours), 0);
  return <section aria-label="Czas pracy w tygodniu" className="border-y border-border-custom py-4 text-sm">
    <span className="text-text-secondary">Czas pracy w tygodniu</span>
    <span className="ml-3 font-semibold tabular-nums text-text-primary">{formatPhoneUsageDuration(hours * 60)}</span>
  </section>;
}
