import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { financeKeys } from '../queryKeys';
import type { BankAccount } from './bankApi';

export function useFinanceBankLink(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ bank, financeAccountId, unlink }: { bank: BankAccount; financeAccountId?: string; unlink?: boolean }) => {
      if (!userId) throw new Error('Brak użytkownika');
      if (bank.currency !== 'PLN' || bank.balance == null) throw new Error('Podsumowanie Finansów obsługuje rachunki PLN ze znanym saldem');
      let accountType: 'bank' | 'savings' = 'bank';
      if (financeAccountId) {
        const current = await supabase.from('finance_accounts').select('account_type').eq('user_id', userId).eq('id', financeAccountId).single();
        if (current.error) throw new Error(current.error.message);
        if (!['bank', 'savings'].includes(current.data.account_type)) throw new Error('Wybierz konto bankowe lub oszczędnościowe');
        accountType = current.data.account_type === 'savings' ? 'savings' : 'bank';
      }
      const patch = { bank_account_id: unlink ? null : bank.id, balance: bank.balance, account_type: accountType, is_liquid: true };
      const res = financeAccountId
        ? await supabase.from('finance_accounts').update(patch).eq('user_id', userId).eq('id', financeAccountId).select('id').single()
        : await supabase.from('finance_accounts').insert({ ...patch, user_id: userId, name: `Bank · …${bank.iban?.slice(-4) ?? ''}` }).select('id').single();
      if (res.error) throw new Error(res.error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: financeKeys.bundle(userId ?? '') }),
  });
}

export function useResolveBankEntry(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, bankTransactionId }: { id: string; bankTransactionId: string | null }) => {
      if (!userId) throw new Error('Brak użytkownika');
      const { error } = await supabase.from('finance_transactions')
        .update({ bank_transaction_id: bankTransactionId, bank_reconciled: true }).eq('id', id).eq('user_id', userId).select('id').single();
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: financeKeys.bundle(userId ?? '') }),
  });
}
