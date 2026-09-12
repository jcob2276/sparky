import { useState, useCallback } from 'react';
import type { Note } from '../../../lib/notesApi';
import { confirmDialog, notify } from '../../../lib/notify';

interface UseKeepBulkActionsParams {
  onUpdate: (id: string, patch: Partial<Note>) => void;
  onDelete: (id: string) => void;
}

export function useKeepBulkActions({ onUpdate, onDelete }: UseKeepBulkActionsParams) {
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  const toggleSelectId = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleBulkPin = useCallback((notes: Note[]) => {
    if (selectedIds.size === 0) return;
    const selectedNotes = notes.filter((n) => selectedIds.has(n.id));
    const allPinned = selectedNotes.every((n) => n.is_pinned);
    const newPinState = !allPinned;

    selectedNotes.forEach((n) => onUpdate(n.id, { is_pinned: newPinState }));
    notify(newPinState ? `Przypięto ${selectedIds.size} notatek` : `Odepchnięto ${selectedIds.size} notatek`, 'success');
  }, [selectedIds, onUpdate]);

  const handleBulkArchive = useCallback((notes: Note[]) => {
    if (selectedIds.size === 0) return;
    const selectedNotes = notes.filter((n) => selectedIds.has(n.id));
    const allArchived = selectedNotes.every((n) => n.is_archived);
    const newArchiveState = !allArchived;

    selectedNotes.forEach((n) => onUpdate(n.id, { is_archived: newArchiveState, is_pinned: false }));
    notify(newArchiveState ? `Zarchiwizowano ${selectedIds.size} notatek` : `Przywrócono ${selectedIds.size} notatek`, 'success');
    clearSelection();
  }, [selectedIds, onUpdate, clearSelection]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;
    const confirmed = await confirmDialog(`Czy na pewno chcesz przenieść ${selectedIds.size} notatek do kosza?`);
    if (!confirmed) return;

    setBulkBusy(true);
    try {
      selectedIds.forEach((id) => onDelete(id));
      notify(`Przeniesiono ${selectedIds.size} notatek do kosza`, 'success');
      clearSelection();
    } finally {
      setBulkBusy(false);
    }
  }, [selectedIds, onDelete, clearSelection]);

  const handleBulkColor = useCallback((color: string) => {
    if (selectedIds.size === 0) return;
    selectedIds.forEach((id) => onUpdate(id, { color }));
    notify(`Zmieniono kolor dla ${selectedIds.size} notatek`, 'success');
  }, [selectedIds, onUpdate]);

  const handleBulkMoveFolder = useCallback((folderId: string | null) => {
    if (selectedIds.size === 0) return;
    selectedIds.forEach((id) => onUpdate(id, { folder_id: folderId }));
    notify(`Przeniesiono ${selectedIds.size} notatek`, 'success');
    clearSelection();
  }, [selectedIds, onUpdate, clearSelection]);

  return {
    isSelectMode,
    setIsSelectMode,
    selectedIds,
    setSelectedIds,
    toggleSelectId,
    selectAll,
    clearSelection,
    handleBulkPin,
    handleBulkArchive,
    handleBulkDelete,
    handleBulkColor,
    handleBulkMoveFolder,
    bulkBusy,
  };
}
