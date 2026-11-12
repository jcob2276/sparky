import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { financeKeys } from '../queryKeys';
import { unwrapList } from '../supabaseUtils';

export type CategoryBudgets = Record<string, number>;

async function fetchBudgets(userId: string): Promise<CategoryBudgets> {
  const rows = unwrapList(await supabase.from('finance_category_budgets').select('category, monthly_limit').eq('user_id', userId));
  return Object.fromEntries(rows.map(row => [row.category, Number(row.monthly_limit)]));
}

export function useCategoryBudgets(userId: string | undefined) {
  return useQuery({ queryKey: financeKeys.categoryBudgets(userId ?? ''), queryFn: () => fetchBudgets(userId!), enabled: !!userId, staleTime: 60_000 });
}

/** Ustawia limit miesięczny kategorii; `null` usuwa kopertę. */
export function useSetCategoryBudget(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ category, limit }: { category: string; limit: number | null }) => {
      if (!userId) throw new Error('Brak sesji');
      const res = limit == null
        ? await supabase.from('finance_category_budgets').delete().eq('user_id', userId).eq('category', category)
        : await supabase.from('finance_category_budgets').upsert({ user_id: userId, category, monthly_limit: limit, updated_at: new Date().toISOString() });
      if (res.error) throw res.error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: financeKeys.categoryBudgets(userId ?? '') }),
  });
}
