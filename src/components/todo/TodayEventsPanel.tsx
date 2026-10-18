import { useEffect, useRef, useState } from 'react';
import { Pressable } from '../ui/ControlPrimitives';
import { CalendarDays, Clock, X } from 'lucide-react';
import { TIMEZONE } from '../../lib/date';
import { useTodayCalendarEvents } from '../calendar/hooks/useTodayCalendarEvents';

export const TOGGLE_CALENDAR_EVENT = 'todo:toggle-calendar';

const CAT_DOT: Record<string, string> = {
  work:     'bg-info',
  health:   'bg-success',
  sport:    'bg-warning',
  personal: 'bg-primary',
  study:    'bg-warning',
};

function fmt(iso: string) {
  return new Date(iso).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit', timeZone: TIMEZONE });
}

function EventsList({ userId, today }: { userId: string; today: string }) {
  const { events, loading, isActive, isPast } = useTodayCalendarEvents(userId, today);

  return (
    <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
      {loading && (
        <div className="space-y-2 py-2" aria-busy="true" aria-label="Ładowanie wydarzeń">
          {[0, 1, 2].map((i) => <div key={i} className="h-12 animate-pulse rounded-xl bg-surface-solid/50" />)}
        </div>
      )}
      {!loading && events.length === 0 && (
        <p className="py-10 text-center text-sm text-text-secondary">Dziś bez wydarzeń w kalendarzu</p>
      )}
      {!loading && events.map((ev) => {
        const active = isActive(ev);
        const past = isPast(ev);
        const dot = ev.category ? (CAT_DOT[ev.category.toLowerCase()] ?? 'bg-primary/60') : 'bg-primary/60';

        return (
          <div
            key={ev.id}
            className={`flex items-start gap-3 rounded-xl px-3 py-2.5 ${
              active ? 'bg-primary/10 ring-1 ring-primary/20' : past ? 'opacity-[var(--opacity-50)]' : 'hover:bg-surface-2'
            }`}
          >
            <div className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dot}`} />
            <div className="min-w-0 flex-1">
              <p className={`line-clamp-2 text-sm font-medium leading-snug ${active ? 'text-primary' : 'text-text-primary'}`}>
                {ev.summary || '—'}
              </p>
              <p className="mt-0.5 flex items-center gap-1 text-xs tabular-nums text-text-secondary">
                <Clock size={11} aria-hidden="true" />
                {fmt(ev.start_time)} – {fmt(ev.end_time)}
              </p>
            </div>
            {active && (
              <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-2xs font-bold text-primary">TERAZ</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Slide-over "Kalendarz dziś" — hidden by default, toggled from the header (or the palette) via a window event. */
export default function TodayEventsPanel({ userId, today }: { userId: string; today: string }) {
  const [open, setOpen] = useState(false);
  const [everOpened, setEverOpened] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const toggle = () => { setEverOpened(true); setOpen((v) => !v); };
    window.addEventListener(TOGGLE_CALENDAR_EVENT, toggle);
    return () => window.removeEventListener(TOGGLE_CALENDAR_EVENT, toggle);
  }, []);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <div
        aria-hidden="true"
        onClick={() => setOpen(false)}
        className="todo-events-scrim"
        data-open={open}
      />
      <aside
        role="complementary"
        aria-label="Kalendarz dziś"
        inert={!open}
        className="todo-events-panel flex flex-col border-l border-border-custom/60 bg-surface-solid shadow-2xl"
        data-open={open}
      >
        <div className="flex items-center justify-between border-b border-border-custom/40 px-4 py-3">
          <p className="flex items-center gap-2 text-sm font-semibold text-text-primary">
            <CalendarDays size={16} aria-hidden="true" /> Kalendarz dziś
          </p>
          <Pressable
            ref={closeRef}
            variant="ghost"
            size="sm"
            onClick={() => setOpen(false)}
            aria-label="Zamknij kalendarz"
            title="Zamknij (Esc)"
          >
            <X size={16} />
          </Pressable>
        </div>
        {everOpened && <EventsList userId={userId} today={today} />}
      </aside>
    </>
  );
}
