import { useState } from 'react';
import type { FinanceAccount, FinanceTransaction } from '../../../lib/financeApi';
import type { BankTransaction } from '../../../lib/finance/bankApi';
import { shiftDateStr } from '../../../lib/date';
import { formatPln } from '../../../lib/finance/formatMoney';
import { ControlSelect } from '../../ui/ControlPrimitives';
import Button from '../../ui/Button';
import { FinanceList, FinanceRow, FinanceSection } from '../financeUi';
import { isBankBooked } from '../../../lib/finance/bankAnalytics';

interface Props {
  accounts: FinanceAccount[]; manual: FinanceTransaction[]; bank: BankTransaction[]; pending: boolean;
  onResolve: (id: string, bankTransactionId: string | null) => void;
}

function Entry({ entry, candidates, pending, onResolve }: { entry: FinanceTransaction; candidates: BankTransaction[] } & Pick<Props, 'pending' | 'onResolve'>) {
  const [choice, setChoice] = useState('');
  return <FinanceRow primary={entry.note || entry.category} secondary={`${entry.transaction_date} · wpis ręczny`} trailing={formatPln(entry.amount, 2)}>
    <div className="mt-3 space-y-2">
      <ControlSelect aria-label={`Uzgodnij wpis ${entry.id}`} value={choice} disabled={pending} onChange={e => setChoice(e.target.value)} className="min-h-11 w-full rounded-lg bg-surface-2 px-3 text-sm">
        <option value="">Wybierz sposób rozliczenia…</option><option value="independent">Osobny wpis — uwzględnij dodatkowo</option>
        {candidates.map(tx => <option key={tx.id} value={tx.id}>To ta sama transakcja: {tx.booking_date} · {tx.counterparty_name} · {formatPln(tx.amount, 2)}</option>)}
      </ControlSelect>
      <Button size="sm" disabled={!choice || pending} onClick={() => onResolve(entry.id, choice === 'independent' ? null : choice)}>Zatwierdź uzgodnienie</Button>
    </div>
  </FinanceRow>;
}

export function BankManualReconciliation({ accounts, manual, bank, pending, onResolve }: Props) {
  const byFinance = new Map(accounts.flatMap(a => a.bank_account_id ? [[a.id, a.bank_account_id] as const] : []));
  const waiting = manual.filter(tx => tx.account_id && byFinance.has(tx.account_id) && !tx.bank_reconciled && !tx.bank_transaction_id);
  if (!waiting.length) return null;
  return <FinanceSection title="Uzgodnij ręczne wpisy" footer="Wybierz, które pozycje są już w imporcie, a które są dodatkowe. Do tego czasu wspólne sumy Finansów czekają na uzgodnienie.">
    <FinanceList>{waiting.map(entry => <Entry key={entry.id} entry={entry} pending={pending} onResolve={onResolve}
      candidates={bank.filter(tx => tx.account_id === byFinance.get(entry.account_id!) && tx.currency === 'PLN' && isBankBooked(tx)
        && Math.round(tx.amount * 100) === Math.round(entry.amount * 100) && tx.booking_date
        && tx.booking_date >= shiftDateStr(entry.transaction_date, -3) && tx.booking_date <= shiftDateStr(entry.transaction_date, 3)
        && !manual.some(m => m.bank_transaction_id === tx.id))} />)}</FinanceList>
  </FinanceSection>;
}
