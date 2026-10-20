import { useCallback, useState, type Dispatch, type SetStateAction } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useCreateCalendarEvent,
  useDeleteCalendarEvent,
  type SparkyCalendarRow,
} from '../../../lib/calendarApi';
import { notify } from '../../../lib/notify';
import { calendarKeys } from '../../../lib/queryKeys';
import { recurringSeriesBaseId, CalRow } from '../calendarHelpers';
import { evictDeletedFromCache, evictSingleFromCache } from './calendarDataHelpers';

interface UseCalendarDeleteActionsArgs {
  userId: string | undefined;
  accessToken: string | undefined;
  eventToDelete: CalRow | null;
  selectedEvent: CalRow | null;
  setEventToDelete: Dispatch<SetStateAction<CalRow | null>>;
  setSelectedEvent: Dispatch<SetStateAction<CalRow | null>>;
  setViewingEvent: Dispatch<SetStateAction<CalRow | null>>;
  setShowDeleteConfirm: Dispatch<SetStateAction<boolean>>;
  setToastMessage: Dispatch<SetStateAction<string | null>>;
  setDeleting: Dispatch<SetStateAction<boolean>>;
  createEventMutation: ReturnType<typeof useCreateCalendarEvent>;
  deleteEventMutation: ReturnType<typeof useDeleteCalendarEvent>;
}

/** Delete / undo-delete / restore actions with optimistic cache eviction. */
export function useCalendarDeleteActions({
  userId,
  accessToken,
  eventToDelete,
  selectedEvent,
  setEventToDelete,
  setSelectedEvent,
  setViewingEvent,
  setShowDeleteConfirm,
  setToastMessage,
  setDeleting,
  createEventMutation,
  deleteEventMutation,
}: UseCalendarDeleteActionsArgs) {
  const queryClient = useQueryClient();

  const executeDelete = useCallback(async (scope: 'this' | 'all' = 'this') => {
    const target = eventToDelete || selectedEvent;
    if (!target) return;
    setDeleting(true);
    const instanceId = target.event_id || target.id;
    const seriesBaseId = target.series_id || recurringSeriesBaseId(instanceId);
    const evId = scope === 'all' && seriesBaseId ? seriesBaseId : instanceId;
    try {
      // Optimistic cache eviction
      queryClient.setQueriesData<SparkyCalendarRow[]>(
        { queryKey: ['calendar', 'events'] },
        (prev) => evictDeletedFromCache(prev, evId, instanceId, scope)
      );

      await deleteEventMutation.mutateAsync({
        userId: userId || '',
        accessToken: accessToken || '',
        eventId: evId,
        deleteScope: scope,
      });
      setEventToDelete(null);
      setSelectedEvent(null);
      setViewingEvent(null);
      setShowDeleteConfirm(false);
      setToastMessage('Wydarzenie zostało usunięte. 🗑️');
    } catch (err) {
      console.error('delete event error:', err);
      setToastMessage('Nie udało się usunąć wydarzenia.');
      queryClient.invalidateQueries({ queryKey: calendarKeys.all });
    } finally {
      setDeleting(false);
    }
  }, [
    eventToDelete, selectedEvent, userId, accessToken, deleteEventMutation, queryClient,
    setDeleting, setEventToDelete, setSelectedEvent, setViewingEvent, setShowDeleteConfirm, setToastMessage,
  ]);

  const handleEditDelete = useCallback(() => {
    if (!selectedEvent) return;
    setEventToDelete(selectedEvent);
    setSelectedEvent(null);
    setShowDeleteConfirm(true);
  }, [selectedEvent, setEventToDelete, setSelectedEvent, setShowDeleteConfirm]);

  const [lastDeletedEvent, setLastDeletedEvent] = useState<CalRow | null>(null);

  const restoreLastDeleted = useCallback(async () => {
    if (!lastDeletedEvent || !lastDeletedEvent.start_time || !lastDeletedEvent.end_time) return;
    try {
      await createEventMutation.mutateAsync({
        userId: userId || '',
        accessToken: accessToken || '',
        event: {
          summary: lastDeletedEvent.summary || 'Wydarzenie',
          start: lastDeletedEvent.start_time,
          end: lastDeletedEvent.end_time,
          category: lastDeletedEvent.category || undefined,
          description: lastDeletedEvent.description || undefined,
          location: lastDeletedEvent.location || undefined,
          is_all_day: lastDeletedEvent.is_all_day ?? false,
          reminder_minutes: lastDeletedEvent.reminder_minutes ?? null,
        },
      });
      setLastDeletedEvent(null);
      notify('Przywrócono wydarzenie ↩️', 'success');
    } catch (err) {
      console.error('Failed to restore event:', err);
      notify('Nie udało się przywrócić wydarzenia.', 'error');
    }
  }, [lastDeletedEvent, createEventMutation, userId, accessToken]);

  const deleteEventWithUndo = useCallback(async (ev: CalRow) => {
    const isRecurring = Boolean(
      ev.series_id ||
      (ev.recurrence && ev.recurrence.length > 0) ||
      recurringSeriesBaseId(ev.event_id || ev.id)
    );

    if (isRecurring) {
      setViewingEvent(null);
      setEventToDelete(ev);
      setShowDeleteConfirm(true);
      return;
    }

    const instanceId = ev.event_id || ev.id;
    try {
      // Optimistic cache eviction
      queryClient.setQueriesData<SparkyCalendarRow[]>(
        { queryKey: ['calendar', 'events'] },
        (prev) => evictSingleFromCache(prev, instanceId)
      );

      await deleteEventMutation.mutateAsync({
        userId: userId || '',
        accessToken: accessToken || '',
        eventId: instanceId,
        deleteScope: 'this',
      });
      setLastDeletedEvent(ev);
      setViewingEvent(null);
      notify(`Usunięto "${ev.summary || 'Wydarzenie'}"`, 'info', {
        action: {
          label: 'Cofnij',
          onClick: () => {
            void createEventMutation.mutateAsync({
              userId: userId || '',
              accessToken: accessToken || '',
              event: {
                summary: ev.summary || 'Wydarzenie',
                start: ev.start_time!,
                end: ev.end_time!,
                category: ev.category || undefined,
                description: ev.description || undefined,
                location: ev.location || undefined,
                is_all_day: ev.is_all_day ?? false,
                reminder_minutes: ev.reminder_minutes ?? null,
              },
            });
          },
        },
      });
    } catch (err) {
      console.error('Failed to delete event:', err);
      notify('Nie udało się usunąć wydarzenia.', 'error');
      queryClient.invalidateQueries({ queryKey: calendarKeys.all });
    }
  }, [
    deleteEventMutation, createEventMutation, userId, accessToken, queryClient,
    setEventToDelete, setShowDeleteConfirm, setViewingEvent,
  ]);

  return { executeDelete, handleEditDelete, restoreLastDeleted, deleteEventWithUndo, lastDeletedEvent };
}
