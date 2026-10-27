/**
 * @module calendarHistory
 * @role Rejestruje operacje kalendarza (zmiana, usunięcie, duplikat) w globalnej historii akcji, żeby ⌘Z i ⇧⌘Z
 *          (ActionHistoryController) cofały i ponawiały je tak samo jak zadania i notatki. Cofnięcie usunięcia tworzy
 *          wydarzenie od nowa, więc „ponów” musi usunąć wydarzenie z NOWYM id, nie ze starym.
 */
import { useMemo } from 'react';
import { registerReversibleAction } from '../../lib/actionHistory';
import type { CalendarEvent } from '../../lib/calendarApi';
import type { CalRow } from './calendarHelpers';

type NewEvent = Omit<CalendarEvent, 'id'>;
type ExistingEvent = CalendarEvent & { id: string };

export interface CalendarWriters {
  create: (event: NewEvent) => Promise<string>;
  update: (event: ExistingEvent) => Promise<void>;
  remove: (eventId: string) => Promise<void>;
}

/** Wydarzenie z wiersza kalendarza w formie zapisu; null, gdy brakuje godzin (nie da się go odtworzyć). */
export function rowToEventPayload(row: CalRow): NewEvent | null {
  if (!row.start_time || !row.end_time) return null;
  return {
    summary: row.summary || 'Wydarzenie',
    start: row.start_time,
    end: row.end_time,
    category: row.category || undefined,
    description: row.description || undefined,
    location: row.location || undefined,
    is_all_day: row.is_all_day ?? false,
    reminder_minutes: row.reminder_minutes ?? null,
    recurrence: row.recurrence ?? undefined,
  };
}

export function recordCalendarUpdate(
  writers: Pick<CalendarWriters, 'update'>,
  input: { label: string; before: ExistingEvent; after: ExistingEvent },
): string {
  return registerReversibleAction({
    label: input.label,
    undo: () => writers.update(input.before),
    redo: () => writers.update(input.after),
  });
}

export function recordCalendarCreate(
  writers: Pick<CalendarWriters, 'create' | 'remove'>,
  input: { label: string; event: NewEvent; createdId: string },
): string {
  let currentId = input.createdId;
  return registerReversibleAction({
    label: input.label,
    undo: () => writers.remove(currentId),
    redo: async () => { currentId = await writers.create(input.event); },
  });
}

/**
 * Tworzy wydarzenie i, gdy da się je odwrócić jednym usunięciem, rejestruje cofnięcie w historii.
 * Wydarzenie z regułą powtarzania rozwija się w serię, więc takiego nie rejestrujemy (zwraca null).
 */
export async function createEventWithHistory(
  writers: Pick<CalendarWriters, 'create' | 'remove'>,
  event: NewEvent,
  reversible = true,
): Promise<string | null> {
  const createdId = await writers.create(event);
  if (!reversible) return null;
  return recordCalendarCreate(writers, { label: `Nowe wydarzenie: ${event.summary}`, event, createdId });
}

export function recordCalendarDelete(
  writers: Pick<CalendarWriters, 'create' | 'remove'>,
  input: { label: string; event: NewEvent },
): string {
  let recreatedId: string | null = null;
  return registerReversibleAction({
    label: input.label,
    undo: async () => { recreatedId = await writers.create(input.event); },
    redo: async () => {
      if (recreatedId) await writers.remove(recreatedId);
    },
  });
}

interface Auth { userId: string; accessToken: string }

interface WriterSources {
  userId: string | undefined;
  accessToken?: string | undefined;
  createEventMutation?: { mutateAsync: (args: Auth & { event: NewEvent }) => Promise<{ eventId: string }> };
  updateEventMutation?: { mutateAsync: (args: Auth & { event: ExistingEvent }) => Promise<unknown> };
  deleteEventMutation?: { mutateAsync: (args: Auth & { eventId: string; deleteScope?: 'this' | 'all' }) => Promise<unknown> };
}

/** Zapisy kalendarza dla historii; brakująca mutacja rzuca przy użyciu, nie po cichu. */
export function useCalendarWriters(sources: WriterSources): CalendarWriters {
  const { userId, accessToken, createEventMutation, updateEventMutation, deleteEventMutation } = sources;
  return useMemo<CalendarWriters>(() => {
    const auth = { userId: userId || '', accessToken: accessToken || '' };
    return {
      create: async (event) => {
        if (!createEventMutation) throw new Error('Brak operacji tworzenia wydarzenia');
        return (await createEventMutation.mutateAsync({ ...auth, event })).eventId;
      },
      update: async (event) => {
        if (!updateEventMutation) throw new Error('Brak operacji zmiany wydarzenia');
        await updateEventMutation.mutateAsync({ ...auth, event });
      },
      remove: async (eventId) => {
        if (!deleteEventMutation) throw new Error('Brak operacji usunięcia wydarzenia');
        await deleteEventMutation.mutateAsync({ ...auth, eventId, deleteScope: 'this' });
      },
    };
  }, [userId, accessToken, createEventMutation, updateEventMutation, deleteEventMutation]);
}
