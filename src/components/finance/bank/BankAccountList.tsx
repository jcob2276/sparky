import type { BankAccount } from '../../../lib/finance/bankApi';
import type { FinanceAccount } from '../../../lib/financeApi';
import { formatWarsawDate, warsawTimeOfDay } from '../../../lib/date';
import { formatCurrency } from '../../../lib/finance/formatMoney';
import { ControlSelect } from '../../ui/ControlPrimitives';
import Button from '../../ui/Button';
import { FinanceList, FinanceRow } from '../financeUi';

export interface BankLinkProps {
  financeAccounts?: FinanceAccount[];
  linking?: boolean;
  onLink?: (bank: BankAccount, financeAccountId?: string, unlink?: boolean) => void;
}
interface Props extends BankLinkProps { accounts: BankAccount[] }
const stamp = (iso: string | null | undefined) => iso ? `${formatWarsawDate(iso)} ${warsawTimeOfDay(iso)}` : 'jeszcze niepotwierdzona';

export function BankAccountList({ accounts, financeAccounts = [], linking, onLink }: Props) {
  return (
    <FinanceList>
      {accounts.map(a => {
        const linked = financeAccounts.find(f => f.bank_account_id === a.id);
        return (
          <FinanceRow key={a.id} primary={`Rachunek ${a.iban ? `…${a.iban.slice(-4)}` : a.name || ''}`}
            secondary={`Saldo ${a.balance_type === 'ITBD' || a.balance_type === 'CLBD' ? 'zaksięgowane' : `bankowe (${a.balance_type || 'typ niepodany'})`} · ${stamp(a.balance_synced_at)}`}
            trailing={a.balance == null ? '—' : formatCurrency(a.balance, a.currency || 'PLN')}>
            <p className="mt-1 text-xs text-text-muted">Aktualizacja transakcji: {stamp(a.transactions_synced_at)}. {a.history_complete ? 'Pobrano dostępną historię.' : 'Starsza historia jest niepełna.'}{a.transactions_from ? ` Zakres od ${formatWarsawDate(a.transactions_from)}.` : ''}</p>
            {onLink && (linked ? <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-text-secondary">
              <span>Podsumowanie Finansów: {linked.name}</span>
              <Button size="sm" variant="ghost" disabled={linking} onClick={() => onLink(a, linked.id, true)}>Odłącz aktualizację</Button>
            </div> : <div className="mt-3 space-y-2">
              <ControlSelect aria-label={`Uwzględnij rachunek ${a.iban?.slice(-4) ?? a.id}`} value="" disabled={linking || a.currency !== 'PLN' || a.balance == null}
                onChange={e => { if (e.target.value) onLink(a, e.target.value === 'new' ? undefined : e.target.value); }} className="min-h-11 w-full rounded-lg bg-surface-2 px-3 text-sm">
                <option value="">Uwzględnij w podsumowaniu Finansów…</option>
                <option value="new">Dodaj jako osobne konto</option>
                {financeAccounts.filter(f => f.account_type === 'bank' && !f.bank_account_id).map(f => <option key={f.id} value={f.id}>Powiąż z „{f.name}”</option>)}
              </ControlSelect>
              <p className="text-xs text-text-muted">Powiąż istniejące konto, jeśli to ten sam rachunek. Saldo będzie pochodzić z banku. Ręczne wpisy zachowamy i uzgodnimy z importem przed wspólnym podsumowaniem. {a.currency !== 'PLN' ? 'Rachunki walutowe pozostają w widoku bankowym.' : ''}</p>
            </div>)}
          </FinanceRow>
        );
      })}
    </FinanceList>
  );
}
