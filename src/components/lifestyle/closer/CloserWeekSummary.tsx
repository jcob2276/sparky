import type { CloserDailyLogRow } from '../../../lib/closer/closerApi';
import type { CloserWeeklyTargets } from '../../../lib/closer/closerDayModel';
import { sumWeek } from '../../../lib/closer/closerDayModel';
import { formatPhoneUsageDuration } from '../../../lib/date';
export default function CloserWeekSummary({ logs, targets }: { logs: CloserDailyLogRow[]; targets: CloserWeeklyTargets }) {
  const sums = sumWeek(logs);
  const hours = logs.reduce((total, row) => total + Number(row.work_hours), 0);
  return <section aria-label="Wyniki tygodnia" className="space-y-4">
    <div className="grid grid-cols-2 gap-5 border-y border-border-custom py-5">
      {[{ label: 'Umówienia', value: sums.appointments, target: targets.appointments },
        { label: 'Rozmowy sprzedażowe', value: sums.salesCalls, target: targets.salesCalls }].map(item =>
        <div key={item.label} className="min-w-0 space-y-2">
          <p className="min-h-12 text-sm text-text-secondary">{item.label}</p>
          <p className="text-3xl font-semibold tracking-tight tabular-nums text-text-primary">{item.value}<span className="ml-2 text-sm font-normal text-text-secondary">/ {item.target}</span></p>
          <div role="progressbar" aria-label={item.label} aria-valuenow={item.value} aria-valuemin={0} aria-valuemax={Math.max(item.target, item.value)}
            className="h-1.5 overflow-hidden rounded-full bg-surface-3">
            <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, item.value / item.target * 100)}%` }} />
          </div>
          <p className="text-xs text-text-secondary">{item.value >= item.target ? 'Cel tygodnia osiągnięty' : `Do celu: ${item.target - item.value}`}</p>
        </div>)}
    </div>
    <dl className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
      <div><dt className="text-text-secondary">Rozmowy odebrane</dt><dd className="mt-1 font-semibold tabular-nums text-text-primary">{sums.dials}</dd></div>
      <div><dt className="text-text-secondary">Czas pracy</dt><dd className="mt-1 font-semibold tabular-nums text-text-primary">{formatPhoneUsageDuration(hours * 60)}</dd></div>
      <div><dt className="text-text-secondary">Zapisane sprzedaże</dt><dd className="mt-1 font-semibold tabular-nums text-text-primary">{sums.salesClosed}</dd></div>
    </dl>
  </section>;
}
