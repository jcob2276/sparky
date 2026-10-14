import { useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchTrainingPlan, requestTrainingPlan, approveTrainingPlan, revertTrainingPlan, startPlannedWorkout, type PlanVersion, type PlannedWorkout } from '../../../lib/health/trainingPlanApi';
import type { WorkoutLoggerInitial } from '../../../lib/health/workoutDraft';
import { loadWorkoutDraft, hasResumableWorkoutDraftContent } from '../../../lib/health/workoutDraft';
import { notify } from '../../../lib/notify';

export function useTrainingPlan(userId: string, onStartWorkout?: (initial: WorkoutLoggerInitial) => void) {
  const client = useQueryClient();
  const requestKey = useRef<string | null>(null);
  const query = useQuery({ queryKey: ['training-plan', userId], queryFn: () => fetchTrainingPlan(userId),
    refetchInterval: query => query.state.data?.jobs.some(job => job.status === 'queued' || job.status === 'running') ? 3000 : false });
  const refresh = () => client.invalidateQueries({ queryKey: ['training-plan', userId] });
  const mutation = useMutation({
    mutationFn: async (action: { type: 'generate'; weeks: number; instructions: string } | { type: 'approve' | 'revert'; version: PlanVersion } | { type: 'start'; workout: PlannedWorkout }) => {
      if (action.type === 'generate') {
        requestKey.current ??= crypto.randomUUID();
        await requestTrainingPlan(requestKey.current, action.weeks, action.instructions);
        requestKey.current = null;
      } else if (action.type === 'approve') await approveTrainingPlan(action.version);
      else if (action.type === 'revert') await revertTrainingPlan(action.version);
      else if (action.type === 'start') {
        const draft = loadWorkoutDraft(userId);
        if (draft && hasResumableWorkoutDraftContent(draft)) throw new Error('Najpierw wznów albo odrzuć niezapisany trening.');
        onStartWorkout?.(await startPlannedWorkout(action.workout));
      }
    }, onSuccess: refresh, onError: (error: Error) => notify(error.message, 'error'),
  });
  return { data: query.data, loading: query.isPending, error: query.error?.message ?? null, busy: mutation.isPending,
    generate: (weeks: number, instructions: string) => mutation.mutate({ type: 'generate', weeks, instructions }),
    approve: (version: PlanVersion) => mutation.mutate({ type: 'approve', version }),
    revert: (version: PlanVersion) => mutation.mutate({ type: 'revert', version }),
    start: onStartWorkout ? (workout: PlannedWorkout) => mutation.mutate({ type: 'start', workout }) : undefined };
}
