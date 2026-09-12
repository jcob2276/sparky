import { useEffect } from 'react';
import type { LinkQuickFilter } from '../linksUtils';

interface UseLinksKeyboardShortcutsParams {
  onFocusSearch: () => void;
  onToggleCapture: () => void;
  onSetQuickFilter: (filter: LinkQuickFilter) => void;
  onClearSelection: () => void;
  isSelectMode: boolean;
  selectedCount: number;
}

export function useLinksKeyboardShortcuts({
  onFocusSearch,
  onToggleCapture,
  onSetQuickFilter,
  onClearSelection,
  isSelectMode,
  selectedCount,
}: UseLinksKeyboardShortcutsParams) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      const isTyping = activeTag === 'input' || activeTag === 'textarea' || document.activeElement?.getAttribute('contenteditable') === 'true';

      if (e.key === 'Escape') {
        if (isSelectMode || selectedCount > 0) {
          e.preventDefault();
          onClearSelection();
        }
        return;
      }

      if (isTyping) return;

      if (e.key === '/') {
        e.preventDefault();
        onFocusSearch();
      } else if (e.key === 'c' || e.key === 'n') {
        e.preventDefault();
        onToggleCapture();
      } else if (e.key === '1') {
        e.preventDefault();
        onSetQuickFilter('unread');
      } else if (e.key === '2') {
        e.preventDefault();
        onSetQuickFilter('read');
      } else if (e.key === '3') {
        e.preventDefault();
        onSetQuickFilter('all');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onFocusSearch, onToggleCapture, onSetQuickFilter, onClearSelection, isSelectMode, selectedCount]);
}
