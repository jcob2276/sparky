import { useState, useCallback } from 'react';
import { setTodoStatus, deleteTodoItem, updateTodoItem } from '../../../lib/todo/todo';
import { addDays } from '../../calendar/calendarHelpers';
import type { TodoItemRow } from '../useTodoData';

interface UseTodoBulkActionsProps {
  selectedIds: Set<string>;
  setSelectedIds: (s: Set<string>) => void;
  setIsSelectMode: (v: boolean) => void;
  setItems: React.Dispatch<React.SetStateAction<TodoItemRow[]>>;
  today: string;
}

export function useTodoBulkActions({
  selectedIds,
  setSelectedIds,
  setIsSelectMode,
  setItems,
  today,
}: UseTodoBulkActionsProps) {
  const [bulkBusy, setBulkBusy] = useState(false);

  const handleBulkComplete = useCallback(async () => {
    if (selectedIds.size === 0) return;
    setBulkBusy(true);
    try {
      const ids = Array.from(selectedIds);
      setItems((prev) =>
        prev.map((i) =>
          selectedIds.has(i.id) ? { ...i, status: 'done', completed_at: new Date().toISOString() } : i
        )
      );
      await Promise.all(ids.map((id) => setTodoStatus({ id }, 'done')));
      setSelectedIds(new Set());
      setIsSelectMode(false);
    } finally {
      setBulkBusy(false);
    }
  }, [selectedIds, setItems, setSelectedIds, setIsSelectMode]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;
    setBulkBusy(true);
    try {
      const ids = Array.from(selectedIds);
      setItems((prev) => prev.filter((i) => !selectedIds.has(i.id)));
      await Promise.all(ids.map((id) => deleteTodoItem(id)));
      setSelectedIds(new Set());
      setIsSelectMode(false);
    } finally {
      setBulkBusy(false);
    }
  }, [selectedIds, setItems, setSelectedIds, setIsSelectMode]);

  const handleBulkSetToday = useCallback(async () => {
    if (selectedIds.size === 0) return;
    setBulkBusy(true);
    try {
      const ids = Array.from(selectedIds);
      const patch = { due_date: today, ai_bucket: 'today' as const };
      setItems((prev) =>
        prev.map((i) => (selectedIds.has(i.id) ? { ...i, ...patch } : i))
      );
      await Promise.all(ids.map((id) => updateTodoItem(id, patch)));
      setSelectedIds(new Set());
      setIsSelectMode(false);
    } finally {
      setBulkBusy(false);
    }
  }, [selectedIds, today, setItems, setSelectedIds, setIsSelectMode]);

  const handleBulkSetTomorrow = useCallback(async () => {
    if (selectedIds.size === 0) return;
    setBulkBusy(true);
    try {
      const ids = Array.from(selectedIds);
      const tomorrow = addDays(today, 1);
      const patch = { due_date: tomorrow, ai_bucket: 'upcoming' as const };
      setItems((prev) =>
        prev.map((i) => (selectedIds.has(i.id) ? { ...i, ...patch } : i))
      );
      await Promise.all(ids.map((id) => updateTodoItem(id, patch)));
      setSelectedIds(new Set());
      setIsSelectMode(false);
    } finally {
      setBulkBusy(false);
    }
  }, [selectedIds, today, setItems, setSelectedIds, setIsSelectMode]);

  const handleBulkSetPriority = useCallback(
    async (priority: 'urgent' | 'high' | 'normal' | 'low') => {
      if (selectedIds.size === 0) return;
      setBulkBusy(true);
      try {
        const ids = Array.from(selectedIds);
        setItems((prev) =>
          prev.map((i) => (selectedIds.has(i.id) ? { ...i, priority } : i))
        );
        await Promise.all(ids.map((id) => updateTodoItem(id, { priority })));
        setSelectedIds(new Set());
        setIsSelectMode(false);
      } finally {
        setBulkBusy(false);
      }
    },
    [selectedIds, setItems, setSelectedIds, setIsSelectMode]
  );

  return {
    bulkBusy,
    handleBulkComplete,
    handleBulkDelete,
    handleBulkSetToday,
    handleBulkSetTomorrow,
    handleBulkSetPriority,
  };
}
