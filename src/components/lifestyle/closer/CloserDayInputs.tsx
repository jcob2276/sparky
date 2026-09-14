import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { PhoneCall, Clock, CalendarCheck, UserCheck } from 'lucide-react';
import { useHaptics } from '../../../hooks/useHaptics';
import type { CloserDailyLogRow } from '../../../lib/closer/closerApi';
import { getTodayWarsaw } from '../../../lib/date';

interface Props {
  dateStr: string;
  log: CloserDailyLogRow | undefined;
  onUpdate: (patch: {
    dials?: number;
    work_hours?: number;
    appointments?: number;
    sales_calls?: number;
    notes?: string | null;
  }) => void;
  disabled?: boolean;
}

export default function CloserDayInputs({
  dateStr,
  log,
  onUpdate,
  disabled = false,
}: Props) {
  const haptics = useHaptics();
  const today = getTodayWarsaw();
  const isToday = dateStr === today;
  const parsedDate = new Date(dateStr + 'T12:00:00');
  const dayNameFormatted = format(parsedDate, 'EEEE, d MMMM', { locale: pl });

  const dials = log?.dials ?? 0;
  const workHours = Number(log?.work_hours ?? 0);
  const appointments = log?.appointments ?? 0;
  const salesCalls = log?.sales_calls ?? 0;

  const changeDials = (delta: number) => {
    haptics.light();
    onUpdate({ dials: Math.max(0, dials + delta) });
  };

  const changeWorkHours = (delta: number) => {
    haptics.light();
    const next = Math.max(0, Math.round((workHours + delta) * 10) / 10);
    onUpdate({ work_hours: next });
  };

  const changeAppointments = (delta: number) => {
    haptics.selection();
    onUpdate({ appointments: Math.max(0, appointments + delta) });
  };

  const changeSalesCalls = (delta: number) => {
    haptics.selection();
    onUpdate({ sales_calls: Math.max(0, salesCalls + delta) });
  };

  return (
    <div className="space-y-3 rounded-2xl border border-border-custom/30 bg-surface/50 p-3.5 shadow-xs">
      <div className="flex items-center justify-between gap-2 border-b border-border-custom/20 pb-2.5">
        <div>
          <p className="text-xs font-bold text-text-primary capitalize flex items-center gap-1.5">
            {dayNameFormatted}
            {isToday && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-3xs font-black uppercase tracking-wider text-primary">
                Dzisiaj
              </span>
            )}
          </p>
          <p className="text-3xs text-text-muted">Wprowadź dzienne statystyki pracy i diali</p>
        </div>
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2">
        {/* Dials */}
        <div className="rounded-xl border border-border-custom/25 bg-surface-raised/30 p-2.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-bold text-text-primary">
              <PhoneCall size={13} className="text-primary" /> Diale
            </span>
            <span className="text-base font-black text-primary">{dials}</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={disabled || dials <= 0}
              onClick={() => changeDials(-5)}
              className="flex-1 rounded-lg border border-border-custom/30 bg-surface py-1 text-2xs font-bold text-text-muted hover:text-text-primary active:scale-95 disabled:opacity-30"
            >
              -5
            </button>
            <button
              type="button"
              disabled={disabled || dials <= 0}
              onClick={() => changeDials(-1)}
              className="flex-1 rounded-lg border border-border-custom/30 bg-surface py-1 text-2xs font-bold text-text-muted hover:text-text-primary active:scale-95 disabled:opacity-30"
            >
              -1
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => changeDials(1)}
              className="flex-1 rounded-lg border border-primary/30 bg-primary/10 py-1 text-2xs font-black text-primary hover:bg-primary/20 active:scale-95"
            >
              +1
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => changeDials(5)}
              className="flex-1 rounded-lg border border-primary/30 bg-primary/10 py-1 text-2xs font-black text-primary hover:bg-primary/20 active:scale-95"
            >
              +5
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => changeDials(10)}
              className="flex-1 rounded-lg border border-primary/30 bg-primary/10 py-1 text-2xs font-black text-primary hover:bg-primary/20 active:scale-95"
            >
              +10
            </button>
          </div>
        </div>

        {/* Work Hours */}
        <div className="rounded-xl border border-border-custom/25 bg-surface-raised/30 p-2.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-bold text-text-primary">
              <Clock size={13} className="text-amber-500" /> Czas pracy
            </span>
            <span className="text-base font-black text-text-primary">{workHours}h</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={disabled || workHours <= 0}
              onClick={() => changeWorkHours(-0.5)}
              className="flex-1 rounded-lg border border-border-custom/30 bg-surface py-1 text-2xs font-bold text-text-muted hover:text-text-primary active:scale-95 disabled:opacity-30"
            >
              -0.5h
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => changeWorkHours(0.5)}
              className="flex-1 rounded-lg border border-amber-500/30 bg-amber-500/10 py-1 text-2xs font-black text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 active:scale-95"
            >
              +0.5h
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => changeWorkHours(1)}
              className="flex-1 rounded-lg border border-amber-500/30 bg-amber-500/10 py-1 text-2xs font-black text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 active:scale-95"
            >
              +1h
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => changeWorkHours(2)}
              className="flex-1 rounded-lg border border-amber-500/30 bg-amber-500/10 py-1 text-2xs font-black text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 active:scale-95"
            >
              +2h
            </button>
          </div>
        </div>

        {/* Appointments */}
        <div className="rounded-xl border border-border-custom/25 bg-surface-raised/30 p-2.5 flex items-center justify-between">
          <div>
            <span className="flex items-center gap-1.5 text-xs font-bold text-text-primary">
              <CalendarCheck size={13} className="text-emerald-500" /> Umówienia
            </span>
            <span className="text-3xs text-text-muted">spotkania z klientami</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={disabled || appointments <= 0}
              onClick={() => changeAppointments(-1)}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-border-custom/30 bg-surface text-xs font-bold text-text-muted hover:text-text-primary active:scale-95 disabled:opacity-30"
            >
              -
            </button>
            <span className="text-base font-black text-emerald-600 dark:text-emerald-400 min-w-4 text-center">
              {appointments}
            </span>
            <button
              type="button"
              disabled={disabled}
              onClick={() => changeAppointments(1)}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-xs font-black text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 active:scale-95"
            >
              +
            </button>
          </div>
        </div>

        {/* Sales calls */}
        <div className="rounded-xl border border-border-custom/25 bg-surface-raised/30 p-2.5 flex items-center justify-between">
          <div>
            <span className="flex items-center gap-1.5 text-xs font-bold text-text-primary">
              <UserCheck size={13} className="text-indigo-500" /> Sales calle
            </span>
            <span className="text-3xs text-text-muted">przeprowadzone rozmowy</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={disabled || salesCalls <= 0}
              onClick={() => changeSalesCalls(-1)}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-border-custom/30 bg-surface text-xs font-bold text-text-muted hover:text-text-primary active:scale-95 disabled:opacity-30"
            >
              -
            </button>
            <span className="text-base font-black text-indigo-600 dark:text-indigo-400 min-w-4 text-center">
              {salesCalls}
            </span>
            <button
              type="button"
              disabled={disabled}
              onClick={() => changeSalesCalls(1)}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-indigo-500/30 bg-indigo-500/10 text-xs font-black text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/20 active:scale-95"
            >
              +
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
