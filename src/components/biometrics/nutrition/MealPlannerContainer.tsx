import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { mealPlanKeys } from '../../../lib/queryKeys';
import {
  fetchMealPlanState,
  approveMealPlan,
  toggleShoppingItem,
  resizeMealInPlanState,
} from '../../../lib/health/mealPlanApi';
import { invokeEdge } from '../../../lib/supabase';
import { notify } from '../../../lib/notify';
import { MealPlannerView } from './MealPlannerView';

interface MealPlannerContainerProps {
  userId: string;
  date: string;
  targetKcal: number | null;
  targetProtein: number | null;
}

export function MealPlannerContainer({
  userId,
  date,
  targetKcal,
  targetProtein,
}: MealPlannerContainerProps) {
  const queryClient = useQueryClient();

  const { data: state = null, isLoading } = useQuery({
    queryKey: mealPlanKeys.date(userId, date),
    queryFn: () => fetchMealPlanState(userId, date),
    enabled: Boolean(userId && date),
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await invokeEdge<'vanguard-nutrition-coach'>(
        'vanguard-nutrition-coach',
        {
          body: {
            action: 'generate_meal_plan',
            date,
            calories: targetKcal ?? 2200,
            protein: targetProtein ?? 140,
          },
        }
      );
      if (!res?.success) {
        throw new Error(res?.errors?.[0] || 'Nie udało się ułożyć jadłospisu.');
      }
      return res.state;
    },
    onSuccess: (newState) => {
      queryClient.setQueryData(mealPlanKeys.date(userId, date), newState);
      notify('Ułożono propozycję jadłospisu dopasowaną do Twoich celów.', 'success');
    },
    onError: (err: Error) => {
      notify(err.message, 'error');
    },
  });

  const approveMutation = useMutation({
    mutationFn: () => approveMealPlan(userId, date),
    onSuccess: (newState) => {
      queryClient.setQueryData(mealPlanKeys.date(userId, date), newState);
      notify('Jadłospis został zatwierdzony.', 'success');
    },
    onError: (err: Error) => {
      notify(err.message, 'error');
    },
  });

  const resizeMutation = useMutation({
    mutationFn: ({ mealKey, factor }: { mealKey: string; factor: number }) =>
      resizeMealInPlanState(userId, date, mealKey, factor),
    onSuccess: (newState) => {
      queryClient.setQueryData(mealPlanKeys.date(userId, date), newState);
    },
    onError: (err: Error) => {
      notify(err.message, 'error');
    },
  });

  const toggleShoppingMutation = useMutation({
    mutationFn: (productId: string) => toggleShoppingItem(userId, date, productId),
    onSuccess: (newState) => {
      queryClient.setQueryData(mealPlanKeys.date(userId, date), newState);
    },
    onError: (err: Error) => {
      notify(err.message, 'error');
    },
  });

  if (isLoading && !state) {
    return (
      <div className="rounded-2xl border border-white/5 bg-surface-1 p-4 text-xs text-text-muted">
        Wczytuję jadłospis…
      </div>
    );
  }

  return (
    <MealPlannerView
      date={date}
      state={state}
      targetKcal={targetKcal}
      targetProtein={targetProtein}
      isGenerating={generateMutation.isPending}
      isApproving={approveMutation.isPending}
      onGenerate={() => generateMutation.mutate()}
      onApprove={() => approveMutation.mutate()}
      onResizeMeal={(mealKey, factor) => resizeMutation.mutate({ mealKey, factor })}
      onToggleShoppingItem={(productId) => toggleShoppingMutation.mutate(productId)}
    />
  );
}
