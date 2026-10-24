import { useEffect, useRef, type RefObject } from 'react';
import { hasResumableWorkoutDraftContent, isWorkoutSessionActive, persistWorkoutDraft, saveWorkoutDraft, endWorkoutSession, type WorkoutDraft } from '../../../lib/health/workoutDraft';

/** Keep app-background and debounced saves on the same latest draft, including plan identity. */
export function useWorkoutDraftPersistence(userId: string | undefined, draft: WorkoutDraft,
  ended: RefObject<boolean>) {
  const latest = useRef({ draft });
  useEffect(() => { latest.current = { draft }; });
  useEffect(() => {
    if (!userId) return;
    const flush = () => {
      if (ended.current) return;
      persistWorkoutDraft(userId, latest.current.draft);
    };
    const onHide = () => { if (document.visibilityState === 'hidden') flush(); };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onHide);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onHide);
    };
  }, [userId, ended]);
  useEffect(() => {
    if (!userId || ended.current) return;
    const timer = window.setTimeout(() => {
      if (ended.current) return;
      const current = latest.current.draft;
      if (isWorkoutSessionActive(userId) || hasResumableWorkoutDraftContent(current)) saveWorkoutDraft(userId, current);
      else endWorkoutSession(userId);
    }, 800);
    return () => window.clearTimeout(timer);
  }, [userId, draft, ended]);
}
