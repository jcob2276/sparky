import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, CheckSquare2, ChevronRight, Plus } from 'lucide-react';
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
      <section className="ui-surface-lift rounded-[var(--radius-hero)] border border-border-custom/60 bg-surface-solid/40 p-5">
        <p className="text-xs font-medium text-text-muted">Najbliższy ruch</p>
        <p className="mt-1 text-xl font-semibold leading-tight text-text-primary">Wolna przestrzeń</p>
        <p className="mt-1 text-sm text-text-secondary">Brak zaplanowanych bloków. Czas na pracę głęboką lub regenerację.</p>
        <Pressable
          onClick={() => navigate('/kalendarz')}
          className="mt-4 inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border-custom/60 bg-surface px-4 text-sm font-medium text-text-secondary hover:border-primary/40 hover:text-primary ui-interactive active:scale-95 cursor-pointer"
        >
          <Plus size={14} />
          <span>Dodaj blok</span>
        </Pressable>
      </section>
    );
  }

  const now = runway.now;
  return (
    <section className="ui-surface-lift overflow-hidden rounded-[var(--radius-hero)] border border-border-custom/60 bg-surface-solid/40">
      <Pressable
        onClick={() => openItem(now)}
        className="flex min-h-11 w-full items-center gap-4 px-5 py-5 text-left transition-colors hover:bg-surface-solid/50 active:bg-surface-solid/70 cursor-pointer"
      >
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 text-xs font-medium text-primary">
            <RunwayIcon kind={now.kind} />
            {now.kind === 'event' ? 'Trwa w kalendarzu' : 'Najbliższy ruch'}
          </span>
          <span className="mt-1.5 block text-xl font-semibold leading-snug text-text-primary line-clamp-2">
            {now.title}
          </span>
        </span>
        {now.startMs ? (
          <span className="ui-num shrink-0 text-2xl font-semibold tabular-nums text-text-primary">
            {formatTime(now.startMs)}
          </span>
        ) : null}
        <ChevronRight size={16} className="shrink-0 text-text-muted/50" />
      </Pressable>

      {runway.next.length ? (
        <div className="border-t border-border-custom/40 px-2 py-2">
          <p className="px-3 pb-1 pt-1.5 text-xs font-medium text-text-muted">Następnie dzisiaj</p>
          {runway.next.map((item) => (
            <Pressable
              key={`${item.kind}-${item.id}`}
              onClick={() => openItem(item)}
              className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left transition-colors hover:bg-surface-solid/60 active:scale-[0.99] cursor-pointer"
            >
              <span className="text-text-muted/80 shrink-0"><RunwayIcon kind={item.kind} /></span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-text-primary">{item.title}</span>
              {item.startMs ? (
                <span className="ui-num shrink-0 text-xs tabular-nums text-text-muted">
                  {formatTime(item.startMs)}
                </span>
              ) : null}
            </Pressable>
          ))}
        </div>
      ) : null}
    </section>
  );
}
