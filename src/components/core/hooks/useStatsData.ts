import { useState } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { useUserId } from '../../../store/useStore';
import { useUserSettings } from '../../../hooks/useUserSettings';
import type { Tables, TablesInsert } from '../../../lib/database.types';
import { upsertBodyMetrics } from '../../../lib/health/bodyMetricsApi';
import {
  deleteWorkoutSession,
  updateWorkoutSession,
  updateExerciseLog,
  deleteExerciseLog,
} from '../../../lib/health/workoutApi';
import { exportStatsMarkdown, exportOuraCsv } from '../../../lib/stats/exportStats';
import { notify, confirmDialog } from '../../../lib/notify';
import type { NewMetricState } from '../stats/BodyMetricsSection';
import { mergeBodyMetricSavePayload } from '../../../lib/health/bodyMetrics';
import { getTodayWarsaw, shiftDateStr } from '../../../lib/date';
import { useStatsOverviewQuery } from '../../../lib/statsOverviewApi';
import { statsOverviewKeys } from '../../../lib/queryKeys';

type ExerciseLogRow = Tables<'exercise_logs'>;
export type EditableExerciseLog = Omit<ExerciseLogRow, 'weight' | 'reps'> & {
  weight: number | string | null;
  reps: number | string | null;
};
export type WorkoutSessionRow = Tables<'workout_sessions'> & { exercise_logs?: ExerciseLogRow[]; duration?: number | string };
export type EditFormState = { date: string | null; workout_day: string; logs: EditableExerciseLog[] };

export function useStatsData() {
  const userId = useUserId();
  const { data: userSettings } = useUserSettings(userId);
  const queryClient = useQueryClient();
  const { data: overview, isLoading: loading } = useStatsOverviewQuery(userId);
  const bodyData = overview?.bodyData ?? [];
  const recentSessions = overview?.recentSessions ?? [];
  const strainRows = overview?.strainRows ?? [];
  const heightCm = overview?.heightCm ?? null;
  const trends = overview?.trends ?? {};
  const projections = overview?.projections ?? null;
  const refetchStats = () => {
    if (userId) queryClient.invalidateQueries({ queryKey: statsOverviewKeys.forUser(userId) });
  };
  const [newMetric, setNewMetric] = useState<NewMetricState>({ weight: '', waist: '', neck: '', chest: '', belly: '', hips: '', thigh: '', biceps_l: '', calf: '' });
  const [dateRange, setDateRange] = useState({
    from: shiftDateStr(getTodayWarsaw(), -7),
    to: getTodayWarsaw()
  });
  const [includeNutrition, setIncludeNutrition] = useState(true);
  const [includeJournal, setIncludeJournal] = useState(true);
  const [includeOura, setIncludeOura] = useState(true);
  const [includeHabits, setIncludeHabits] = useState(true);
  const [includeWorkouts, setIncludeWorkouts] = useState(true);
  const [includeBody, setIncludeBody] = useState(true);
  const [includeActivityWatch, setIncludeActivityWatch] = useState(true);
  const [includeFundament, setIncludeFundament] = useState(true);
  const [editingSession, setEditingSession] = useState<string | null>(null);
  const [showAllSessions, setShowAllSessions] = useState(false);
  const [editForm, setEditForm] = useState<EditFormState>({ date: '', workout_day: '', logs: [] });

  const saveMetricsMutation = useMutation({
    mutationFn: async () => {
      const today = getTodayWarsaw();
      const existingToday = bodyData.find((row) => row.date === today) ?? null;
      const payload = mergeBodyMetricSavePayload(today, userId!, existingToday, newMetric);
      if (!payload) {
        throw new Error('Podaj przynajmniej jeden pomiar.');
      }
      await upsertBodyMetrics(payload as TablesInsert<'body_metrics'>);
    },
    onSuccess: () => {
      notify('Zapisano!', 'success');
      setNewMetric({ weight: '', waist: '', neck: '', chest: '', belly: '', hips: '', thigh: '', biceps_l: '', calf: '' });
      refetchStats();
    },
    onError: (error: Error) => {
      notify(error.message, 'error');
    }
  });

  const saveMetrics = (e: React.FormEvent) => {
    e.preventDefault();
    saveMetricsMutation.mutate();
  };

  const deleteSessionMutation = useMutation({
    mutationFn: async (id: string) => {
      await deleteWorkoutSession(id);
    },
    onSuccess: () => {
      refetchStats();
    },
    onError: (error: Error) => {
      notify(error.message, 'error');
    }
  });

  const deleteSession = async (id: string) => {
    if (!(await confirmDialog('Usunąć trening?'))) return;
    deleteSessionMutation.mutate(id);
  };

  const startEditing = async (session: WorkoutSessionRow) => {
    if (!session) return;
    setEditingSession(session.id);
    setEditForm({
      date: session.date,
      workout_day: session.workout_day ?? '',
      logs: (session.exercise_logs || []).map((log) => ({ ...log }))
    });
  };

  const updateSessionMutation = useMutation({
    mutationFn: async () => {
      if (!editingSession) return;
      await updateWorkoutSession(editingSession, {
        date: editForm.date!,
        workout_day: editForm.workout_day,
      });

      for (const log of editForm.logs) {
        const weight = log.weight === '' || log.weight == null ? null : Number(log.weight);
        const reps = log.reps === '' || log.reps == null ? null : Number.parseInt(String(log.reps), 10);
        if ((weight != null && Number.isNaN(weight)) || (reps != null && Number.isNaN(reps))) {
          throw new Error('Nieprawidłowa wartość w serii.');
        }
        if (reps == null) {
          throw new Error('Liczba powtórzeń jest wymagana — nie może być puste.');
        }
        await updateExerciseLog(log.id, { weight, reps });
      }
    },
    onSuccess: () => {
      notify('Trening zaktualizowany!', 'success');
      setEditingSession(null);
      refetchStats();
    },
    onError: (err: Error) => {
      notify('Błąd podczas aktualizacji: ' + (err.message || String(err)), 'error');
    }
  });

  const updateSession = () => {
    updateSessionMutation.mutate();
  };

  const deleteLogMutation = useMutation({
    mutationFn: async (id: string) => {
      await deleteExerciseLog(id);
      return id;
    },
    onSuccess: (id) => {
      setEditForm({ ...editForm, logs: editForm.logs.filter(l => l.id !== id) });
    },
    onError: (err: Error) => {
      notify('Błąd podczas usuwania serii: ' + (err.message || String(err)), 'error');
    }
  });

  const deleteLog = async (id: string) => {
    if (!(await confirmDialog('Usunąć tę serię?'))) return;
    deleteLogMutation.mutate(id);
  };

  const exportParams = {
    session: { user: { id: userId! }, access_token: '' },
    dateRange, userSettings,
    includeNutrition, includeJournal, includeOura, includeHabits,
    includeWorkouts, includeBody, includeActivityWatch, includeFundament,
  };

  const exportDataMutation = useMutation({
    mutationFn: () => exportStatsMarkdown(exportParams),
    onSuccess: () => { notify('Raport wygenerowany', 'success'); },
    onError: (err: Error) => {
      console.error('Export markdown error:', err);
      notify('Błąd generowania raportu: ' + (err.message || String(err)), 'error');
    },
  });

  const copyDataMutation = useMutation({
    mutationFn: async () => {
      const res = await exportStatsMarkdown({ ...exportParams, skipDownload: true });
      if (res?.markdown && typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(res.markdown);
      }
    },
    onSuccess: () => { notify('Skopiowano treść raportu do schowka', 'success'); },
    onError: (err: Error) => { notify('Błąd kopiowania: ' + (err.message || String(err)), 'error'); },
  });

  const exportData = () => { exportDataMutation.mutate(); };
  const isExporting = exportDataMutation.isPending;
  const copyData = () => { copyDataMutation.mutate(); };
  const isCopying = copyDataMutation.isPending;

  const exportOuraCSVMutation = useMutation({
    mutationFn: () => exportOuraCsv({ session: { user: { id: userId! } }, dateRange }),
    onError: (err: Error) => {
      console.error('Export Oura CSV error:', err);
      notify('Błąd podczas generowania CSV Oura: ' + (err.message || String(err)), 'error');
    }
  });

  const exportOuraCSV = () => { exportOuraCSVMutation.mutate(); };
  const isExportingOura = exportOuraCSVMutation.isPending;

  return {
    userId, loading, bodyData, recentSessions, strainRows, heightCm, trends, projections,
    newMetric, setNewMetric,
    dateRange, setDateRange,
    isExporting, isExportingOura,
    includeNutrition, setIncludeNutrition,
    includeJournal, setIncludeJournal,
    includeOura, setIncludeOura,
    includeHabits, setIncludeHabits,
    includeWorkouts, setIncludeWorkouts,
    includeBody, setIncludeBody,
    includeActivityWatch, setIncludeActivityWatch,
    includeFundament, setIncludeFundament,
    editingSession, setEditingSession,
    showAllSessions, setShowAllSessions,
    editForm, setEditForm,
    saveMetrics, deleteSession,
    startEditing, updateSession, deleteLog, exportData, copyData, isCopying, exportOuraCSV,
  };
}
