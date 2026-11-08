import type { FinanceBundle, FinanceTransaction } from '../financeApi';
import type { BankData } from './bankApi';
import { bankMovement, isBankBooked } from './bankAnalytics';
import { bankCategoryLabel } from './bankSpending';

/** Projekcja do wspólnego widoku. Źródłowe rekordy i ręczna historia nie są kopiowane ani usuwane. */
export function mergeBankFinance(bundle: FinanceBundle, bank: BankData, today: string): FinanceBundle {
  const linked = new Map(bundle.accounts.flatMap(a => a.bank_account_id ? [[a.bank_account_id, a.id] as const] : []));
  const accounts = bundle.accounts.map(account => {
    if (!account.bank_account_id) return account;
    const source = bank.accounts.find(a => a.id === account.bank_account_id);
    if (!source || source.currency !== 'PLN' || source.balance == null) throw new Error(`Brak aktualnego salda bankowego: ${account.name}. Sprawdź ustawienia finansów.`);
    return { ...account, balance: source.balance };
  });
  const linkedIds = new Set(linked.values());
  const imported = new Set(bank.transactions.filter(tx => linked.has(tx.account_id) && tx.currency === 'PLN'
    && tx.booking_date && tx.booking_date <= today && isBankBooked(tx)).map(tx => tx.id));
  const transactions = bundle.transactions.filter(t => !t.bank_transaction_id || !imported.has(t.bank_transaction_id));
  const pending = transactions.filter(t => t.account_id && linkedIds.has(t.account_id) && !t.bank_reconciled).length;
  for (const tx of bank.transactions) {
    const accountId = linked.get(tx.account_id);
    const flow = bankMovement(tx);
    if (!accountId || tx.currency !== 'PLN' || !tx.booking_date || tx.booking_date > today || !isBankBooked(tx)
      || !['income', 'expense', 'refund'].includes(flow)) continue;
    const item: FinanceTransaction = { id: `bank:${tx.id}`, user_id: bundle.profile.user_id, account_id: accountId,
      amount: tx.amount, category: bankCategoryLabel(tx.category), note: tx.counterparty_name || tx.remittance,
      transaction_date: tx.booking_date, created_at: '', kind: flow === 'expense' ? 'expense' : 'income',
      source: 'bank', flow_kind: flow as 'income' | 'expense' | 'refund' };
    transactions.push(item);
  }
  transactions.sort((a, b) => b.transaction_date.localeCompare(a.transaction_date) || b.id.localeCompare(a.id));
  return { ...bundle, accounts, transactions, bankReconciliationPending: pending };
}
