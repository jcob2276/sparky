import { Phone } from 'lucide-react';
import Skeleton from '../ui/Skeleton';
import { getTodayWarsaw, getWeekStartWarsaw } from '../../lib/date';
import { CLOSER_WEEKLY_TARGETS } from '../../lib/closer/closerDayModel';
import { useUserId } from '../../store/useStore';
import { useWeekSalesSums } from './salesNumbers/useWeekSalesSums';
import { useWeekEnteredDays } from './salesNumbers/useWeekEnteredDays';

function Cell({ label, value, target }: { label: string; value: number; target?: number }) {
  return (
    <div className="rounded-2xl border border-border-custom/40 bg-surface/50 p-3">
      <p className="text-2xs font-semibold tracking-wide text-text-muted">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums text-text-primary">
        {value}
        {target != null && <span className="ml-1 text-2xs font-bold text-text-muted">z {target}</span>}
      </p>
    </div>
  );
}

const rate = (part: number, whole: number) => (whole > 0 ? `${Math.round((part / whole) * 100)}%` : '—');

/** Lejek sprzedaży tygodnia pon–nd: rozmowy odebrane → umówieni, rozmowy sprzedażowe → sprzedaże, z brakującymi dniami. */
export default function WeeklySalesPulse() {
  const userId = useUserId();
  const today = getTodayWarsaw();
  const weekStart = getWeekStartWarsaw(today);
  const { sums, loading } = useWeekSalesSums(userId, weekStart);
  const { missingDays } = useWeekEnteredDays(userId, weekStart, today);
  const empty = sums.dials + sums.appointments + sums.salesCalls + sums.salesClosed === 0;

  return (
    <section className="space-y-3 rounded-3xl border border-border-custom/60 bg-surface/70 p-4">
      <p className="flex items-center gap-1.5 text-2xs font-semibold tracking-wide text-text-muted">
        <Phone size={12} className="text-primary" /> Sprzedaż <span className="font-semibold normal-case tracking-normal">· pon–nd</span>
      </p>
      {loading ? (
        <Skeleton variant="block" className="h-20" />
      ) : empty ? (
        <p className="text-sm text-text-secondary">Brak wpisanych liczb w tym tygodniu. Wpiszesz je w domknięciu dnia.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2">
            <Cell label="Rozmowy odebrane" value={sums.dials} />
            <Cell label="Umówieni" value={sums.appointments} target={CLOSER_WEEKLY_TARGETS.appointments} />
            <Cell label="Rozmowy sprzedażowe" value={sums.salesCalls} target={CLOSER_WEEKLY_TARGETS.salesCalls} />
            <Cell label="Sprzedaże" value={sums.salesClosed} />
          </div>
          <p className="text-xs font-semibold text-text-secondary">
            Z rozmowy odebranej na umówienie {rate(sums.appointments, sums.dials)} · z rozmowy na sprzedaż {rate(sums.salesClosed, sums.salesCalls)}
          </p>
        </>
      )}
      {missingDays > 0 && !loading && (
        <p className="text-2xs font-semibold text-warning">
          Brak liczb z {missingDays} {missingDays === 1 ? 'dnia' : 'dni'} (bez dzisiejszego): suma jest zaniżona.
        </p>
      )}
    </section>
  );
}
