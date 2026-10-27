import { Pressable } from '../../ui/ControlPrimitives';
import { formatTime, type CalRow } from '../calendarHelpers';

const DAY_LABEL = new Intl.DateTimeFormat('pl-PL', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Europe/Warsaw' });

interface Props {
  results: CalRow[];
  term: string;
  searching: boolean;
  onPick: (event: CalRow) => void;
}

/** Lista wyników pod polem szukania: klik przenosi kalendarz do wydarzenia i je podświetla. */
export default function CalendarSearchResults({ results, term, searching, onPick }: Props) {
  if (!term) return null;
  return (
    <div className="absolute right-0 top-full z-[var(--z-popover)] mt-1 w-72 sm:w-88 overflow-hidden rounded-xl border border-border-custom/40 bg-surface-solid shadow-lg">
      {results.length === 0 ? (
        <p role="status" className="px-3 py-2.5 text-xs font-medium text-text-muted">
          {searching ? 'Szukam…' : 'Brak wyników w ±6 miesiącach'}
        </p>
      ) : (
        <ul role="listbox" aria-label="Wyniki wyszukiwania" className="m-0 max-h-72 list-none overflow-y-auto p-1">
          {results.map((event) => (
            <li key={event.id} role="option" aria-selected="false">
              <Pressable
                onClick={() => onPick(event)}
                className="flex min-h-11 w-full flex-col items-start rounded-lg px-2.5 py-1.5 text-left hover:bg-surface-2"
              >
                <span className="w-full truncate text-xs font-semibold text-text-primary">{event.summary || 'Wydarzenie'}</span>
                <span className="text-2xs font-medium tabular-nums text-text-muted">
                  {DAY_LABEL.format(new Date(event.start_time!))}
                  {event.is_all_day ? ' · cały dzień' : ` · ${formatTime(event.start_time!)}`}
                </span>
              </Pressable>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
