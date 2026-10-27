import { useEffect, useMemo, useState } from 'react';
import { useCalendarEvents } from '../../../lib/calendarApi';
import { addDays, type CalRow } from '../calendarHelpers';
import { SEARCH_MIN_CHARS, SEARCH_WINDOW_DAYS, pickSearchResults } from '../calendarSearch';

const DEBOUNCE_MS = 250;

/**
 * Wyniki wyszukiwania z szerszego okna niż widoczny miesiąc (±SEARCH_WINDOW_DAYS od dzisiaj).
 * Zapytanie rusza dopiero po krótkiej przerwie w pisaniu i tylko dla zapytań od SEARCH_MIN_CHARS znaków.
 */
export function useCalendarSearchResults(userId: string | undefined, query: string, today: string) {
  const [term, setTerm] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setTerm(query.trim()), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const active = Boolean(userId) && term.length >= SEARCH_MIN_CHARS;
  const { data, isFetching } = useCalendarEvents(
    active ? userId! : '',
    active ? addDays(today, -SEARCH_WINDOW_DAYS) : '',
    active ? addDays(today, SEARCH_WINDOW_DAYS) : '',
  );

  const results = useMemo(
    () => (active ? pickSearchResults((data ?? []) as CalRow[], term, today) : []),
    [active, data, term, today],
  );
  return { results, term: active ? term : '', searching: active && isFetching };
}
