import { useQuery } from '@tanstack/react-query';
import { fetchNutritionDayContext } from '../../../lib/health/nutritionContext';
export function useFuelingContext(userId: string | undefined, date: string) {
  return useQuery({queryKey:['nutrition-day-context',userId,date],queryFn:()=>fetchNutritionDayContext(userId!,date),enabled:!!userId,staleTime:60000});
}
