import { useQuery } from '@tanstack/react-query';
import { fetchLongTermGoals } from '../../../lib/goal/goalSpine';
import { getTodayWarsaw } from '../../../lib/date';
import type { PillarId } from '../../../lib/projects/pillars';

const GOAL_KEYS = {
  cialo: { goal: 'goal_cialo', date: 'date_cialo' },
  duch: { goal: 'goal_duch', date: 'date_duch' },
  konto: { goal: 'goal_konto', date: 'date_konto' },
} as const;

function daysUntil(date: string | null | undefined): number | null {
  if (!date) return null;
  const today = new Date(`${getTodayWarsaw()}T12:00:00`);
  const target = new Date(`${date}T12:00:00`);
  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
}

/** Pełny opis celu sfery (life_goals) i liczba dni do daty celu — pokazywane po kliknięciu zdjęcia sfery na Dziś. */
export function useSphereDirection(userId: string, pillar: PillarId) {
  const { data } = useQuery({
    queryKey: ['sphere-direction', userId],
    queryFn: async () => (await fetchLongTermGoals(userId)).declarations,
    enabled: !!userId,
  });
  const keys = GOAL_KEYS[pillar];
  return {
    direction: data?.[keys.goal]?.trim() || null,
    daysLeft: daysUntil(data?.[keys.date]),
  };
}
