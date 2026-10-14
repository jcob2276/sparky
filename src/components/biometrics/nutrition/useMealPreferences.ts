import {useMutation,useQuery,useQueryClient} from '@tanstack/react-query';
import {fetchMealPreferences,saveMealPreferences} from '../../../lib/health/mealPreferencesApi';
import {mealPlanKeys} from '../../../lib/queryKeys';
import type {MealPreferences} from '@vanguard/domain';
import {notify} from '../../../lib/notify';
export function useMealPreferences(userId:string) {
  const cache=useQueryClient(),key=mealPlanKeys.preferences(userId);
  const query=useQuery({queryKey:key,queryFn:()=>fetchMealPreferences(userId),enabled:Boolean(userId)});
  const save=useMutation({mutationFn:(preferences:MealPreferences)=>saveMealPreferences(userId,preferences),
    onSuccess:preferences=>{cache.setQueryData(key,preferences);notify('Zapisano preferencje żywienia.','success');},
    onError:()=>{void cache.invalidateQueries({queryKey:key});}});
  return {preferences:query.data,loading:query.isLoading,error:query.error?.message ?? save.error?.message ?? null,saving:save.isPending,save:(preferences:MealPreferences)=>save.mutate(preferences)};
}
