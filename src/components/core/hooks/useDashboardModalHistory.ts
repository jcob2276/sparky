import { useEffect, useRef, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import type { RecentEntry } from '../nutrition/hooks/useFoodEntryData';

export interface DashboardModalSetters {
  setShowMorningPlan: Dispatch<SetStateAction<boolean>>;
  setShowShutdown: Dispatch<SetStateAction<boolean>>;
  setShowWeeklyReview: Dispatch<SetStateAction<boolean>>;
  setShowQuickFoodEntry: Dispatch<SetStateAction<boolean>>;
  setActionCenterOpen: Dispatch<SetStateAction<boolean>>;
  setShowSearch: Dispatch<SetStateAction<boolean>>;
  setShowFastCapture: Dispatch<SetStateAction<boolean>>;
  setFoodEditEntry: Dispatch<SetStateAction<RecentEntry | null>>;
}

/** Browser back button modal support (popstate <-> openModal history sync). */
export function useDashboardModalHistory(
  openModal: string | null,
  isNavigatingRef: MutableRefObject<boolean>,
  setters: DashboardModalSetters,
) {
  const {
    setShowMorningPlan, setShowShutdown, setShowWeeklyReview, setShowQuickFoodEntry,
    setActionCenterOpen, setShowSearch, setShowFastCapture, setFoodEditEntry,
  } = setters;
  const lastOpenModalRef = useRef<string | null>(null);
  const isPopStateRef = useRef(false);

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      isPopStateRef.current = true;
      const modalInState = e.state?.modal;

      // Close all modals
      setShowMorningPlan(false);
      setShowShutdown(false);
      setShowWeeklyReview(false);
      setShowQuickFoodEntry(false);
      setActionCenterOpen(false);
      setShowSearch(false);
      setShowFastCapture(false);
      setFoodEditEntry(null);

      // Open the one in state, if any
      if (modalInState) {
        if (modalInState === 'morningPlan') setShowMorningPlan(true);
        else if (modalInState === 'shutdown') setShowShutdown(true);
        else if (modalInState === 'weeklyReview') setShowWeeklyReview(true);
        else if (modalInState === 'quickFoodEntry') setShowQuickFoodEntry(true);
        else if (modalInState === 'actionCenter') setActionCenterOpen(true);
        else if (modalInState === 'search') setShowSearch(true);
        else if (modalInState === 'fastCapture') setShowFastCapture(true);
      }

      lastOpenModalRef.current = modalInState || null;
      isPopStateRef.current = false;
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [setShowMorningPlan, setShowShutdown, setShowWeeklyReview, setShowQuickFoodEntry,
    setActionCenterOpen, setShowSearch, setShowFastCapture, setFoodEditEntry]);

  useEffect(() => {
    const prev = lastOpenModalRef.current;
    const curr = openModal;

    if (prev === curr) return;

    if (isPopStateRef.current) {
      lastOpenModalRef.current = curr;
      return;
    }

    if (curr && !prev) {
      window.history.pushState({ modal: curr }, '');
    } else if (!curr && prev) {
      if (!isNavigatingRef.current) {
        window.history.back();
      }
      isNavigatingRef.current = false;
    } else if (curr && prev && curr !== prev) {
      window.history.replaceState({ modal: curr }, '');
    }

    lastOpenModalRef.current = curr;
  }, [openModal, isNavigatingRef]);
}
