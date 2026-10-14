import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchHealthGoals, saveHealthGoals, HEALTH_GOAL_PRESETS, type HealthGoal, type TrainingConstraints } from '../../../lib/health/healthGoals';
import { notify } from '../../../lib/notify';

export function useHealthGoalEditor(userId: string) {
  const client = useQueryClient();
  const query = useQuery({ queryKey: ['health-goals', userId], queryFn: () => fetchHealthGoals(userId) });
  const [draft, setDraft] = useState<{ goals: HealthGoal[]; constraints: TrainingConstraints } | null>(null);
  const goals = draft?.goals ?? (query.data?.goals.length ? query.data.goals : HEALTH_GOAL_PRESETS);
  const constraints = draft?.constraints ?? query.data?.constraints ?? { revision: 0, availability: [], equipment: [], limitations: [] };
  const changeGoal = (index: number, goal: HealthGoal) => setDraft({ constraints, goals: goals.map((old, i) => i === index ? goal : old) });
  const changeConstraints = (value: TrainingConstraints) => setDraft({ goals, constraints: value });
  const save = useMutation({ mutationFn: () => saveHealthGoals(userId, goals, constraints),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['health-goals', userId] });
      await client.invalidateQueries({ queryKey: ['training-plan', userId] });
      setDraft(null); notify('Cele i dostępność zapisane.', 'success');
    }, onError: (error: Error) => notify(error.message, 'error') });
  return { goals, constraints, changeGoal, changeConstraints, save: () => save.mutate(),
    saving: save.isPending, loading: query.isPending, error: query.error?.message ?? null,
    profileBodyFat: query.data?.profileBodyFat ?? null };
}
