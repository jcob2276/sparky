import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';
import { mealPlanKeys } from '../../../lib/queryKeys';
import {
  fetchMealPlanState,
  approveMealPlan,
  toggleShoppingItem,
  resizeMealInPlanState,
} from '../../../lib/health/mealPlanApi';
import { invokeEdge } from '../../../lib/supabase';
import { notify } from '../../../lib/notify';


export function useMealPlanner(userId:string,date:string) {
  const queryClient = useQueryClient();
  const requestKey = useRef<string|null>(null);

  const { data: state = null, isLoading,error } = useQuery({
    queryKey: mealPlanKeys.date(userId, date),
    queryFn: () => fetchMealPlanState(userId, date),
    enabled: Boolean(userId && date),
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      requestKey.current ??= crypto.randomUUID();
      const res = await invokeEdge<'vanguard-nutrition-coach'>(
        'vanguard-nutrition-coach',
        {
          body: {
            action: 'generate_meal_plan',
            date,
            requestKey:requestKey.current,
          },
        }
      );
      if (!res?.success) {
        throw new Error(res?.errors?.[0] || 'Nie udało się ułożyć jadłospisu.');
      }
      return res.state;
    },
    onSuccess: (newState) => {
      requestKey.current=null;
      queryClient.setQueryData(mealPlanKeys.date(userId, date), newState);
      notify('Ułożono propozycję jadłospisu dopasowaną do Twoich celów.', 'success');
    },
    onError: (err: Error) => {
      notify(err.message, 'error');
      void queryClient.invalidateQueries({queryKey:mealPlanKeys.date(userId,date)});
    },
  });

  const approveMutation = useMutation({
    mutationFn: () => approveMealPlan(userId, date,`approve:${date}:${state?.revision}`,state?.revision),
    onSuccess: (newState) => {
      queryClient.setQueryData(mealPlanKeys.date(userId, date), newState);
      notify('Jadłospis został zatwierdzony.', 'success');
    },
    onError: (err: Error) => {
      notify(err.message, 'error');
      void queryClient.invalidateQueries({queryKey:mealPlanKeys.date(userId,date)});
    },
  });

  const resizeMutation = useMutation({
    mutationFn: ({ mealKey, factor }: { mealKey: string; factor: number }) =>
      resizeMealInPlanState(userId, date, mealKey, factor,state?.revision),
    onSuccess: (newState) => {
      queryClient.setQueryData(mealPlanKeys.date(userId, date), newState);
    },
    onError: (err: Error) => {
      notify(err.message, 'error');
      void queryClient.invalidateQueries({queryKey:mealPlanKeys.date(userId,date)});
    },
  });

  const toggleShoppingMutation = useMutation({
    mutationFn: (productId: string) => toggleShoppingItem(userId, date, productId,state?.revision,!state?.checkedProducts?.includes(productId)),
    onSuccess: (newState) => {
      queryClient.setQueryData(mealPlanKeys.date(userId, date), newState);
    },
    onError: (err: Error) => {
      notify(err.message, 'error');
      void queryClient.invalidateQueries({queryKey:mealPlanKeys.date(userId,date)});
    },
  });

  return {state,isLoading,error,isGenerating:generateMutation.isPending,isApproving:approveMutation.isPending,
    busy:generateMutation.isPending || approveMutation.isPending || resizeMutation.isPending || toggleShoppingMutation.isPending,
    onGenerate:()=>generateMutation.mutate(),onApprove:()=>approveMutation.mutate(),
    onResizeMeal:(mealKey:string,factor:number)=>resizeMutation.mutate({mealKey,factor}),onToggleShoppingItem:(productId:string)=>toggleShoppingMutation.mutate(productId)};
}
