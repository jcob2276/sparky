import { useQuery } from '@tanstack/react-query';
import { getTodayWarsaw } from '../date';
import { buildExerciseProgress } from './exerciseProgress';
import { fetchLifeTargets } from '../lifeTargetsApi';
import { fetchExerciseHistory } from './workoutApi';
import { BENCH_GOAL_EXERCISE, buildBenchGoal, type BenchGoal } from './benchGoal';

/** Postęp do celu w wyciskaniu z historii serii; liczony z e1RM kolejnych sesji. */
export function useBenchGoal(userId: string | undefined) {
  return useQuery<BenchGoal>({
    queryKey: ['bench-goal', userId],
    enabled: Boolean(userId),
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const [rows, targets] = await Promise.all([fetchExerciseHistory(BENCH_GOAL_EXERCISE, userId as string), fetchLifeTargets(userId as string)]);
      const progress = buildExerciseProgress(BENCH_GOAL_EXERCISE, rows);
      return buildBenchGoal(progress.chartPoints, getTodayWarsaw(), targets.benchKg);
    },
  });
}
