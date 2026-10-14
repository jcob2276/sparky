import { useState, useEffect, useMemo } from 'react';
import { getTodayWarsaw } from '../../../lib/date';
import { useHaptics } from '../../../hooks/useHaptics';
import { confirmDialog, notify } from '../../../lib/notify';
import { fetchTodayWorkoutDetails, fetchRecentWorkoutTemplates, type TodayWorkoutDetails, type WorkoutTemplateSummary } from '../../../lib/health/workoutApi';
import { loadWorkoutDraft, hasResumableWorkoutDraftContent, endWorkoutSession, loadWorkoutTemplate, type WorkoutLoggerInitial } from '../../../lib/health/workoutLogging';

export function useTrainingHub(userId: string | undefined, onStartWorkout: (initial?: WorkoutLoggerInitial | null) => void) {
  const [loading, setLoading] = useState(Boolean(userId));
  const [todaySession, setTodaySession] = useState<TodayWorkoutDetails | null>(null);
  const [templates, setTemplates] = useState<WorkoutTemplateSummary[]>([]);
  const [hasDraft, setHasDraft] = useState(false);
  const haptics = useHaptics();
  const todayStr = getTodayWarsaw();
  const heatmapWorkouts = useMemo(() => templates.map(t => ({ date: t.date, totalTonnage: t.totalTonnageKg })), [templates]);
  useEffect(() => {
    if (!userId) return;
    let active = true;
    void Promise.all([fetchTodayWorkoutDetails(userId, todayStr), fetchRecentWorkoutTemplates(userId)])
      .then(([todayData, tplData]) => {
        if (!active) return;
        setTodaySession(todayData); setTemplates(tplData);
        const draft = loadWorkoutDraft(userId);
        setHasDraft(Boolean(draft && hasResumableWorkoutDraftContent(draft)));
      }).catch((error: Error) => { if (active) notify(error.message, 'error'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [userId, todayStr]);
  const handleResumeDraft = () => { haptics.success(); onStartWorkout(); };
  const handleDiscardDraft = async () => {
    if (!userId || !await confirmDialog('Czy na pewno chcesz odrzucić niezapisany szkic treningu?')) return;
    endWorkoutSession(userId); setHasDraft(false); haptics.light();
  };
  const handleSelectTemplate = async (template: WorkoutTemplateSummary) => {
    if (!userId) return;
    haptics.light(); setLoading(true);
    try { onStartWorkout(await loadWorkoutTemplate(userId, template.workoutDay)); }
    catch (error) { notify(error instanceof Error ? error.message : 'Nie udało się wczytać treningu.', 'error'); }
    finally { setLoading(false); }
  };
  const handleStartBlank = () => { haptics.light(); if (userId) endWorkoutSession(userId); onStartWorkout(null); };
  return { loading, todaySession, templates, hasDraft, heatmapWorkouts, handleResumeDraft, handleDiscardDraft, handleSelectTemplate, handleStartBlank };
}
