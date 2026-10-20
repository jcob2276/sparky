import type { SparkyCalendarRow } from '../../../lib/calendarApi';
import { addDays, CalRow } from '../calendarHelpers';
import { deriveAll } from '../../terminy/terminyDerived';
import { warsawTimeOfDay } from '../../../lib/date';

export type CalView = 'dzien' | '3dni' | 'tydzien' | 'miesiac';
export type RecurrenceKind = '' | 'daily' | 'weekly' | 'monthly' | 'custom';
export type ObligationInput = Parameters<typeof deriveAll>[0];

export interface VisibleRange {
  rangeStart: string;
  rangeEnd: string;
}

export function getInitialCalView(): CalView {
  if (typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches) {
    return 'dzien';
  }
  return 'tydzien';
}

/**
 * Okno pobierania = miesiąc kotwicy ± 7 dni. Jest stabilne dla całego miesiąca, więc przesuwanie
 * dnia/tygodnia nie zmienia klucza zapytania (brak ponownego pobrania i pustej siatki), a mini-kalendarz
 * ma kropki dla całego miesiąca niezależnie od widoku.
 */
export function computeVisibleRange(calView: CalView, weekStart: string, selectedDay: string): VisibleRange {
  const anchor = calView === 'tydzien' ? weekStart : selectedDay;
  const [year, month] = anchor.split('-').map(Number);
  const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
  const nextMonthStart = month === 12
    ? `${year + 1}-01-01`
    : `${year}-${String(month + 1).padStart(2, '0')}-01`;
  return { rangeStart: addDays(monthStart, -7), rangeEnd: addDays(nextMonthStart, 7) };
}

/** Projects Terminy (Life Obligations) onto calendar rows. */
export function buildObligationEvents(obligations: ObligationInput, today: string): CalRow[] {
  if (!obligations.length) return [];
  const derived = deriveAll(obligations, today);
  const result: CalRow[] = [];

  for (const d of derived) {
    const item = d.item;
    const date = d.nextDate;
    if (!date) continue;

    let prefix = '📌';
    let category = 'finanse';
    if (item.kind === 'people') {
      prefix = '🎈';
      category = 'relacje_rodzina';
    } else if (item.kind === 'vehicle') {
      prefix = '🚗';
      category = 'praca';
    } else if (item.kind === 'document') {
      prefix = '📄';
      category = 'finanse';
    }

    result.push({
      id: `obligation-${item.id}-${date}`,
      event_id: `obligation-${item.id}`,
      summary: `${prefix} ${item.title}${item.related_name ? ` (${item.related_name})` : ''}`,
      start_time: `${date}T09:00:00+02:00`,
      end_time: `${date}T10:00:00+02:00`,
      is_all_day: true,
      category,
      description: item.notes || `Ważny termin z zakładki Terminy (${item.title})`,
    });
  }

  return result;
}

/**
 * Cast events to CalRow[] safely and merge obligation events.
 * Garmin/Intervals "Kardio" / "Cardio" activities represent Sauna sessions.
 */
export function mergeCalendarEvents(rawEvents: unknown, obligationEvents: CalRow[]): CalRow[] {
  const raw = (rawEvents as CalRow[])
    .filter((ev) => Boolean(ev.summary?.trim() || ev.description?.trim()))
    .map((ev) => {
      const summaryLower = ev.summary?.toLowerCase() || '';
      if (
        summaryLower === 'kardio' ||
        summaryLower === 'cardio' ||
        summaryLower.includes('(kardio)') ||
        summaryLower.includes('(cardio)') ||
        summaryLower === 'bieg 🏃 (kardio)'
      ) {
        return {
          ...ev,
          summary: 'Sauna 🧖',
          category: 'odpoczynek_regeneracja',
        };
      }
      return ev;
    });

  const seen = new Set<string>();
  const deduped: CalRow[] = [];
  for (const ev of [...raw, ...obligationEvents]) {
    const key = ev.event_id || ev.id;
    if (key && seen.has(key)) continue;
    if (key) seen.add(key);
    deduped.push(ev);
  }
  return deduped;
}

export function filterDisplayEvents(
  events: CalRow[],
  disabledCategories: Set<string>,
  searchQuery: string
): CalRow[] {
  let result = events;
  if (disabledCategories.size > 0) {
    result = result.filter((event) => {
      const cat = (event.category || 'uncategorized').toLowerCase();
      return !disabledCategories.has(cat);
    });
  }
  const query = searchQuery.trim().toLocaleLowerCase('pl-PL');
  if (!query) return result;
  return result.filter((event) =>
    [event.summary, event.category, event.description, event.location]
      .filter(Boolean)
      .some((value) => String(value).toLocaleLowerCase('pl-PL').includes(query))
  );
}

export function formatTimeOfISO(iso: string): string {
  try {
    const hm = warsawTimeOfDay(iso);
    return /^\d{2}:\d{2}$/.test(hm) ? hm : '12:00';
  } catch {
    return '12:00';
  }
}

/** Cache filter for optimistic eviction when deleting an event (or its series). */
export function evictDeletedFromCache(
  prev: SparkyCalendarRow[] | undefined,
  evId: string,
  instanceId: string,
  scope: 'this' | 'all'
): SparkyCalendarRow[] {
  if (!prev) return [];
  const baseId = evId.includes('_') ? evId.split('_')[0] : evId;
  return prev.filter((e) => {
    const rowEvId = e.event_id || e.id;
    if (scope === 'all') {
      const seriesId = e.series_id || (e.event_id ? e.event_id.split('_')[0] : null);
      if (seriesId && seriesId === baseId) return false;
      if (rowEvId === baseId || rowEvId === evId) return false;
      if (e.event_id && e.event_id.startsWith(baseId + '_')) return false;
      return true;
    }
    return rowEvId !== instanceId && e.id !== instanceId;
  });
}

export function evictSingleFromCache(
  prev: SparkyCalendarRow[] | undefined,
  instanceId: string
): SparkyCalendarRow[] {
  if (!prev) return [];
  return prev.filter((e) => (e.event_id || e.id) !== instanceId && e.id !== instanceId);
}
