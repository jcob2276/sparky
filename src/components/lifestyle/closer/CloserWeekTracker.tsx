import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Target, TrendingUp, PhoneCall, Clock, CalendarCheck, UserCheck } from 'lucide-react';
import { Card } from '../../ui/Card';
import {
  fetchCloserWeekLogs,
  upsertCloserDailyLog,
  type CloserDailyLogRow,
} from '../../../lib/closer/closerApi';
import { closerKeys, goalSpineKeys } from '../../../lib/queryKeys';
import { getTodayWarsaw } from '../../../lib/date';
import CloserDayStrip from './CloserDayStrip';
import CloserDayInputs from './CloserDayInputs';

interface Props {
  userId: string;
  weekStart: string;
  projectName?: string;
  isFocusSprint?: boolean;
}

export default function CloserWeekTracker({
  userId,
  weekStart,
  projectName = 'Jestem closerem (50% close rate)',
  isFocusSprint = false,
}: Props) {
  const queryClient = useQueryClient();
  const today = getTodayWarsaw();
  const [selectedDate, setSelectedDate] = useState<string>(today);

  const logsQuery = useQuery({
    queryKey: closerKeys.week(userId, weekStart),
    queryFn: () => fetchCloserWeekLogs(userId, weekStart),
    enabled: !!userId && !!weekStart,
  });

  const logs = logsQuery.data ?? [];
  const logsByDate = useMemo(() => {
    const map: Record<string, CloserDailyLogRow> = {};
    for (const l of logs) {
      map[l.date] = l;
    }
    return map;
  }, [logs]);

  const mutateLog = useMutation({
    mutationFn: async (patch: {
      dials?: number;
      work_hours?: number;
      appointments?: number;
      sales_calls?: number;
      notes?: string | null;
    }) => {
      const current = logsByDate[selectedDate];
      return upsertCloserDailyLog(userId, weekStart, {
        date: selectedDate,
        dials: patch.dials ?? current?.dials ?? 0,
        work_hours: patch.work_hours ?? Number(current?.work_hours ?? 0),
        appointments: patch.appointments ?? current?.appointments ?? 0,
        sales_calls: patch.sales_calls ?? current?.sales_calls ?? 0,
        notes: patch.notes !== undefined ? patch.notes : (current?.notes ?? null),
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: closerKeys.week(userId, weekStart) });
      void queryClient.invalidateQueries({ queryKey: goalSpineKeys.all });
    },
  });

  // Calculate weekly aggregates
  const sumAppointments = useMemo(
    () => logs.reduce((acc, l) => acc + (l.appointments || 0), 0),
    [logs],
  );
  const sumSalesCalls = useMemo(
    () => logs.reduce((acc, l) => acc + (l.sales_calls || 0), 0),
    [logs],
  );
  const sumDials = useMemo(
    () => logs.reduce((acc, l) => acc + (l.dials || 0), 0),
    [logs],
  );
  const sumWorkHours = useMemo(
    () => Math.round(logs.reduce((acc, l) => acc + (Number(l.work_hours) || 0), 0) * 10) / 10,
    [logs],
  );

  const targetAppointments = 30;
  const targetSalesCalls = 10;
  const pctAppointments = Math.min(100, Math.round((sumAppointments / targetAppointments) * 100));
  const pctSalesCalls = Math.min(100, Math.round((sumSalesCalls / targetSalesCalls) * 100));

  const currentLog = logsByDate[selectedDate];

  return (
    <Card padding="1rem 1.1rem" className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-black text-text-primary tracking-tight">{projectName}</h3>
            {isFocusSprint && (
              <span className="text-2xs font-black uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                Focus sprintu
              </span>
            )}
          </div>
          <p className="text-xs text-text-muted mt-0.5">
            Tydzień: 30 umówień & 10 sales calli z 50% close rate
          </p>
        </div>

        <div className="flex items-center gap-1.5 rounded-xl border border-primary/20 bg-primary/5 px-2.5 py-1">
          <Target size={13} className="text-primary" />
          <span className="text-xs font-black text-primary">50% Close Rate</span>
        </div>
      </div>

      {/* 4 Weekly KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {/* Umówienia */}
        <div className="rounded-xl border border-border-custom/30 bg-surface/50 p-2.5 space-y-1.5">
          <div className="flex items-center justify-between text-3xs font-bold text-text-muted uppercase">
            <span className="flex items-center gap-1">
              <CalendarCheck size={11} className="text-emerald-500" /> Umówienia
            </span>
            <span className={pctAppointments >= 100 ? 'text-success font-black' : ''}>
              {pctAppointments}%
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-black text-text-primary">{sumAppointments}</span>
            <span className="text-xs font-semibold text-text-muted">/ {targetAppointments}</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-border-custom/25">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                pctAppointments >= 100 ? 'bg-success' : 'bg-primary'
              }`}
              style={{ width: `${pctAppointments}%` }}
            />
          </div>
        </div>

        {/* Sales calle */}
        <div className="rounded-xl border border-border-custom/30 bg-surface/50 p-2.5 space-y-1.5">
          <div className="flex items-center justify-between text-3xs font-bold text-text-muted uppercase">
            <span className="flex items-center gap-1">
              <UserCheck size={11} className="text-indigo-500" /> Sales calle
            </span>
            <span className={pctSalesCalls >= 100 ? 'text-success font-black' : ''}>
              {pctSalesCalls}%
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-black text-text-primary">{sumSalesCalls}</span>
            <span className="text-xs font-semibold text-text-muted">/ {targetSalesCalls}</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-border-custom/25">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                pctSalesCalls >= 100 ? 'bg-success' : 'bg-indigo-500'
              }`}
              style={{ width: `${pctSalesCalls}%` }}
            />
          </div>
        </div>

        {/* Diale */}
        <div className="rounded-xl border border-border-custom/30 bg-surface/50 p-2.5 space-y-1.5">
          <div className="flex items-center justify-between text-3xs font-bold text-text-muted uppercase">
            <span className="flex items-center gap-1">
              <PhoneCall size={11} className="text-primary" /> Diale
            </span>
            <span>Tydzień</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-black text-primary">{sumDials}</span>
            <span className="text-3xs text-text-muted">łączna liczba</span>
          </div>
          <p className="text-3xs text-text-muted truncate">
            śr. {Math.round(sumDials / 7)} / dzień
          </p>
        </div>

        {/* Godziny pracy */}
        <div className="rounded-xl border border-border-custom/30 bg-surface/50 p-2.5 space-y-1.5">
          <div className="flex items-center justify-between text-3xs font-bold text-text-muted uppercase">
            <span className="flex items-center gap-1">
              <Clock size={11} className="text-amber-500" /> Czas pracy
            </span>
            <span>Tydzień</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-black text-text-primary">{sumWorkHours}</span>
            <span className="text-xs font-bold text-text-muted">godzin</span>
          </div>
          <p className="text-3xs text-text-muted truncate">
            śr. {Math.round((sumWorkHours / 7) * 10) / 10}h / dzień
          </p>
        </div>
      </div>

      {/* 7-Day Picker Strip */}
      <div className="space-y-1.5">
        <p className="text-3xs font-black uppercase tracking-wider text-text-muted">Wybierz dzień</p>
        <CloserDayStrip
          weekStart={weekStart}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          logsByDate={logsByDate}
        />
      </div>

      {/* Daily Inputs Editor for the selected day */}
      <CloserDayInputs
        dateStr={selectedDate}
        log={currentLog}
        onUpdate={(patch) => mutateLog.mutate(patch)}
        disabled={mutateLog.isPending}
      />
    </Card>
  );
}
