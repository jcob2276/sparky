import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, CheckSquare2, ChevronRight, Plus, Sparkles, Sunrise } from 'lucide-react';
import { useUserId } from '../../store/useStore';
import { listTodoItems } from '../../lib/todo/todo';
import { buildTodayRunway, type RunwayItem } from '../../lib/todo/todayRunway';
import { getTodayWarsaw, TIMEZONE } from '../../lib/date';
import { useTodayCalendarEvents } from '../calendar/hooks/useTodayCalendarEvents';
import { Pressable } from '../ui/ControlPrimitives';
import { todoKeys } from '../../lib/queryKeys';
import { useHaptics } from '../../hooks/useHaptics';

function formatTime(ms: number | null) {
  if (!ms) return null;
  return new Date(ms).toLocaleTimeString('pl-PL', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TIMEZONE,
  });
}

function RunwayIcon({ kind }: Pick<RunwayItem, 'kind'>) {
  return kind === 'event' ? <CalendarDays size={15} /> : <CheckSquare2 size={15} />;
}

export default function TodayRunwayCard() {
  const userId = useUserId();
  const navigate = useNavigate();
  const haptics = useHaptics();
  const today = getTodayWarsaw();
  const { events, nowMs } = useTodayCalendarEvents(userId, today);
  const { data: tasks = [] } = useQuery({
    queryKey: todoKeys.items(userId || ''),
    queryFn: () => listTodoItems(userId!),
    enabled: Boolean(userId),
    staleTime: 30_000,
  });

  const todayTasks = useMemo(() => tasks.filter((task) => (
    task.status === 'open' && (task.due_date === today || task.scheduled_time?.slice(0, 10) === today)
  )), [tasks, today]);

  const runway = useMemo(
    () => buildTodayRunway(todayTasks, events, nowMs),
    [todayTasks, events, nowMs],
  );

  const openItem = (item: RunwayItem) => {
    haptics.selection();
    navigate(item.kind === 'task' ? `/todo?task=${item.id}` : '/kalendarz');
  };

  if (!runway.now) {
    return (
      <section className="rounded-2xl border border-border-custom/70 bg-surface-solid/30 p-4 shadow-2xs backdrop-blur-xs">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-success/10 text-success border border-success/20">
              <Sunrise size={18} />
            </span>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-3xs font-black uppercase tracking-widest text-success">
                  Wolna Przestrzeń
                </span>
              </div>
              <p className="text-xs font-bold text-text-primary mt-0.5">Brak zaplanowanych bloków na tę chwilę</p>
              <p className="text-3xs text-text-muted">Czas na skupioną pracę głęboką lub regenerację.</p>
            </div>
          </div>
          <Pressable
            onClick={() => navigate('/kalendarz')}
            className="flex items-center gap-1 rounded-xl border border-border-custom/60 bg-surface px-2.5 py-1.5 text-2xs font-bold text-text-secondary hover:border-primary/40 hover:text-primary ui-interactive active:scale-95 cursor-pointer"
          >
            <Plus size={12} />
            <span>Blok</span>
          </Pressable>
        </div>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-border-custom/70 bg-surface-solid/30 shadow-2xs backdrop-blur-xs">
      {/* Live / Ongoing Runway Header */}
      <Pressable
        onClick={() => openItem(runway.now!)}
        className="flex w-full items-center gap-3.5 px-4 py-3.5 text-left transition-colors hover:bg-surface-solid/50 active:bg-surface-solid/70 cursor-pointer"
      >
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-xs">
          <RunwayIcon kind={runway.now.kind} />
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 text-3xs font-black uppercase tracking-widest text-primary">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-[var(--opacity-dimmed)]" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary" />
            </span>
            {runway.now.kind === 'event' ? 'Trwa w kalendarzu' : 'Aktywne zadanie'}
          </span>
          <span className="block truncate text-sm font-bold text-text-primary mt-0.5 leading-snug">
            {runway.now.title}
          </span>
        </span>

        {runway.now.startMs ? (
          <span className="shrink-0 rounded-lg bg-surface border border-border-custom/50 px-2 py-0.5 text-xs font-bold tabular-nums text-text-primary shadow-2xs">
            {formatTime(runway.now.startMs)}
          </span>
        ) : null}

        <ChevronRight size={16} className="shrink-0 text-text-muted/40 transition-transform group-hover:translate-x-0.5" />
      </Pressable>

      {/* Next Runway Items */}
      {runway.next.length ? (
        <div className="border-t border-border-custom/30 bg-surface/40 px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-3xs font-black uppercase tracking-wider text-text-muted flex items-center gap-1">
              <Sparkles size={10} /> Następnie dzisiaj
            </p>
            <span className="text-3xs font-bold text-text-muted/60">{runway.next.length} poz.</span>
          </div>
          <div className="space-y-1.5">
            {runway.next.map((item) => (
              <Pressable
                key={`${item.kind}-${item.id}`}
                onClick={() => openItem(item)}
                className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-surface-solid/60 active:scale-95 cursor-pointer"
              >
                <span className="text-text-muted/80 shrink-0"><RunwayIcon kind={item.kind} /></span>
                <span className="min-w-0 flex-1 truncate text-xs font-semibold text-text-primary">{item.title}</span>
                {item.startMs ? (
                  <span className="shrink-0 text-2xs font-semibold tabular-nums text-text-muted">
                    {formatTime(item.startMs)}
                  </span>
                ) : null}
              </Pressable>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
