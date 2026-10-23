import { CalendarDays, CheckSquare2, ChevronRight } from 'lucide-react';
import { TIMEZONE } from '../../lib/date';
import { buildTodayRunway, type RunwayItem } from '../../lib/todo/todayRunway';
import { useTodayCalendarEvents } from '../calendar/hooks/useTodayCalendarEvents';
import { Pressable } from '../ui/ControlPrimitives';
import { useTodoContext } from './context/TodoContext';

function formatTime(ms: number | null) {
  if (!ms) return null;
  return new Date(ms).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit', timeZone: TIMEZONE });
}

function ItemIcon({ kind }: Pick<RunwayItem, 'kind'>) {
  return kind === 'event' ? <CalendarDays size={15} /> : <CheckSquare2 size={15} />;
}

export default function TodayRunway() {
  const { userId, today, todayItems, toggleExpand } = useTodoContext();
  const { events, nowMs } = useTodayCalendarEvents(userId, today);
  const runway = buildTodayRunway(todayItems, events, nowMs);
  if (!runway.now) return null;

  const open = (item: RunwayItem) => item.kind === 'task' && toggleExpand(item.id);

  return (
    <section className="ui-rise ui-surface-lift mb-3 overflow-hidden rounded-[var(--radius-lg)] border border-border-custom/40 bg-surface">
      <Pressable onClick={() => open(runway.now!)} className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface-2">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary"><ItemIcon kind={runway.now.kind} /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-medium text-primary">Teraz</span>
          <span className="block truncate text-base font-semibold text-text-primary">{runway.now.title}</span>
        </span>
        {runway.now.startMs && <span className="ui-num text-sm font-medium tabular-nums text-text-secondary">{formatTime(runway.now.startMs)}</span>}
        {runway.now.kind === 'task' && <ChevronRight size={16} className="text-text-muted/50" />}
      </Pressable>
      {runway.next.length > 0 && (
        <div className="border-t border-border-custom/30 px-4 py-2.5">
          <p className="mb-1 text-xs font-medium text-text-muted">Następnie</p>
          <div className="space-y-1.5">
            {runway.next.map((item) => (
              <Pressable key={`${item.kind}-${item.id}`} onClick={() => open(item)} className="flex min-h-11 w-full items-center gap-2 text-left">
                <span className="text-text-muted/55"><ItemIcon kind={item.kind} /></span>
                <span className="min-w-0 flex-1 truncate text-sm text-text-primary">{item.title}</span>
                {item.startMs && <span className="text-xs tabular-nums text-text-muted">{formatTime(item.startMs)}</span>}
              </Pressable>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
