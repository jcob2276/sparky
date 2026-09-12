import { useCallback } from 'react';
import { updateTodoItem, deleteTodoItem } from '../../../../lib/todo/todo';
import { buildRecurrenceRule } from '../calendarViewHelpers';
import { parseTodoQuickInput } from '../../../../lib/todo/todoParser';
import type { useCalendarData } from '../../hooks/useCalendarData';
import type { useCalendarTodos } from '../../hooks/useCalendarTodos';
import { registerReversibleAction, undoAction } from '../../../../lib/actionHistory';
import { notify } from '../../../../lib/notify';
import { buildQuickEventPayload, buildEditEventPayload } from '../eventPayload';

interface UseCalendarActionsOptions {
  userId: string | undefined;
  accessToken: string | undefined;
  calData: ReturnType<typeof useCalendarData>;
  calTodos: ReturnType<typeof useCalendarTodos>;
  onResyncCalendar?: () => Promise<void> | void;
}

export function useCalendarActions({
  userId,
  accessToken,
  calData,
  calTodos,
  onResyncCalendar,
}: UseCalendarActionsOptions) {
  const {
    quickCreate,
    closeQuickCreate,
    quickTitle,
    quickDuration,
    quickCategory,
    quickType,
    quickDescription,
    quickLocation,
    quickAllDay,
    quickReminder,
    quickRecurrence,
    quickCustomDays,
    quickRecurrenceEndDate,
    selectedEvent,
    setSelectedEvent,
    editTitle,
    editCategory,
    editStart,
    editEnd,
    editDate,
    editDescription,
    editLocation,
    editAllDay,
    editReminder,
    editRecurrence,
    editCustomDays,
    editRecurrenceEndDate,
    editingTodo,
    setEditingTodo,
    editingTodoTitle,
    setSaving,
    setToastMessage,
    fetchEvents,
    createEventMutation,
    updateEventMutation,
  } = calData;

  const { createScheduledTodo, fetchAllTodos } = calTodos;

  const handleQuickSave = useCallback(async () => {
    if (!quickCreate || !quickTitle.trim()) return;
    setSaving(true);
    const { date, startMin } = quickCreate;
    const parsed = parseTodoQuickInput(quickTitle);
    const parsedStartMin = parsed.scheduled_time
      ? Number(parsed.scheduled_time.slice(0, 2)) * 60 + Number(parsed.scheduled_time.slice(3, 5))
      : startMin;
    const parsedDate = parsed.date_explicit && parsed.due_date ? parsed.due_date : date;
    const parsedDuration = parsed.duration_minutes || quickDuration;
    const parsedRecurrence = parsed.recurrence || (quickRecurrence === 'custom' ? undefined : quickRecurrence) || undefined;
    const parsedTitle = parsed.title || quickTitle.trim();

    if (quickType === 'task') {
      try {
        await createScheduledTodo({
          title: parsedTitle,
          day: parsedDate,
          startMin: parsedStartMin,
          durationMinutes: parsedDuration,
          notes: quickDescription.trim() || undefined,
          recurrence: parsedRecurrence,
          priority: parsed.priority || undefined,
          tagsText: parsed.tags.join(','),
        });
        closeQuickCreate();
        setToastMessage('Dodano i zaplanowano zadanie! 📅');
        await fetchAllTodos();
      } catch (err) {
        console.error('create scheduled todo error:', err);
        setToastMessage('Błąd tworzenia zadania.');
      } finally {
        setSaving(false);
      }
      return;
    }

    const recurrence = buildRecurrenceRule(
      (parsed.recurrence || quickRecurrence) as typeof quickRecurrence,
      quickCustomDays,
      quickRecurrenceEndDate
    );
    const ev = buildQuickEventPayload({
      title: parsedTitle,
      date: parsedDate,
      startMin: parsedStartMin,
      durationMin: parsedDuration,
      allDay: quickAllDay,
      location: quickLocation,
      reminderMinutes: quickReminder,
      category: quickCategory,
      description: quickDescription,
      recurrence: recurrence ?? null,
    });
    try {
      await createEventMutation.mutateAsync({
        userId: userId || '',
        accessToken: accessToken || '',
        event: ev,
      });
      closeQuickCreate();
      setToastMessage('Dodano nowe wydarzenie! 🗓️');
      if (recurrence?.length && onResyncCalendar) {
        await onResyncCalendar();
        await fetchEvents();
      }
    } catch (err) {
      console.error('create event error:', err);
      setToastMessage('Błąd zapisu wydarzenia.');
    } finally {
      setSaving(false);
    }
  }, [
    quickCreate,
    quickTitle,
    quickType,
    quickDuration,
    quickDescription,
    quickLocation,
    quickAllDay,
    quickReminder,
    quickRecurrence,
    quickRecurrenceEndDate,
    quickCategory,
    quickCustomDays,
    userId,
    accessToken,
    createEventMutation,
    onResyncCalendar,
    fetchEvents,
    createScheduledTodo,
    fetchAllTodos,
    closeQuickCreate,
    setToastMessage,
    setSaving,
  ]);

  const handleEditSave = useCallback(async () => {
    if (!selectedEvent || !editTitle.trim() || !editDate) return;
    if (!editAllDay && (!editStart || !editEnd)) return;
    setSaving(true);

    const rawId = selectedEvent.event_id || selectedEvent.id;
    const evId = selectedEvent.series_id || rawId;
    const recurrence = buildRecurrenceRule(
      editRecurrence,
      editCustomDays,
      editRecurrenceEndDate
    );
    const ev = buildEditEventPayload({
      id: evId,
      title: editTitle,
      date: editDate,
      start: editStart,
      end: editEnd,
      allDay: editAllDay,
      location: editLocation,
      reminderMinutes: editReminder,
      category: editCategory,
      description: editDescription,
      recurrence: recurrence ?? null,
    });
    try {
      await updateEventMutation.mutateAsync({
        userId: userId || '',
        accessToken: accessToken || '',
        event: ev,
      });
      const originalEvent = {
        id: evId,
        summary: selectedEvent.summary || '',
        start: selectedEvent.start_time || ev.start,
        end: selectedEvent.end_time || ev.end,
        category: selectedEvent.category || undefined,
        description: selectedEvent.description || undefined,
        recurrence: selectedEvent.recurrence ?? null,
        location: selectedEvent.location || undefined,
        is_all_day: selectedEvent.is_all_day ?? false,
        reminder_minutes: selectedEvent.reminder_minutes ?? null,
      };
      const actionId = registerReversibleAction({
        label: `Edycja wydarzenia: ${ev.summary}`,
        undo: async () => {
          await updateEventMutation.mutateAsync({
            userId: userId || '',
            accessToken: accessToken || '',
            event: originalEvent,
          });
        },
        redo: async () => {
          await updateEventMutation.mutateAsync({
            userId: userId || '',
            accessToken: accessToken || '',
            event: ev,
          });
        },
      });
      setSelectedEvent(null);
      setToastMessage(null);
      notify('Zmieniono wydarzenie.', 'success', {
        action: { label: 'Cofnij', onClick: () => { void undoAction(actionId); } },
      });
      if (onResyncCalendar) {
        await onResyncCalendar();
        await fetchEvents();
      }
    } catch (err) {
      console.error('edit event save error:', err);
      setToastMessage('Nie udało się zapisać zmian.');
    } finally {
      setSaving(false);
    }
  }, [
    selectedEvent,
    editTitle,
    editStart,
    editEnd,
    editDate,
    editDescription,
    editLocation,
    editAllDay,
    editReminder,
    editRecurrence,
    editCustomDays,
    editRecurrenceEndDate,
    editCategory,
    userId,
    accessToken,
    updateEventMutation,
    onResyncCalendar,
    fetchEvents,
    setSelectedEvent,
    setToastMessage,
    setSaving,
  ]);

  const closeEditTodoModal = useCallback(() => {
    setEditingTodo(null);
  }, [setEditingTodo]);

  const saveTodoTitle = useCallback(async () => {
    if (!editingTodo) return;
    const trimmed = editingTodoTitle.trim();
    if (!trimmed || trimmed === editingTodo.title) return;
    await updateTodoItem(editingTodo.id, { title: trimmed });
    await fetchAllTodos();
  }, [editingTodo, editingTodoTitle, fetchAllTodos]);

  const handleDeleteTodo = useCallback(async () => {
    if (!editingTodo) return;
    await deleteTodoItem(editingTodo.id);
    await fetchAllTodos();
    closeEditTodoModal();
  }, [editingTodo, fetchAllTodos, closeEditTodoModal]);

  const saveTodoChanges = useCallback(async () => {
    if (!editingTodo) return;
    const title = editingTodoTitle.trim();
    if (!title || !editingTodo.due_date) return;
    setSaving(true);
    try {
      await updateTodoItem(editingTodo.id, {
        title,
        due_date: editingTodo.due_date,
        scheduled_time: editingTodo.scheduled_time,
        duration_minutes: editingTodo.duration_minutes,
        recurrence: editingTodo.recurrence,
        notes: editingTodo.notes?.trim() || null,
      });
      await fetchAllTodos();
      setEditingTodo(null);
      setToastMessage('Zadanie zostało zaktualizowane.');
    } finally {
      setSaving(false);
    }
  }, [editingTodo, editingTodoTitle, fetchAllTodos, setEditingTodo, setSaving, setToastMessage]);

  return {
    handleQuickSave,
    handleEditSave,
    closeEditTodoModal,
    saveTodoTitle,
    saveTodoChanges,
    handleDeleteTodo,
  };
}
