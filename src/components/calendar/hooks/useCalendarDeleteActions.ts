import { useCallback, type Dispatch, type SetStateAction } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useCreateCalendarEvent,
  useDeleteCalendarEvent,
  type SparkyCalendarRow,
} from '../../../lib/calendarApi';
import { notify } from '../../../lib/notify';
import { undoAction } from '../../../lib/actionHistory';
import { calendarKeys } from '../../../lib/queryKeys';
import { recurringSeriesBaseId, CalRow } from '../calendarHelpers';
import { recordCalendarDelete, rowToEventPayload, useCalendarWriters } from '../calendarHistory';
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

  const writers = useCalendarWriters({ userId, accessToken, createEventMutation, deleteEventMutation });

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
      setViewingEvent(null);
      const payload = rowToEventPayload(ev);
      // Cofnięcie przez globalną historię (⌘Z / ⇧⌘Z); przycisk w komunikacie robi to samo.
      const actionId = payload
        ? recordCalendarDelete(writers, { label: `Usunięcie: ${ev.summary || 'Wydarzenie'}`, event: { ...payload, recurrence: undefined } })
        : null;
      notify(`Usunięto "${ev.summary || 'Wydarzenie'}"`, 'info', actionId
        ? { action: { label: 'Cofnij', onClick: () => { void undoAction(actionId); } } }
        : undefined);
    } catch (err) {
      console.error('Failed to delete event:', err);
      notify('Nie udało się usunąć wydarzenia.', 'error');
      queryClient.invalidateQueries({ queryKey: calendarKeys.all });
    }
  }, [
    deleteEventMutation, writers, userId, accessToken, queryClient,
    setEventToDelete, setShowDeleteConfirm, setViewingEvent,
  ]);

  return { executeDelete, handleEditDelete, deleteEventWithUndo };
}
