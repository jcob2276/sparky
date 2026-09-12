import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  LearningSkill,
  LearningWeekFocus,
  LearningWeekPin,
} from '../../../lib/growth/growth';
import { useGoalSpineInvalidation } from '../../../hooks/useGoalSpineInvalidation';
import { fetchGrowthDashboardData } from '../../../lib/growth/growthDataApi';
import type {
  GrowthLinkRow,
  GrowthWeekNote,
  GrowthTodoRow,
  GrowthProjectSummary,
  GrowthCheckpoint,
  GrowthContextData,
  GrowthDataResult,
  VanguardIdentityData,
} from '../../../lib/growth/growth.types';

export type {
  GrowthLinkRow,
  GrowthWeekNote,
  GrowthTodoRow,
  GrowthProjectSummary,
  GrowthCheckpoint,
  GrowthContextData,
  GrowthDataResult,
  VanguardIdentityData,
};

export function useGrowthData(userId: string | undefined, weekStart: string) {
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => ['growth-data', userId, weekStart], [userId, weekStart]);

  const query = useQuery<GrowthDataResult | null>({
    queryKey,
    queryFn: async () => {
      if (!userId) return null;
      return fetchGrowthDashboardData(userId, weekStart);
    },
    enabled: !!userId,
  });

  const skills = useMemo(() => query.data?.skills ?? [], [query.data?.skills]);
  const snapshots = useMemo(() => query.data?.snapshots ?? [], [query.data?.snapshots]);
  const focus = query.data?.focus ?? null;
  const pins = useMemo(() => query.data?.pins ?? [], [query.data?.pins]);
  const unreadLinks = useMemo(() => query.data?.unreadLinks ?? [], [query.data?.unreadLinks]);
  const readLinks = useMemo(() => query.data?.readLinks ?? [], [query.data?.readLinks]);
  const openTodos = useMemo(() => query.data?.openTodos ?? [], [query.data?.openTodos]);
  const context = useMemo(() => query.data?.context ?? {
    weekIntention: null,
    weekCommitment: null,
    weekGoals: { intention: null, commitment: null, cialo: null, duch: null, konto: null },
    sprintGoal: null,
    sprintLabel: null,
    activeProjectName: null,
    kpiName: null,
    kpiValue: null,
    kpiTarget: null,
    kpiId: null,
  }, [query.data?.context]);
  const loading = query.isLoading;
  const notesCount = query.data?.rozwojNotesCount ?? 0;
  const powerListStats = useMemo(() => query.data?.powerListStats ?? {
    daysLogged: 0,
    daysWithWins: 0,
    tasksDone: 0,
    tasksSet: 0,
  }, [query.data?.powerListStats]);
  const prevWeekSummary = query.data?.prevWeekSummary ?? null;
  const weekFocusScore = query.data?.weekFocusScore ?? null;
  const activeProjects = useMemo(() => query.data?.activeProjects ?? [], [query.data?.activeProjects]);
  const weekNotes = useMemo(() => query.data?.weekNotes ?? [], [query.data?.weekNotes]);
  const upcomingCheckpoints = useMemo(() => query.data?.upcomingCheckpoints ?? [], [query.data?.upcomingCheckpoints]);

  const refresh = useCallback(async () => {
    await query.refetch();
  }, [query]);

  useGoalSpineInvalidation(refresh);

  const setFocus = useCallback((updater: LearningWeekFocus | null | ((prev: LearningWeekFocus | null) => LearningWeekFocus | null)) => {
    queryClient.setQueryData<GrowthDataResult | null>(queryKey, (old) => {
      if (!old) return old;
      const nextFocus = typeof updater === 'function' ? updater(old.focus) : updater;
      return { ...old, focus: nextFocus };
    });
  }, [queryClient, queryKey]);

  const setPins = useCallback((updater: LearningWeekPin[] | ((prev: LearningWeekPin[]) => LearningWeekPin[])) => {
    queryClient.setQueryData<GrowthDataResult | null>(queryKey, (old) => {
      if (!old) return old;
      const nextPins = typeof updater === 'function' ? updater(old.pins) : updater;
      return { ...old, pins: nextPins };
    });
  }, [queryClient, queryKey]);

  const setSkills = useCallback((updater: LearningSkill[] | ((prev: LearningSkill[]) => LearningSkill[])) => {
    queryClient.setQueryData<GrowthDataResult | null>(queryKey, (old) => {
      if (!old) return old;
      const nextSkills = typeof updater === 'function' ? updater(old.skills) : updater;
      return { ...old, skills: nextSkills };
    });
  }, [queryClient, queryKey]);

  return {
    skills,
    snapshots,
    focus,
    pins,
    unreadLinks,
    readLinks,
    openTodos,
    context,
    loading,
    rozwojNotesCount: notesCount,
    powerListStats,
    prevWeekSummary,
    weekFocusScore,
    activeProjects,
    weekNotes,
    refresh,
    setFocus,
    setPins,
    setSkills,
    upcomingCheckpoints,
    identity: query.data?.identity ?? null,
  };
}
