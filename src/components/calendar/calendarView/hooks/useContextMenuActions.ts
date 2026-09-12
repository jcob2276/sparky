/**
 * @hook useContextMenuActions
 * @role Akcje menu kontekstowego wydarzeń kalendarza: zmiana sfery, przełożenie
 *          terminu, duplikacja. Payloady aktualizacji zachowują wszystkie pola
 *          wydarzenia (location / is_all_day / reminder_minutes / recurrence).
 */
import { useCallback } from 'react';
import type { CalRow } from '../../calendarHelpers';
import type { useCreateCalendarEvent, useUpdateCalendarEvent } from '../../../../lib/calendarApi';

interface UseContextMenuActionsOptions {
  userId: string | undefined;
  accessToken: string | undefined;
  createEventMutation: ReturnType<typeof useCreateCalendarEvent>;
  updateEventMutation: ReturnType<typeof useUpdateCalendarEvent>;
  setToastMessage: (msg: string | null) => void;
}

export function useContextMenuActions({
  userId,
  accessToken,
  createEventMutation,
  updateEventMutation,
  setToastMessage,
}: UseContextMenuActionsOptions) {
  const baseFields = useCallback((event: CalRow) => ({
    summary: event.summary || 'Bez tytułu',
    category: event.category || undefined,
    description: event.description || undefined,
    location: event.location || undefined,
    is_all_day: event.is_all_day ?? false,
    reminder_minutes: event.reminder_minutes ?? null,
    recurrence: event.recurrence ?? undefined,
  }), []);

  const handleChangeCategory = useCallback(async (event: CalRow, category: string) => {
    try {
      await updateEventMutation.mutateAsync({
        userId: userId || '',
        accessToken: accessToken || '',
        event: {
          id: event.event_id || event.id,
          ...baseFields(event),
          category,
          start: event.start_time || new Date().toISOString(),
          end: event.end_time || event.start_time || new Date().toISOString(),
        },
      });
      setToastMessage(`Zmieniono sferę na: ${category} 🎨`);
    } catch (err) {
      console.error('Failed to change category:', err);
      setToastMessage('Nie udało się zmienić kategorii.');
    }
  }, [userId, accessToken, updateEventMutation, setToastMessage, baseFields]);

  const handleMoveToDate = useCallback(async (event: CalRow, dateStr: string) => {
    try {
      const timePart = event.start_time ? event.start_time.split('T')[1] || '09:00:00+02:00' : '09:00:00+02:00';
      const newStart = `${dateStr}T${timePart}`;
      const newEnd = event.end_time ? `${dateStr}T${event.end_time.split('T')[1] || '10:00:00+02:00'}` : `${dateStr}T10:00:00+02:00`;
      await updateEventMutation.mutateAsync({
        userId: userId || '',
        accessToken: accessToken || '',
        event: {
          id: event.event_id || event.id,
          ...baseFields(event),
          start: newStart,
          end: newEnd,
        },
      });
      setToastMessage(`Przełożono wydarzenie na ${dateStr} 📅`);
    } catch (err) {
      console.error('Failed to move event date:', err);
      setToastMessage('Nie udało się przełożyć wydarzenia.');
    }
  }, [userId, accessToken, updateEventMutation, setToastMessage, baseFields]);

  const handleDuplicate = useCallback(async (event: CalRow) => {
    if (!event.start_time || !event.end_time) {
      setToastMessage('Nie można skopiować wydarzenia bez godzin.');
      return;
    }
    try {
      await createEventMutation.mutateAsync({
        userId: userId || '',
        accessToken: accessToken || '',
        event: {
          ...baseFields(event),
          start: event.start_time,
          end: event.end_time,
          // Klonujemy pojedyncze wystąpienie — bez reguły powtarzania.
          recurrence: undefined,
        },
      });
      setToastMessage('Skopiowano wydarzenie 📋');
    } catch (err) {
      console.error('Failed to duplicate event:', err);
      setToastMessage('Nie udało się skopiować wydarzenia.');
    }
  }, [userId, accessToken, createEventMutation, setToastMessage, baseFields]);

  return { handleChangeCategory, handleMoveToDate, handleDuplicate };
}
