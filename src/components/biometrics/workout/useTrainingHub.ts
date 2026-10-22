import { useState, useEffect, useMemo } from 'react';
import { getTodayWarsaw, getWeekStartWarsaw, shiftDateStr } from '../../../lib/date';
import { useHaptics } from '../../../hooks/useHaptics';
import { useRunningLoad } from '../../../lib/health/runningLoadApi';
import { confirmDialog, notify } from '../../../lib/notify';
import {
  fetchTodayWorkoutDetails,
  fetchRecentWorkoutTemplates,
  fetchHubRecoverySessions,
  fetchLatestBodyWeight,
  type TodayWorkoutDetails,
  type WorkoutTemplateSummary,
} from '../../../lib/health/workoutApi';
import {
  buildHubRecoverySnapshot,
  type HubRecoverySnapshot,
} from '../../../lib/health/hubRecovery';
import {
  buildHubIntelligence,
  type HubForecast,
  type HubLiftRecord,
  type HubNeglect,
} from '../../../lib/health/hubIntelligence';
import {
  loadWorkoutDraft,
  hasResumableWorkoutDraftContent,
  endWorkoutSession,
  loadWorkoutTemplate,
  type WorkoutLoggerInitial,
} from '../../../lib/health/workoutLogging';

const EMPTY_RECOVERY: HubRecoverySnapshot = {
  fatigueByTag: {},
  week: { reps: 0, volumeKg: 0, sessions: 0 },
};

export function useTrainingHub(
  userId: string | undefined,
  onStartWorkout: (initial?: WorkoutLoggerInitial | null) => void,
) {
  const [loading, setLoading] = useState(Boolean(userId));
  const [todaySession, setTodaySession] = useState<TodayWorkoutDetails | null>(null);
  const [templates, setTemplates] = useState<WorkoutTemplateSummary[]>([]);
  const [recoveryRows, setRecoveryRows] = useState<Awaited<ReturnType<typeof fetchHubRecoverySessions>>>([]);
  const [bodyWeightKg, setBodyWeightKg] = useState<number | null>(null);
  const running = useRunningLoad(userId);
  const [hasDraft, setHasDraft] = useState(false);
  const haptics = useHaptics();
  const todayStr = getTodayWarsaw();

  const recovery = useMemo(() => {
    if (!recoveryRows.length) return EMPTY_RECOVERY;
    const weekStart = getWeekStartWarsaw(todayStr);
    const weekEnd = shiftDateStr(weekStart, 6);
    return buildHubRecoverySnapshot(recoveryRows, weekStart, weekEnd, undefined, running.data?.fatigueInput ?? [], bodyWeightKg);
  }, [recoveryRows, todayStr, running.data, bodyWeightKg]);

  const intelligence = useMemo(
    () =>
      recoveryRows.length
        ? buildHubIntelligence(recoveryRows, todayStr)
        : { records: [] as HubLiftRecord[], forecasts: [] as HubForecast[], neglects: [] as HubNeglect[] },
    [recoveryRows, todayStr],
  );

  useEffect(() => {
    if (!userId) return;
    let active = true;
    void Promise.all([
      fetchTodayWorkoutDetails(userId, todayStr),
      fetchRecentWorkoutTemplates(userId),
      fetchHubRecoverySessions(userId),
      fetchLatestBodyWeight(userId),
    ])
      .then(([todayData, tplData, recoveryData, bodyWeight]) => {
        if (!active) return;
        setBodyWeightKg(bodyWeight);
        setTodaySession(todayData);
        setTemplates(tplData);
        setRecoveryRows(recoveryData);
        const draft = loadWorkoutDraft(userId);
        setHasDraft(Boolean(draft && hasResumableWorkoutDraftContent(draft)));
      })
      .catch((error: Error) => {
        if (active) notify(error.message, 'error');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [userId, todayStr]);


  const handleResumeDraft = () => {
    haptics.success();
    onStartWorkout();
  };

  const handleDiscardDraft = async () => {
    if (!userId || !(await confirmDialog('Czy na pewno chcesz odrzucić niezapisany szkic treningu?'))) return;
    endWorkoutSession(userId);
    setHasDraft(false);
    haptics.light();
  };

  const handleSelectTemplate = async (template: WorkoutTemplateSummary) => {
    if (!userId) return;
    haptics.light();
    setLoading(true);
    try {
      onStartWorkout(await loadWorkoutTemplate(userId, template.workoutDay));
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Nie udało się wczytać treningu.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleStartBlank = () => {
    haptics.light();
    if (userId) endWorkoutSession(userId);
    onStartWorkout(null);
  };

  return {
    loading,
    todaySession,
    templates,
    records: intelligence.records,
    forecasts: intelligence.forecasts,
    neglects: intelligence.neglects,
    hasDraft,
    running,
    fatigueByTag: recovery.fatigueByTag,
    weekStats: recovery.week,
    handleResumeDraft,
    handleDiscardDraft,
    handleSelectTemplate,
    handleStartBlank,
  };
}
