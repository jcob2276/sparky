import { useCallback, useState } from 'react';
import { STORAGE_KEYS } from '../../../lib/constants';

/** Budget panel / config form inputs. */
export function useCalendarBudgetState() {
  const [budgetPanelExpanded, setBudgetPanelExpanded] = useState(false);
  const [showBudgetConfig, setShowBudgetConfig] = useState(false);
  const [budgetMinInputs, setBudgetMinInputs] = useState<Record<string, string>>({});
  const [budgetMaxInputs, setBudgetMaxInputs] = useState<Record<string, string>>({});
  const [frameDaysInputs, setFrameDaysInputs] = useState<Record<string, number[]>>({});
  const [frameStartInputs, setFrameStartInputs] = useState<Record<string, string>>({});
  const [frameEndInputs, setFrameEndInputs] = useState<Record<string, string>>({});
  const [frameStrengthInputs, setFrameStrengthInputs] = useState<Record<string, 'prefer' | 'only'>>({});

  return {
    budgetPanelExpanded, setBudgetPanelExpanded,
    showBudgetConfig, setShowBudgetConfig,
    budgetMinInputs, setBudgetMinInputs,
    budgetMaxInputs, setBudgetMaxInputs,
    frameDaysInputs, setFrameDaysInputs,
    frameStartInputs, setFrameStartInputs,
    frameEndInputs, setFrameEndInputs,
    frameStrengthInputs, setFrameStrengthInputs,
  };
}

/** Sidebar collapsed flag persisted in localStorage. */
export function useCalendarSidebarState() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.CALENDAR_SIDEBAR_COLLAPSED) === 'true';
    } catch {
      return false;
    }
  });

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEYS.CALENDAR_SIDEBAR_COLLAPSED, String(next));
      } catch (err) {
        console.warn('[Calendar] Failed to save sidebar collapsed state to localStorage:', err);
      }
      return next;
    });
  }, []);

  return { sidebarCollapsed, setSidebarCollapsed, toggleSidebar };
}
