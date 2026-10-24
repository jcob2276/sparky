import { useState, useEffect, useCallback, useRef } from 'react';
import { getTodayWarsaw } from '../../../lib/date';
import { useHaptics } from '../../../hooks/useHaptics';
import { notify, confirmDialog } from '../../../lib/notify';
import {
  newExercise,
  useStopwatch,
  type WorkoutExercise,
  type WorkoutActivity,
} from '../workout/workoutUtils';
import {
  endWorkoutSession,
  hasResumableWorkoutDraftContent,
  loadWorkoutDraft,
  markWorkoutSessionActive,
  saveWorkoutSession,
  type WorkoutLoggerInitial,
} from '../../../lib/health/workoutLogging';
import { useWorkoutDraftPersistence } from './useWorkoutDraftPersistence';
import { useUserId } from '../../../store/useStore';
import { useQueryClient } from '@tanstack/react-query';
import { calendarKeys, biometricsKeys } from '../../../lib/queryKeys';

interface UseWorkoutLoggerOptions {
  initial?: WorkoutLoggerInitial | null;
  onSaved?: () => void;
  onBack: () => void;
}

export function useWorkoutLogger({ initial, onSaved, onBack }: UseWorkoutLoggerOptions) {
  const userId = useUserId();
  const queryClient = useQueryClient();
  const [workoutName, setWorkoutName] = useState('');
  const [exercises, setExercises] = useState<WorkoutExercise[]>([newExercise()]);
  const [activities, setActivities] = useState<WorkoutActivity[]>([]);
  const [notes, setNotes] = useState('');
  const [sessionRpe, setSessionRpe] = useState<number | null>(null);
  const [planWorkoutId, setPlanWorkoutId] = useState<string | undefined>(initial?.planWorkoutId);
  const [saving, setSaving] = useState(false);
  const [timerStart, setTimerStart] = useState<number | null>(() => Date.now());

  // Custom manual time overrides
  const [manualTime, setManualTime] = useState(false);
  const todayStr = getTodayWarsaw();
  const [workoutDate, setWorkoutDate] = useState(todayStr);
  const [startTimeManual, setStartTimeManual] = useState('18:00');
  const [endTimeManual, setEndTimeManual] = useState('19:00');
  const elapsed = useStopwatch(timerStart);
  const haptics = useHaptics();
  const sessionEndedRef = useRef(false);
  const finalizeWorkoutSession = useCallback(() => {
    sessionEndedRef.current = true;
    if (!userId) return;
    endWorkoutSession(userId);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    const draft = loadWorkoutDraft(userId);
    const seed =
      draft && hasResumableWorkoutDraftContent(draft)
        ? draft
        : initial ?? draft;
    if (!seed) return;
    void (async () => {
      setWorkoutName(seed.workoutName);
      setExercises(seed.exercises?.length ? seed.exercises : [newExercise()]);
      setActivities(seed.activities ?? []);
      setNotes(seed.notes ?? '');
      setSessionRpe(seed.sessionRpe ?? null);
      setPlanWorkoutId(seed.planWorkoutId);
      if (draft) {
        setWorkoutDate(draft.workoutDate);
        setTimerStart(draft.timerStart);
        setManualTime(draft.manualTime);
        setStartTimeManual(draft.startTimeManual);
        setEndTimeManual(draft.endTimeManual);
      }
    })();
  }, [userId, initial]);

  useEffect(() => {
    if (!userId) return;
    markWorkoutSessionActive(userId);
  }, [userId]);

  useWorkoutDraftPersistence(userId, {
      workoutName,
      exercises,
      activities,
      notes,
      sessionRpe,
      planWorkoutId,
      workoutDate,
      timerStart,
      manualTime,
      startTimeManual,
      endTimeManual,
      savedAt: 0, // saveWorkoutDraft stamps the actual persistence time.
    }, sessionEndedRef);

  const hasUnsavedData = Boolean(
    workoutName.trim() ||
      notes.trim() ||
      sessionRpe != null ||
      exercises.some((e) => e.name.trim()) ||
      activities.some((a) => a.name.trim())
  );

  const handleBack = async () => {
    if (
      hasUnsavedData &&
      !(await confirmDialog(
        'Masz niezapisane dane treningu — wyjść bez zapisywania?'
      ))
    )
      return;
    finalizeWorkoutSession();
    onBack();
  };

  const addExercise = () => {
    haptics.light();
    setExercises((p) => [...p, newExercise()]);
  };
  const removeExercise = (id: number) => {
    if (exercises.length > 1) {
      haptics.light();
      setExercises((p) => p.filter((e) => e.id !== id));
    }
  };
  const updateExercise = (u: WorkoutExercise) =>
    setExercises((p) => p.map((e) => (e.id === u.id ? u : e)));

  async function save() {
    if (!userId || saving) return;
    const validEx = exercises.filter((e) => e.name.trim());
    const validAc = activities.filter((a) => a.name.trim());
    if (!validEx.length && !validAc.length) {
      notify('Dodaj przynajmniej jedno ćwiczenie', 'error');
      return;
    }

    if (manualTime) {
      if (!workoutDate) {
        notify('Wybierz datę treningu', 'error');
        return;
      }
      if (!startTimeManual || !endTimeManual) {
        notify('Podaj godzinę rozpoczęcia i zakończenia treningu', 'error');
        return;
      }
      const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
      if (!timeRegex.test(startTimeManual) || !timeRegex.test(endTimeManual)) {
        notify('Niepoprawny format godziny rozpoczęcia lub zakończenia', 'error');
        return;
      }
    }

    setSaving(true);
    try {
      const { queued, rpeMismatch } = await saveWorkoutSession(userId, {
        workoutName,
        exercises,
        activities,
        notes,
        sessionRpe,
        planWorkoutId,
        workoutDate,
        timerStart,
        manualTime,
        startTimeManual,
        endTimeManual,
      });
      if (userId) {
        void queryClient.invalidateQueries({ queryKey: calendarKeys.all });
        void queryClient.invalidateQueries({ queryKey: biometricsKeys.all });
        void queryClient.invalidateQueries({ queryKey: ['training-plan', userId] });
      }
      finalizeWorkoutSession();
      haptics.success();
      if (queued) {
        notify(
          'Brak sieci — trening zapisany lokalnie, zsynchronizuje się automatycznie',
          'info'
        );
      } else if (rpeMismatch) {
        notify(rpeMismatch, 'info');
      }
      onSaved?.();
      onBack();
    } catch (err: unknown) {
      haptics.error();
      const message =
        err instanceof Error ? (err as Error).message : String(err);
      if (message.includes('Not authorized') || message.includes('JWT')) {
        notify(
          'Sesja wygasła — odśwież stronę (draft treningu zostaje lokalnie)',
          'error'
        );
      } else {
        notify(message, 'error');
      }
    } finally {
      setSaving(false);
    }
  }

  return {
    workoutName,
    setWorkoutName,
    exercises,
    setExercises,
    activities,
    setActivities,
    notes,
    setNotes,
    sessionRpe,
    setSessionRpe,
    saving,
    timerStart,
    setTimerStart,
    manualTime,
    setManualTime,
    workoutDate,
    setWorkoutDate,
    startTimeManual,
    setStartTimeManual,
    endTimeManual,
    setEndTimeManual,
    elapsed,
    addExercise,
    removeExercise,
    updateExercise,
    save,
    handleBack,
  };
}
