import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createAssignment,
  dropAssignment,
  fetchMonthPlan,
  fetchPastAssignments,
  fetchPocketCandidates,
  fetchTopSkills,
  logLearningProgress,
  type NewAssignment,
} from '../../../lib/learning/learningApi';
import { monthStartOf, sortForToday } from '../../../lib/learning/learningModel';
import { getTodayWarsaw } from '../../../lib/date';
import { notify } from '../../../lib/notify';
import { learningKeys } from '../../../lib/queryKeys';

/** Plan nauki bieżącego miesiąca z dzisiejszym postępem; pozycje za tempem są pierwsze. */
export function useLearningMonth(userId: string | null | undefined) {
  const today = getTodayWarsaw();
  const monthStart = monthStartOf(today);
  const query = useQuery({
    queryKey: learningKeys.month(userId ?? '', monthStart, today),
    queryFn: () => fetchMonthPlan(userId!, monthStart, today),
    enabled: !!userId,
  });
  const plan = query.data;
  const assignments = plan ? sortForToday(plan.assignments, today, plan.loggedToday) : [];
  return {
    today,
    monthStart,
    assignments,
    loggedToday: plan?.loggedToday ?? {},
    isLoading: query.isLoading,
    error: query.error,
  };
}

export function useLogLearningProgress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { assignmentId: string; date: string; amount: number }) =>
      logLearningProgress(input.assignmentId, input.date, input.amount),
    onSuccess: (assignment, input) => {
      if (assignment.status === 'done' && input.amount > 0) {
        notify(`Skończone: „${assignment.title}”. Trafia na półkę.`, 'success');
      }
      return queryClient.invalidateQueries({ queryKey: learningKeys.all });
    },
    onError: (err: unknown) => {
      console.error('[learning] logging progress failed:', err);
      notify('Nie udało się zapisać postępu nauki', 'error');
    },
  });
}

export function useCreateAssignment(userId: string | null | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NewAssignment) => createAssignment(userId!, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: learningKeys.all }),
  });
}

export function useDropAssignment(userId: string | null | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => dropAssignment(userId!, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: learningKeys.all }),
    onError: () => notify('Nie udało się odpuścić pozycji', 'error'),
  });
}

export function usePocketCandidates(userId: string | null | undefined, excludeLinkIds: string[], enabled: boolean) {
  return useQuery({
    queryKey: [...learningKeys.pocket(userId ?? ''), excludeLinkIds.join(',')],
    queryFn: () => fetchPocketCandidates(userId!, excludeLinkIds),
    enabled: !!userId && enabled,
  });
}

export function useTopSkills(userId: string | null | undefined, enabled: boolean) {
  return useQuery({
    queryKey: learningKeys.skills(userId ?? ''),
    queryFn: () => fetchTopSkills(userId!),
    enabled: !!userId && enabled,
    staleTime: 10 * 60_000,
  });
}

export function usePastAssignments(userId: string | null | undefined, monthStart: string) {
  return useQuery({
    queryKey: [...learningKeys.history(userId ?? ''), monthStart],
    queryFn: () => fetchPastAssignments(userId!, monthStart),
    enabled: !!userId,
  });
}
