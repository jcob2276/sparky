import type { WeekBalance } from '../../../lib/health/weekBalance';

const fmt = (n: number) => n.toLocaleString('pl-PL');

/** Bilans tygodnia pon–nd: ile zjedzone z budżetu tygodnia i ile zostało, żeby dalej chudnąć. */
export default function WeekBalanceStrip({ week }: { week: WeekBalance }) {
  const ratio = week.budget > 0 ? Math.min(1, Math.max(0, week.eaten / week.budget)) : 0;
  const over = week.remaining < 0;
  return (
    <div className="space-y-1 border-t border-border-custom/40 pt-2" aria-label="Bilans tygodnia">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-2xs font-black uppercase tracking-wider text-text-muted">Tydzień pon–nd</span>
        <span className="text-2xs font-semibold tabular-nums text-text-secondary">
          <span className="text-xs font-black text-text-primary">{fmt(week.eaten)}</span> / {fmt(week.budget)} kcal
        </span>
      </div>
      <span className="meal-bar-track block h-1.5 overflow-hidden rounded-full">
        <span
          className={`block h-full w-full rounded-full transition-transform duration-300 ease-out motion-reduce:transition-none ${over ? 'bg-warning' : 'bg-primary'}`}
          style={{ transform: `scaleX(${ratio})`, transformOrigin: 'left' }}
        />
      </span>
      <p className="text-xs font-semibold leading-snug text-text-muted">
        {over ? 'Ponad budżet o ' : 'Zostało '}
        <span className="font-black tabular-nums text-text-primary">{fmt(Math.abs(week.remaining))} kcal</span>
        {week.perDayLeft != null && !over && (
          <> · ok. <span className="font-black tabular-nums text-text-primary">{fmt(week.perDayLeft)}</span>/dzień przez {week.daysLeft} {week.daysLeft === 1 ? 'dzień' : 'dni'}</>
        )}
      </p>
      {week.missingDays > 0 && (
        <p className="text-2xs font-semibold text-warning">
          Brak wpisów z {week.missingDays} {week.missingDays === 1 ? 'dnia' : 'dni'}: realnie zostało mniej.
        </p>
      )}
    </div>
  );
}
