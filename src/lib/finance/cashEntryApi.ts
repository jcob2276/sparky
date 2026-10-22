import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { getTodayWarsaw } from '../date';
import { invalidateFinance } from './financeUpdateMutations';

export interface CashEntryInput {
  kind: 'expense' | 'income';
  amount: number;
  category: string;
  note?: string;
  accountId: string | null;
  date?: string;
}

/** Szybki wpis gotówkowy: transakcja i zmiana salda konta w jednej operacji (RPC). */
export function useCashEntryMutation(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CashEntryInput) => {
      if (!userId) throw new Error('Brak użytkownika');
      if (!(input.amount > 0)) throw new Error('Podaj kwotę większą od zera');
      const { error } = await supabase.rpc('add_finance_cash_entry', {
        p_kind: input.kind,
        p_amount: input.amount,
        p_category: input.category,
        p_note: input.note?.trim() ?? '',
        p_date: input.date ?? getTodayWarsaw(),
        p_account_id: input.accountId ?? undefined,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { if (userId) invalidateFinance(qc, userId); },
  });
}
