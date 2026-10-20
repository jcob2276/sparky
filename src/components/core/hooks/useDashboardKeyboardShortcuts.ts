import { useEffect } from 'react';
import type { DashboardModalSetters } from './useDashboardModalHistory';
import type { DashboardNavigate } from './dashboardViews';

interface KeyboardShortcutsArgs {
  openModal: string | null;
  navigate: DashboardNavigate;
  pathname: string;
  setters: DashboardModalSetters;
}

/** Keyboard shortcuts (Cmd+K for search, ESC to close, N for capture, F for food). */
export function useDashboardKeyboardShortcuts({ openModal, navigate, pathname, setters }: KeyboardShortcutsArgs) {
  const {
    setShowMorningPlan, setShowShutdown, setShowWeeklyReview, setShowQuickFoodEntry,
    setActionCenterOpen, setShowSearch, setShowFastCapture, setFoodEditEntry,
  } = setters;

  useEffect(() => {
    const isTyping = () => {
      const active = document.activeElement;
      if (!active) return false;
      const tag = active.tagName.toLowerCase();
      return tag === 'input' || tag === 'textarea' || active.hasAttribute('contenteditable') || active.getAttribute('contenteditable') === 'true';
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();

      // 1. Search shortcut (Cmd+K or Ctrl+K)
      if ((e.ctrlKey || e.metaKey) && key === 'k') {
        e.preventDefault();
        setShowSearch(prev => !prev);
        return;
      }

      // 2. Escape shortcut to close any open modal
      if (e.key === 'Escape') {
        if (openModal) {
          e.preventDefault();
          setShowMorningPlan(false);
          setShowShutdown(false);
          setShowWeeklyReview(false);
          setShowQuickFoodEntry(false);
          setActionCenterOpen(false);
          setShowSearch(false);
          setShowFastCapture(false);
          setFoodEditEntry(null);
        }
        return;
      }

      // 3. Letter shortcuts (N for Fast Capture, F for Food Entry)
      if (isTyping() || openModal) {
        return;
      }

      if (key === 'n' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setShowFastCapture(true);
      } else if (key === 'f' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();

        if (pathname === '/dzis') {
          document.getElementById('meal-composer')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
          navigate('/dzis');
          setTimeout(() => document.getElementById('meal-composer')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [openModal, navigate, pathname, setShowMorningPlan, setShowShutdown, setShowWeeklyReview,
    setShowQuickFoodEntry, setActionCenterOpen, setShowSearch, setShowFastCapture, setFoodEditEntry]);
}
