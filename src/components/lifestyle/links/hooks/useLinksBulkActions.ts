import { useState, useCallback } from 'react';
import type { SavedLink } from '../../../../lib/linksApi';
import {
  bulkUpdateLinkStatus,
  bulkUpdateLinkCategory,
  bulkDeleteLinks,
} from '../../../../lib/linksApi';
import { supabase } from '../../../../lib/supabase';
import { confirmDialog, notify } from '../../../../lib/notify';
import { convertLinkToTodoItem } from '../../../../lib/behavior/captureBridge';

interface UseLinksBulkActionsParams {
  userId: string;
  links: SavedLink[];
  onSuccess: () => void;
}

export function useLinksBulkActions({ userId, links, onSuccess }: UseLinksBulkActionsParams) {
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

  const handleBulkMarkRead = useCallback(async (newStatus: 'read' | 'unread') => {
    if (selectedIds.size === 0) return;
    setBulkBusy(true);
    try {
      await bulkUpdateLinkStatus(supabase, Array.from(selectedIds), newStatus);
      notify(newStatus === 'read' ? `Oznaczono ${selectedIds.size} jako przeczytane` : `Oznaczono ${selectedIds.size} jako nieprzeczytane`, 'success');
      clearSelection();
      onSuccess();
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : 'Błąd aktualizacji', 'error');
    } finally {
      setBulkBusy(false);
    }
  }, [selectedIds, clearSelection, onSuccess]);

  const handleBulkCategory = useCallback(async (cat: string) => {
    if (selectedIds.size === 0) return;
    setBulkBusy(true);
    try {
      await bulkUpdateLinkCategory(supabase, Array.from(selectedIds), cat);
      notify(`Zmieniono kategorię dla ${selectedIds.size} linków`, 'success');
      clearSelection();
      onSuccess();
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : 'Błąd zmiany kategorii', 'error');
    } finally {
      setBulkBusy(false);
    }
  }, [selectedIds, clearSelection, onSuccess]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;
    const confirmed = await confirmDialog(`Czy na pewno chcesz usunąć ${selectedIds.size} wybranych linków?`);
    if (!confirmed) return;

    setBulkBusy(true);
    try {
      await bulkDeleteLinks(supabase, Array.from(selectedIds));
      notify(`Usunięto ${selectedIds.size} linków`, 'success');
      clearSelection();
      onSuccess();
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : 'Błąd usuwania', 'error');
    } finally {
      setBulkBusy(false);
    }
  }, [selectedIds, clearSelection, onSuccess]);

  const handleBulkToTodo = useCallback(async () => {
    if (selectedIds.size === 0) return;
    setBulkBusy(true);
    try {
      const selected = links.filter((l) => selectedIds.has(l.id));
      for (const link of selected) {
        await convertLinkToTodoItem(userId, link);
      }
      await bulkUpdateLinkStatus(supabase, Array.from(selectedIds), 'read');
      notify(`Utworzono ${selectedIds.size} zadań w Todo`, 'success');
      clearSelection();
      onSuccess();
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : 'Błąd konwersji do zadań', 'error');
    } finally {
      setBulkBusy(false);
    }
  }, [selectedIds, links, userId, clearSelection, onSuccess]);

  return {
    isSelectMode,
    setIsSelectMode,
    selectedIds,
    setSelectedIds,
    toggleSelectId,
    selectAll,
    clearSelection,
    handleBulkMarkRead,
    handleBulkCategory,
    handleBulkDelete,
    handleBulkToTodo,
    bulkBusy,
  };
}
