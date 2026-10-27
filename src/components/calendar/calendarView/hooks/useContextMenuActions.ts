/**
 * @hook useContextMenuActions
 * @role Akcje menu kontekstowego wydarzeń kalendarza: zmiana sfery, przełożenie
 *          terminu, duplikacja. Payloady aktualizacji zachowują wszystkie pola
 *          wydarzenia (location / is_all_day / reminder_minutes / recurrence).
 */
import { useCallback } from 'react';
import type { CalRow } from '../../calendarHelpers';
import { combineDateTimeWarsawISO, warsawTimeOfDay } from '../../../../lib/date';
import type { useCreateCalendarEvent, useDeleteCalendarEvent, useUpdateCalendarEvent } from '../../../../lib/calendarApi';
import { undoAction } from '../../../../lib/actionHistory';
import { notify } from '../../../../lib/notify';
import { recordCalendarCreate, recordCalendarUpdate, rowToEventPayload, useCalendarWriters } from '../../calendarHistory';

interface UseContextMenuActionsOptions {
  userId: string | undefined;
  accessToken: string | undefined;
  createEventMutation: ReturnType<typeof useCreateCalendarEvent>;
  updateEventMutation: ReturnType<typeof useUpdateCalendarEvent>;
  deleteEventMutation: ReturnType<typeof useDeleteCalendarEvent>;
  setToastMessage: (msg: string | null) => void;
}

export function useContextMenuActions({
  userId,
  accessToken,
  createEventMutation,
  updateEventMutation,
  deleteEventMutation,
  setToastMessage,
}: UseContextMenuActionsOptions) {
  const writers = useCalendarWriters({ userId, accessToken, createEventMutation, updateEventMutation, deleteEventMutation });
  const baseFields = useCallback((event: CalRow) => ({
    summary: event.summary || 'Bez tytułu',
    category: event.category || undefined,
    description: event.description || undefined,
    location: event.location || undefined,
    is_all_day: event.is_all_day ?? false,
    reminder_minutes: event.reminder_minutes ?? null,
    recurrence: event.recurrence ?? undefined,
  }), []);

  /** Zapisuje zmianę i rejestruje ją w historii; komunikat ma przycisk Cofnij, tak samo jak ⌘Z. */
  const applyUpdate = useCallback(async (event: CalRow, label: string, changes: { category?: string; start?: string; end?: string }) => {
    const id = event.event_id || event.id;
    const before = {
      id,
      ...baseFields(event),
      start: event.start_time || new Date().toISOString(),
      end: event.end_time || event.start_time || new Date().toISOString(),
    };
    const after = { ...before, ...changes };
    await writers.update(after);
    return recordCalendarUpdate(writers, { label, before, after });
  }, [writers, baseFields]);

  const handleChangeCategory = useCallback(async (event: CalRow, category: string) => {
    try {
      const actionId = await applyUpdate(event, `Zmiana sfery: ${event.summary || 'Wydarzenie'}`, { category });
      notify(`Zmieniono sferę na: ${category} 🎨`, 'success', { action: { label: 'Cofnij', onClick: () => { void undoAction(actionId); } } });
    } catch (err) {
      console.error('Failed to change category:', err);
      setToastMessage('Nie udało się zmienić kategorii.');
    }
  }, [applyUpdate, setToastMessage]);

  const handleMoveToDate = useCallback(async (event: CalRow, dateStr: string) => {
    try {
      const startHm = event.start_time ? warsawTimeOfDay(event.start_time) : '09:00';
      const endHm = event.end_time ? warsawTimeOfDay(event.end_time) : '10:00';
      const actionId = await applyUpdate(event, `Przełożenie: ${event.summary || 'Wydarzenie'}`, {
        start: combineDateTimeWarsawISO(dateStr, startHm),
        end: combineDateTimeWarsawISO(dateStr, endHm),
      });
      notify(`Przełożono wydarzenie na ${dateStr} 📅`, 'success', { action: { label: 'Cofnij', onClick: () => { void undoAction(actionId); } } });
    } catch (err) {
      console.error('Failed to move event date:', err);
      setToastMessage('Nie udało się przełożyć wydarzenia.');
    }
  }, [applyUpdate, setToastMessage]);

  const handleDuplicate = useCallback(async (event: CalRow) => {
    const payload = rowToEventPayload(event);
    if (!payload) {
      setToastMessage('Nie można skopiować wydarzenia bez godzin.');
      return;
    }
    try {
      // Klonujemy pojedyncze wystąpienie — bez reguły powtarzania.
      const copy = { ...baseFields(event), start: payload.start, end: payload.end, recurrence: undefined };
      const createdId = await writers.create(copy);
      const actionId = recordCalendarCreate(writers, { label: `Kopia: ${event.summary || 'Wydarzenie'}`, event: copy, createdId });
      notify('Skopiowano wydarzenie 📋', 'success', { action: { label: 'Cofnij', onClick: () => { void undoAction(actionId); } } });
    } catch (err) {
      console.error('Failed to duplicate event:', err);
      setToastMessage('Nie udało się skopiować wydarzenia.');
    }
  }, [writers, baseFields, setToastMessage]);

  return { handleChangeCategory, handleMoveToDate, handleDuplicate };
}
