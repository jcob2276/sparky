import { useEffect } from 'react';

interface UseKeepKeyboardShortcutsParams {
  onNewNote: () => void;
  onClearSelection?: () => void;
  isSelectMode?: boolean;
  setIsSelectMode?: (val: boolean) => void;
  onCloseEditing?: () => void;
  editingId?: string | null;
  onToggleViewMode?: () => void;
}

export function useKeepKeyboardShortcuts({
  onNewNote,
  onClearSelection,
  isSelectMode,
  setIsSelectMode,
  onCloseEditing,
  editingId,
  onToggleViewMode,
}: UseKeepKeyboardShortcutsParams) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const isInput = ['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName) || (e.target as HTMLElement)?.isContentEditable;

      // Escape: exit select mode, or close editing note
      if (e.key === 'Escape') {
        if (isSelectMode) {
          e.preventDefault();
          onClearSelection?.();
          setIsSelectMode?.(false);
          return;
        }
        if (editingId) {
          e.preventDefault();
          onCloseEditing?.();
          return;
        }
      }

      if (isInput) return;

      // Ctrl+N / Cmd+N: new note
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        onNewNote();
        return;
      }

      // 1 / 2: toggle view mode
      if (e.key === '1' || e.key === '2') {
        e.preventDefault();
        onToggleViewMode?.();
        return;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNewNote, onClearSelection, isSelectMode, setIsSelectMode, onCloseEditing, editingId, onToggleViewMode]);
}
