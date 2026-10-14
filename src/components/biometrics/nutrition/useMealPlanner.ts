import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef,useState } from 'react';
import { mealPlanKeys } from '../../../lib/queryKeys';
import {
  fetchMealPlannerState,
  approveMealPlan,
  toggleShoppingItem,
  resizeMealInPlanState,
} from '../../../lib/health/mealPlanApi';
import { invokeEdge } from '../../../lib/supabase';
import { notify } from '../../../lib/notify';
import {getTodayWarsaw} from '../../../lib/date';
import {useMealPreferences} from './useMealPreferences';
import {TIMEOUTS} from '../../../lib/constants';
import type {MealPlanState} from '@vanguard/domain';


export function useMealPlanner(userId:string,date:string) {
  const queryClient = useQueryClient();
  const today=getTodayWarsaw();
  const [startDate,setStartDate]=useState(()=>date<today?today:date),[days,setDays]=useState(7);
  const preferences=useMealPreferences(userId);
  const requestKey = useRef<{signature:string;key:string}|null>(null);

  const queryKey=mealPlanKeys.date(userId,startDate);
  const { data: saved, isLoading,error } = useQuery({
    queryKey,
    queryFn: () => fetchMealPlannerState(userId, startDate),
    enabled: Boolean(userId && date),
  });
  const state=saved?.state ?? null,storageDate=saved?.storageDate ?? startDate;
  const update=(state:MealPlanState|null)=>queryClient.setQueryData(queryKey,{storageDate,state,
    ...(!state?.active?.days.some(day=>day.date === startDate) && saved?.coveringActive?{coveringActive:saved.coveringActive}:{})});
  const activeSnapshot=saved?.coveringActive ?? (state?.active?{storageDate,state}:null);

  const generateMutation = useMutation({
    mutationFn: async () => {
      const signature=`${userId}:${startDate}:${days}:${preferences.preferences?.revision}`;
      if(requestKey.current?.signature !== signature) requestKey.current={signature,key:crypto.randomUUID()};
      const res = await invokeEdge<'vanguard-nutrition-coach'>(
        'vanguard-nutrition-coach',
        {
          body: {
            action: 'generate_meal_plan',
            date:startDate,startDate,days,
            requestKey:requestKey.current.key,
          },
          signal:AbortSignal.timeout(TIMEOUTS.llmHeavy),
        }
      );
      if (!res?.success) {
        throw new Error(res?.errors?.[0] || 'Nie udało się ułożyć jadłospisu.');
      }
      return res.state;
    },
    onSuccess: (newState) => {
      requestKey.current=null;
      queryClient.setQueryData(queryKey,{storageDate:startDate,state:newState ?? null,
        ...(activeSnapshot && activeSnapshot.storageDate !== startDate?{coveringActive:activeSnapshot}:{})});
      void queryClient.invalidateQueries({queryKey});
      notify('Ułożono propozycję jadłospisu dopasowaną do Twoich celów.', 'success');
    },
    onError: (err: Error) => {
      notify(err.message, 'error');
      void queryClient.invalidateQueries({queryKey});
    },
  });

  const approveMutation = useMutation({
    mutationFn: (reviewed?:boolean) => approveMealPlan(userId, storageDate,`approve:${storageDate}:${state?.revision}`,state?.revision,reviewed),
    onSuccess: (newState) => {
      update(newState);
      notify('Jadłospis został zatwierdzony.', 'success');
    },
    onError: (err: Error) => {
      notify(err.message, 'error');
      void queryClient.invalidateQueries({queryKey});
    },
  });

  const resizeMutation = useMutation({
    mutationFn: ({ mealKey, factor,mealDate }: { mealKey: string; factor: number;mealDate?:string }) =>
      resizeMealInPlanState(userId, storageDate, mealKey, factor,state?.revision,mealDate),
    onSuccess: (newState) => {
      update(newState);
    },
    onError: (err: Error) => {
      notify(err.message, 'error');
      void queryClient.invalidateQueries({queryKey});
    },
  });

  const toggleShoppingMutation = useMutation({
    mutationFn: (productId: string) => toggleShoppingItem(userId, activeSnapshot?.storageDate ?? storageDate, productId,activeSnapshot?.state.revision,!activeSnapshot?.state.checkedProducts?.includes(productId)),
    onSuccess: (newState) => {
      if(saved?.coveringActive) queryClient.setQueryData(queryKey,{...saved,coveringActive:{...saved.coveringActive,state:newState}});
      else update(newState);
    },
    onError: (err: Error) => {
      notify(err.message, 'error');
      void queryClient.invalidateQueries({queryKey});
    },
  });

  const displayState=state && saved?.coveringActive?{...state,active:saved.coveringActive.state.active,checkedProducts:saved.coveringActive.state.checkedProducts}:state;
  return {state:displayState,isLoading,error,date:startDate,days,onDays:setDays,onStartDate:(next:string)=>{if(/^\d{4}-\d{2}-\d{2}$/.test(next)) setStartDate(next);},reviewIdentity:`${userId}:${storageDate}`,
    preferences:preferences.preferences ?? null,canGenerate:preferences.preferences?.confirmed === true,
    isGenerating:generateMutation.isPending,isApproving:approveMutation.isPending,
    busy:generateMutation.isPending || approveMutation.isPending || resizeMutation.isPending || toggleShoppingMutation.isPending,
    onGenerate:()=>generateMutation.mutate(),onApprove:(reviewed?:boolean)=>approveMutation.mutate(reviewed),
    onResizeMeal:(mealKey:string,factor:number,mealDate?:string)=>resizeMutation.mutate({mealKey,factor,mealDate}),onToggleShoppingItem:(productId:string)=>toggleShoppingMutation.mutate(productId)};
}
