import { useState } from 'react';
import { FINANCE_ACCOUNT_LABELS, type FinanceAccountType } from '@vanguard/domain';
import type { FinanceAccount } from '../../lib/financeApi';
import type { FinanceMutations } from '../../lib/financeMutations';
import { formatPln } from '../../lib/finance/formatMoney';
import { confirmDialog } from '../../lib/notify';
import Button from '../ui/Button';
import { ControlInput, ControlSelect } from '../ui/ControlPrimitives';
import { FinanceEmpty, FinanceList, FinanceRow, FinanceSection } from './financeUi';

interface FinanceAccountsTabProps {
  accounts: FinanceAccount[];
  mutations: FinanceMutations;
  run: (fn: () => Promise<void>) => Promise<void>;
}

type NewKind = 'cash' | 'bank' | 'bonds' | 'other' | 'debt';

const KIND_LABELS: Record<NewKind, string> = {
  cash: 'Gotówka',
  bank: 'Konto bankowe',
  bonds: 'Obligacje',
  other: 'Inne aktywo',
  debt: 'Dług (kredyt, rata)',
};

const fieldClass = 'min-h-11 rounded-xl border-0 bg-surface-2/70 px-3 text-sm ring-1 ring-border-custom/25 focus:ring-2 focus:ring-primary/35';

function AccountForm({ onAdd }: { onAdd: (input: { name: string; balance: number; type: FinanceAccountType; liquid: boolean }) => void }) {
  const [name, setName] = useState('');
  const [kind, setKind] = useState<NewKind>('bank');
  const [balance, setBalance] = useState('');
  const value = Number(balance.replace(',', '.'));
  const valid = name.trim().length > 0 && balance !== '' && Number.isFinite(value);

  return (
    <form
      className="flex flex-wrap items-end gap-2 px-4 pb-4 pt-1"
      onSubmit={(event) => {
        event.preventDefault();
        if (!valid) return;
        const isDebt = kind === 'debt';
        onAdd({
          name,
          balance: isDebt ? -Math.abs(value) : value,
          type: isDebt ? 'other' : kind,
          liquid: kind === 'cash' || kind === 'bank',
        });
        setName('');
        setBalance('');
      }}
    >
      <ControlInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Nazwa (np. mBank, portfel)" aria-label="Nazwa konta" className={`${fieldClass} min-w-40 flex-1`} />
      <ControlSelect value={kind} onChange={(e) => setKind(e.target.value as NewKind)} aria-label="Rodzaj" className={fieldClass}>
        {Object.entries(KIND_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
      </ControlSelect>
      <ControlInput type="number" inputMode="decimal" step="0.01" value={balance} onChange={(e) => setBalance(e.target.value)} placeholder="Saldo" aria-label="Saldo" className={`${fieldClass} w-32`} />
      <Button type="submit" size="sm" disabled={!valid} className="rounded-xl">Dodaj</Button>
    </form>
  );
}

function BalanceInput({ account, onSave }: { account: FinanceAccount; onSave: (balance: number) => void }) {
  const [value, setValue] = useState(String(account.balance));
  const commit = () => {
    const parsed = Number(value.replace(',', '.'));
    if (Number.isFinite(parsed) && parsed !== account.balance) onSave(parsed);
    else setValue(String(account.balance));
  };
  return (
    <ControlInput
      type="number"
      inputMode="decimal"
      step="0.01"
      aria-label={`Saldo ${account.name}`}
      value={value}
      onChange={(event) => setValue(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }}
      className="min-h-10 w-32 rounded-xl border-0 bg-surface-2/70 px-3 text-right text-sm tabular-nums ring-1 ring-border-custom/25 focus:ring-2 focus:ring-primary/35"
    />
  );
}

export function FinanceAccountsTab({ accounts, mutations, run }: FinanceAccountsTabProps) {
  const assets = accounts.filter((account) => account.balance >= 0);
  const debts = accounts.filter((account) => account.balance < 0);
  const manual = accounts.filter((account) => !account.coingecko_id);

  const remove = async (account: FinanceAccount) => {
    if (!(await confirmDialog(`Usunąć konto „${account.name}"?`))) return;
    await run(async () => { await mutations.removeAccount.mutateAsync(account.id); });
  };

  return (
    <div className="space-y-8">
      <FinanceSection
        title="Konta i gotówka"
        subtitle={`Aktywa ${formatPln(assets.reduce((n, a) => n + a.balance, 0))}${debts.length ? ` · długi ${formatPln(debts.reduce((n, a) => n + a.balance, 0))}` : ''}. Inwestycje dodajesz w Portfelu.`}
      >
        <AccountForm
          onAdd={(input) => void run(async () => {
            await mutations.addAccount.mutateAsync({
              name: input.name,
              balance: input.balance,
              account_type: input.type,
              is_liquid: input.liquid,
            });
          })}
        />
        {manual.length === 0 ? (
          <FinanceEmpty>Dodaj konto bankowe i gotówkę, żeby majątek netto i poduszka miały podstawę.</FinanceEmpty>
        ) : (
          <FinanceList>
            {manual.map((account) => (
              <FinanceRow
                key={account.id}
                primary={account.name}
                secondary={account.balance < 0 ? 'Dług' : FINANCE_ACCOUNT_LABELS[account.account_type as FinanceAccountType] ?? account.account_type}
                trailing={(
                  <BalanceInput
                    key={account.balance}
                    account={account}
                    onSave={(balance) => void run(async () => { await mutations.updateAccount.mutateAsync({ id: account.id, balance }); })}
                  />
                )}
              >
                <div className="mt-1">
                  <Button variant="ghost" size="sm" onClick={() => void remove(account)} className="text-danger">Usuń</Button>
                </div>
              </FinanceRow>
            ))}
          </FinanceList>
        )}
      </FinanceSection>
    </div>
  );
}
