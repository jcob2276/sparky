import { useCallback, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useUserSettings } from '../../../hooks/useUserSettings';
import {
  useCalendarEvents,
  useCreateCalendarEvent,
  useUpdateCalendarEvent,
  useDeleteCalendarEvent,
} from '../../../lib/calendarApi';
import {
  todayStr,
  weekMon,
  dateOfISO,
  CalRow,
} from '../calendarHelpers';

import { CalendarTodo } from './useCalendarTodos';
import { useCalendarWeather } from './useCalendarWeather';
import { useCalendarEventDrag } from './useCalendarEventDrag';
import { parseRecurrenceRule } from '../calendarView/calendarViewHelpers';

import { useLifeObligations } from '../../../lib/lifeObligationsApi';
import {
  type CalView,
  getInitialCalView,
  computeVisibleRange,
  buildObligationEvents,
  mergeCalendarEvents,
  filterDisplayEvents,
  formatTimeOfISO,
} from './calendarDataHelpers';
import { useCalendarQuickCreateState } from './useCalendarQuickCreateState';
import { useCalendarEditState } from './useCalendarEditState';
import { useCalendarBudgetState, useCalendarSidebarState } from './useCalendarPanelState';
import { useCalendarRealtime } from './useCalendarRealtime';
import { useCalendarDeleteActions } from './useCalendarDeleteActions';

export type { QuickCreateState } from './useCalendarQuickCreateState';

export function useCalendarData(userId: string | undefined, accessToken: string | undefined) {
  const queryClient = useQueryClient();
  const today = todayStr();
  const [calView, setCalView] = useState<CalView>(getInitialCalView);
  const [selectedDay, setSelectedDay] = useState(today);
  const [weekStart, setWeekStart] = useState(() => weekMon(today));

  // Visible date range
  const visibleRange = useMemo(
    () => computeVisibleRange(calView, weekStart, selectedDay),
    [calView, weekStart, selectedDay]
  );

  // Query events using our react-query DAL
  const { data: rawEvents = [], isLoading: loading } = useCalendarEvents(
    userId || '',
    visibleRange.rangeStart,
    visibleRange.rangeEnd
  );

  // Query Terminy (Life Obligations) and project them onto the Calendar
  const { data: obligations = [] } = useLifeObligations(userId);

  const obligationEvents = useMemo(
    () => buildObligationEvents(obligations, today),
    [obligations, today]
  );

  const events = useMemo(
    () => mergeCalendarEvents(rawEvents, obligationEvents),
    [rawEvents, obligationEvents]
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [disabledCategories, setDisabledCategories] = useState<Set<string>>(() => new Set());

  const toggleCategory = useCallback((cat: string) => {
    setDisabledCategories((prev) => {
      const next = new Set(prev);
      const key = cat.toLowerCase();
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const displayEvents = useMemo(
    () => filterDisplayEvents(events, disabledCategories, searchQuery),
    [events, searchQuery, disabledCategories]
  );

  // Mutations
  const createEventMutation = useCreateCalendarEvent();
  const updateEventMutation = useUpdateCalendarEvent();
  const deleteEventMutation = useDeleteCalendarEvent();

  // Component states
  const quick = useCalendarQuickCreateState();

  const [editingTodo, setEditingTodo] = useState<CalendarTodo | null>(null);
  const [editingTodoTitle, setEditingTodoTitle] = useState('');

  const edit = useCalendarEditState();
  const {
    setSelectedEvent, setEditTitle, setEditCategory, setEditStart, setEditEnd, setEditDate,
    setEditDescription, setEditLocation, setEditAllDay, setEditReminder, setEditRecurrence,
    setEditCustomDays, setEditRecurrenceEndDate,
  } = edit;

  const budget = useCalendarBudgetState();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<CalRow | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const sidebar = useCalendarSidebarState();

  const { data: userSettings } = useUserSettings(userId);

  const { weather, weatherLoading } = useCalendarWeather({
    today,
    homeLat: userSettings?.home_lat,
    homeLng: userSettings?.home_lng,
  });

  const fetchEvents = useCalendarRealtime(userId, visibleRange);

  const [viewingEvent, setViewingEvent] = useState<CalRow | null>(null);

  const openEditFromPreview = useCallback((ev: CalRow) => {
    setViewingEvent(null);
    setSelectedEvent(ev);
    setEditTitle(ev.summary || '');
    setEditCategory(ev.category || null);
    setEditDescription(ev.description || '');
    setEditLocation(ev.location || '');
    setEditAllDay(!!ev.is_all_day);
    setEditReminder(ev.reminder_minutes ?? null);
    const recurrenceState = parseRecurrenceRule(ev.recurrence);
    setEditRecurrence(recurrenceState.recurrence);
    setEditCustomDays(recurrenceState.customDays);
    setEditRecurrenceEndDate(recurrenceState.endDate);
    if (ev.start_time) {
      setEditStart(formatTimeOfISO(ev.start_time));
      setEditDate(dateOfISO(ev.start_time));
    }
    if (ev.end_time) {
      setEditEnd(formatTimeOfISO(ev.end_time));
    }
  }, [
    setSelectedEvent, setEditTitle, setEditCategory, setEditDescription, setEditLocation,
    setEditAllDay, setEditReminder, setEditRecurrence, setEditCustomDays,
    setEditRecurrenceEndDate, setEditStart, setEditDate, setEditEnd,
  ]);

  const handleEventClick = useCallback((ev: CalRow) => {
    setViewingEvent(ev);
  }, []);

  const { handleEventMouseDown } = useCalendarEventDrag({
    userId,
    accessToken,
    queryClient,
    visibleRange,
    updateEventMutation,
    onEventClick: handleEventClick,
    setToastMessage,
  });

  const {
    executeDelete, handleEditDelete, restoreLastDeleted, deleteEventWithUndo, lastDeletedEvent,
  } = useCalendarDeleteActions({
    userId,
    accessToken,
    eventToDelete,
    selectedEvent: edit.selectedEvent,
    setEventToDelete,
    setSelectedEvent,
    setViewingEvent,
    setShowDeleteConfirm,
    setToastMessage,
    setDeleting: edit.setDeleting,
    createEventMutation,
    deleteEventMutation,
  });

  const { sidebarCollapsed, setSidebarCollapsed, toggleSidebar } = sidebar;
  const {
    quickCreate, setQuickCreate, closeQuickCreate, quickTitle, setQuickTitle,
    quickDuration, setQuickDuration, quickCategory, setQuickCategory, quickType, setQuickType,
    quickDescription, setQuickDescription, quickLocation, setQuickLocation,
    quickAllDay, setQuickAllDay, quickReminder, setQuickReminder,
    quickRecurrence, setQuickRecurrence, quickCustomDays, setQuickCustomDays,
    quickRecurrenceEndDate, setQuickRecurrenceEndDate, saving, setSaving,
  } = quick;
  const {
    selectedEvent, editTitle, editCategory, editStart, editEnd, editDate, editDescription,
    editLocation, editAllDay, editReminder, editRecurrence, editCustomDays,
    editRecurrenceEndDate, deleting, setDeleting,
  } = edit;
  const {
    budgetPanelExpanded, setBudgetPanelExpanded, showBudgetConfig, setShowBudgetConfig,
    budgetMinInputs, setBudgetMinInputs, budgetMaxInputs, setBudgetMaxInputs,
    frameDaysInputs, setFrameDaysInputs, frameStartInputs, setFrameStartInputs,
    frameEndInputs, setFrameEndInputs, frameStrengthInputs, setFrameStrengthInputs,
  } = budget;

  return useMemo(() => ({
    calView, setCalView,
    selectedDay, setSelectedDay,
    weekStart, setWeekStart,
    visibleRange,
    events, displayEvents,
    searchQuery, setSearchQuery,
    disabledCategories, toggleCategory,
    loading,
    quickCreate, setQuickCreate, closeQuickCreate,
    quickTitle, setQuickTitle,
    quickDuration, setQuickDuration,
    quickCategory, setQuickCategory,
    quickType, setQuickType,
    quickDescription, setQuickDescription,
    quickLocation, setQuickLocation,
    quickAllDay, setQuickAllDay,
    quickReminder, setQuickReminder,
    quickRecurrence, setQuickRecurrence,
    quickCustomDays, setQuickCustomDays,
    quickRecurrenceEndDate, setQuickRecurrenceEndDate,
    saving, setSaving,
    editingTodo, setEditingTodo,
    editingTodoTitle, setEditingTodoTitle,
    viewingEvent, setViewingEvent, openEditFromPreview,
    selectedEvent, setSelectedEvent,
    editTitle, setEditTitle,
    editCategory, setEditCategory,
    editStart, setEditStart,
    editEnd, setEditEnd,
    editDate, setEditDate,
    editDescription, setEditDescription,
    editLocation, setEditLocation,
    editAllDay, setEditAllDay,
    editReminder, setEditReminder,
    editRecurrence, setEditRecurrence,
    editCustomDays, setEditCustomDays,
    editRecurrenceEndDate, setEditRecurrenceEndDate,
    deleting, setDeleting,
    budgetPanelExpanded, setBudgetPanelExpanded,
    showBudgetConfig, setShowBudgetConfig,
    budgetMinInputs, setBudgetMinInputs,
    budgetMaxInputs, setBudgetMaxInputs,
    frameDaysInputs, setFrameDaysInputs,
    frameStartInputs, setFrameStartInputs,
    frameEndInputs, setFrameEndInputs,
    frameStrengthInputs, setFrameStrengthInputs,
    showDeleteConfirm, setShowDeleteConfirm,
    eventToDelete, setEventToDelete,
    toastMessage, setToastMessage,
    sidebarCollapsed, setSidebarCollapsed,
    toggleSidebar,
    weather, weatherLoading,
    fetchEvents,
    handleEventMouseDown,
    handleEventClick,
    executeDelete,
    handleEditDelete,
    deleteEventWithUndo,
    restoreLastDeleted,
    lastDeletedEvent,
    createEventMutation,
    updateEventMutation,
    deleteEventMutation,
  }), [
    budgetMaxInputs, budgetMinInputs, budgetPanelExpanded, calView, closeQuickCreate,
    createEventMutation, deleteEventMutation, deleteEventWithUndo, deleting, disabledCategories, displayEvents,
    editAllDay, editCategory, editCustomDays, editDate, editDescription, editEnd, editLocation,
    editRecurrence, editRecurrenceEndDate, editReminder, editStart, editTitle, editingTodo,
    editingTodoTitle, eventToDelete, events, executeDelete, fetchEvents, frameDaysInputs, frameEndInputs,
    frameStartInputs, frameStrengthInputs, handleEditDelete, handleEventClick, handleEventMouseDown,
    lastDeletedEvent, loading, openEditFromPreview, quickAllDay, quickCategory, quickCreate, quickCustomDays,
    quickDescription, quickDuration, quickLocation, quickRecurrence, quickRecurrenceEndDate,
    quickReminder, quickTitle, quickType, restoreLastDeleted, saving, searchQuery, selectedDay, selectedEvent,
    showBudgetConfig, showDeleteConfirm, sidebarCollapsed, toastMessage, toggleCategory,
    toggleSidebar, updateEventMutation, viewingEvent, visibleRange, weather, weatherLoading, weekStart,
    setBudgetMaxInputs, setBudgetMinInputs, setBudgetPanelExpanded, setDeleting, setEditAllDay,
    setEditCategory, setEditCustomDays, setEditDate, setEditDescription, setEditEnd, setEditLocation,
    setEditRecurrence, setEditRecurrenceEndDate, setEditReminder, setEditStart, setEditTitle,
    setFrameDaysInputs, setFrameEndInputs, setFrameStartInputs, setFrameStrengthInputs,
    setQuickAllDay, setQuickCategory, setQuickCreate, setQuickCustomDays, setQuickDescription,
    setQuickDuration, setQuickLocation, setQuickRecurrence, setQuickRecurrenceEndDate,
    setQuickReminder, setQuickTitle, setQuickType, setSaving, setSelectedEvent, setShowBudgetConfig,
    setSidebarCollapsed,
  ]);
}
