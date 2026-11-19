import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import type { BankAccount } from '../../../lib/finance/bankApi';
import type { FinanceAccount } from '../../../lib/financeApi';
import { formatWarsawDate, warsawTimeOfDay } from '../../../lib/date';
import { formatCurrency } from '../../../lib/finance/formatMoney';
import { confirmDialog } from '../../../lib/notify';
import { ControlSelect, Pressable } from '../../ui/ControlPrimitives';
import Sheet from '../../ui/Sheet';
import Button from '../../ui/Button';
import { FinanceList, FinanceRow } from '../financeUi';

export interface BankLinkProps {
  financeAccounts?: FinanceAccount[];
  linking?: boolean;
  onLink?: (bank: BankAccount, financeAccountId?: string, unlink?: boolean) => void;
  hiddenAccounts?: BankAccount[];
  onToggleVisibility?: (account: BankAccount, hidden: boolean) => void;
  togglingVisibility?: boolean;
}
interface Props extends BankLinkProps { accounts: BankAccount[] }
const stamp = (iso: string | null | undefined) => iso ? `${formatWarsawDate(iso)} ${warsawTimeOfDay(iso)}` : 'jeszcze niepotwierdzona';

function last4(a: BankAccount) {
  return a.iban ? `…${a.iban.slice(-4)}` : a.name || '';
}

export function BankAccountList({
  accounts,
  financeAccounts = [],
  linking,
  onLink,
  hiddenAccounts = [],
  onToggleVisibility,
  togglingVisibility,
}: Props) {
  const [openId, setOpenId] = useState<string | null>(null);
  const open = accounts.find(a => a.id === openId) ?? null;
  const linkedTo = (a: BankAccount) => financeAccounts.find(f => f.bank_account_id === a.id);
  return (
    <div>
      <FinanceList>
        {accounts.map(a => (
          <Pressable key={a.id} type="button" onClick={() => setOpenId(a.id)} aria-label={`Rachunek ${last4(a)}: szczegóły`} className="block w-full text-left hover:bg-text-primary/[0.04]">
            <FinanceRow primary={`Rachunek ${last4(a)}`}
              secondary={`${linkedTo(a) ? 'W majątku · ' : ''}${a.balance_type === 'ITBD' || a.balance_type === 'CLBD' ? 'Zaksięgowane' : 'Saldo bankowe'} · ${stamp(a.balance_synced_at)}`}
              trailing={<span className="flex items-center gap-2">{a.balance == null ? '—' : formatCurrency(a.balance, a.currency || 'PLN')}<ChevronRight size={16} className="text-text-muted" aria-hidden="true" /></span>} />
          </Pressable>
        ))}
      </FinanceList>
      <Sheet open={open != null} onOpenChange={next => { if (!next) setOpenId(null); }} title={open ? `Rachunek ${last4(open)}` : 'Rachunek'} side="bottom" compact handleDragOnly>
        {open && (() => {
          const linked = linkedTo(open);
          return (
            <div className="space-y-4">
              <div className="rounded-2xl bg-surface-2/60 px-4 py-3 text-sm">
                <p className="text-text-muted">Saldo {open.balance_type === 'ITBD' || open.balance_type === 'CLBD' ? 'zaksięgowane' : `bankowe (${open.balance_type || 'typ niepodany'})`} · {stamp(open.balance_synced_at)}</p>
                <p className="mt-0.5 text-xl font-semibold tabular-nums text-text-primary">{open.balance == null ? '—' : formatCurrency(open.balance, open.currency || 'PLN')}</p>
              </div>
              <p className="text-xs text-text-muted">Aktualizacja transakcji: {stamp(open.transactions_synced_at)}. {open.history_complete ? 'Pobrano dostępną historię.' : 'Starsza historia jest niepełna.'}{open.transactions_from ? ` Zakres od ${formatWarsawDate(open.transactions_from)}.` : ''}</p>
              {onLink && (linked ? (
                <div className="flex items-center justify-between gap-2 rounded-2xl bg-surface-2/60 px-4 py-2 text-sm text-text-secondary">
                  <span>Uwzględniony w majątku</span>
                  <Button size="sm" variant="ghost" disabled={linking} onClick={() => onLink(open, linked.id, true)}>Odłącz aktualizację</Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <ControlSelect aria-label={`Uwzględnij rachunek ${open.iban?.slice(-4) ?? open.id}`} value="" disabled={linking || open.currency !== 'PLN' || open.balance == null}
                    onChange={e => { if (e.target.value) onLink(open, e.target.value === 'new' ? undefined : e.target.value); }} className="min-h-11 w-full rounded-xl bg-surface-2 px-3 text-sm">
                    <option value="">Uwzględnij w podsumowaniu Finansów…</option>
                    <option value="new">Dodaj jako osobne konto</option>
                    {financeAccounts.filter(f => ['bank', 'savings'].includes(f.account_type) && !f.bank_account_id).map(f => <option key={f.id} value={f.id}>Powiąż z „{f.name}”</option>)}
                  </ControlSelect>
                  <p className="text-xs text-text-muted">Powiąż istniejące konto, jeśli to ten sam rachunek. Saldo będzie pochodzić z banku. Ręczne wpisy zachowamy i uzgodnimy z importem przed wspólnym podsumowaniem. {open.currency !== 'PLN' ? 'Rachunki walutowe pozostają w widoku bankowym.' : ''}</p>
                </div>
              ))}
              {onToggleVisibility && (
                <Button size="sm" variant="ghost" disabled={linking || togglingVisibility} className="text-danger"
                  onClick={async () => {
                    if (await confirmDialog(`Ukryć rachunek ${last4(open)}? Zostanie wyłączony z synchronizacji i odłączony z Finansów.`)) {
                      setOpenId(null);
                      onToggleVisibility(open, true);
                    }
                  }}>
                  Ukryj rachunek
                </Button>
              )}
            </div>
          );
        })()}
      </Sheet>

      {hiddenAccounts.length > 0 && (
        <details className="border-t border-border-custom/20 px-4 py-2">
          <summary className="min-h-11 cursor-pointer py-1 text-sm font-medium text-text-muted hover:text-text-primary">
            Ukryte rachunki ({hiddenAccounts.length})
          </summary>
          <div className="mt-3 space-y-2">
            {hiddenAccounts.map(h => (
              <div key={h.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <div>
                  <p className="font-medium text-text-secondary">Rachunek {h.iban ? `…${h.iban.slice(-4)}` : h.name || ''}</p>
                  <p className="text-xs text-text-muted">Ukryty · Saldo: {h.balance == null ? '—' : formatCurrency(h.balance, h.currency || 'PLN')}</p>
                </div>
                {onToggleVisibility && (
                  <Button size="sm" variant="outline" disabled={togglingVisibility} onClick={() => onToggleVisibility(h, false)}>
                    Przywróć rachunek
                  </Button>
                )}
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
