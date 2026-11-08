import { useState } from 'react';
import { FINANCE_ACCOUNT_LABELS, type FinanceAccountType } from '@vanguard/domain';
import type { FinanceAccount } from '../../lib/financeApi';
import type { FinanceMutations } from '../../lib/financeMutations';
import { formatPln } from '../../lib/finance/formatMoney';
import { confirmDialog } from '../../lib/notify';
import Button from '../ui/Button';
import Sheet from '../ui/Sheet';
import { ControlInput, Pressable } from '../ui/ControlPrimitives';
import { ChevronRight, Plus } from 'lucide-react';
import { FinanceBankCard } from './FinanceBankCard';
import { FinanceEmpty, FinanceList, FinanceRow, FinanceSection } from './financeUi';

interface FinanceAccountsTabProps {
  accounts: FinanceAccount[];
  mutations: FinanceMutations;
  run: (fn: () => Promise<void>) => Promise<void>;
}

type NewKind = 'cash' | 'bank' | 'broker_cash' | 'bonds' | 'other' | 'debt';

const KIND_LABELS: Record<NewKind, string> = {
  cash: 'Gotówka',
  bank: 'Konto bankowe',
  broker_cash: 'Wolne środki u brokera',
  bonds: 'Obligacje',
  other: 'Inne aktywo',
  debt: 'Dług (kredyt, rata)',
};

const fieldClass = 'min-h-11 rounded-lg border-0 bg-surface-2/70 px-3 text-sm ring-1 ring-border-custom/25 focus:ring-2 focus:ring-primary/35';

function AccountForm({ onAdd, pending }: { onAdd: (input: { name: string; balance: number; type: FinanceAccountType; liquid: boolean }) => void; pending: boolean }) {
  const [name, setName] = useState('');
  const [kind, setKind] = useState<NewKind>('bank');
  const [balance, setBalance] = useState('');
  const value = Number(balance.replace(',', '.'));
  const valid = name.trim().length > 0 && balance !== '' && Number.isFinite(value);

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!valid || pending) return;
        const isDebt = kind === 'debt';
        onAdd({
          name,
          balance: isDebt ? -Math.abs(value) : value,
          type: isDebt ? 'other' : kind,
          liquid: kind === 'cash' || kind === 'bank',
        });
      }}
    >
      <label className="block space-y-1 text-sm text-text-secondary">
        Nazwa konta
        <ControlInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Np. oszczędności" aria-label="Nazwa konta" className={`${fieldClass} w-full`} />
      </label>
      <fieldset className="space-y-2">
        <legend className="text-sm text-text-secondary">Rodzaj konta</legend>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(KIND_LABELS) as NewKind[]).map((key) => (
            <Pressable
              key={key}
              type="button"
              aria-pressed={kind === key}
              onClick={() => setKind(key)}
              className={`min-h-11 rounded-lg px-3 text-sm ${kind === key ? 'bg-text-primary text-background' : 'bg-surface-2 text-text-secondary'}`}
            >
              {KIND_LABELS[key]}
            </Pressable>
          ))}
        </div>
      </fieldset>
      <label className="block space-y-1 text-sm text-text-secondary">
        Saldo początkowe
        <ControlInput
          type="number"
          inputMode="decimal"
          step="0.01"
          value={balance}
          onChange={(e) => setBalance(e.target.value)}
          aria-label="Saldo początkowe"
          className={`${fieldClass} w-full`}
        />
      </label>
      <Button type="submit" loading={pending} disabled={!valid} className="w-full">
        Dodaj konto
      </Button>
    </form>
  );
}

function BalanceForm({ account, onSave, pending }: { account: FinanceAccount; onSave: (balance: number) => void; pending: boolean }) {
  const [value, setValue] = useState(String(account.balance));
  const parsed = Number(value.replace(',', '.'));
  const valid = value.trim() !== '' && Number.isFinite(parsed);
  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (valid && !pending) onSave(parsed);
      }}
    >
      <label className="block space-y-1 text-sm text-text-secondary">
        Saldo
        <ControlInput
          type="number"
          inputMode="decimal"
          step="0.01"
          aria-label={`Saldo ${account.name}`}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className={`${fieldClass} w-full tabular-nums`}
        />
      </label>
      <Button type="submit" loading={pending} disabled={!valid} className="w-full">
        Zapisz saldo
      </Button>
    </form>
  );
}

export function FinanceAccountsTab({ accounts, mutations, run }: FinanceAccountsTabProps) {
  const [editing, setEditing] = useState<string | null>(null);
  const debts = accounts.filter((account) => account.balance < 0);
  const manual = accounts.filter((account) => !account.coingecko_id && !account.bank_account_id);
  const selected = manual.find((account) => account.id === editing);

  const remove = async (account: FinanceAccount) => {
    if (!(await confirmDialog(`Usunąć konto „${account.name}"?`))) return;
    await run(async () => {
      await mutations.removeAccount.mutateAsync(account.id);
      setEditing(null);
    });
  };

  return (
    <div className="space-y-8">
      <FinanceBankCard mode="accounts" financeAccounts={accounts} onRemoveMissingAccount={(account) => void remove(account)} />
      <FinanceSection
        title="Gotówka i pozostałe środki"
        subtitle={`${debts.length ? `Długi ${formatPln(debts.reduce((n, a) => n + a.balance, 0))}. ` : ''}Gotówka, środki u brokera i konta bez synchronizacji.`}
      >
        {manual.length === 0 ? (
          <FinanceEmpty>Tu dodasz gotówkę, dodatkowe środki lub zobowiązanie.</FinanceEmpty>
        ) : (
          <FinanceList>
            {manual.map((account) => (
              <Pressable
                key={account.id}
                type="button"
                onClick={() => setEditing(account.id)}
                className="block w-full text-left hover:bg-surface-2/50"
                aria-label={`Edytuj ${account.name}`}
              >
                <FinanceRow
                  primary={account.name}
                  secondary={account.balance < 0 ? 'Dług' : (FINANCE_ACCOUNT_LABELS[account.account_type as FinanceAccountType] ?? account.account_type)}
                  trailing={
                    <span className="flex items-center gap-2">
                      {formatPln(account.balance, 2)}
                      <ChevronRight size={16} className="text-text-muted" aria-hidden="true" />
                    </span>
                  }
                />
              </Pressable>
            ))}
          </FinanceList>
        )}
        <div className="border-t border-border-custom/20 p-3">
          <Button variant="ghost" size="sm" icon={<Plus size={16} />} onClick={() => setEditing('new')}>
            Dodaj konto lub środki
          </Button>
        </div>
      </FinanceSection>
      <Sheet
        open={editing != null}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        title={editing === 'new' ? 'Nowe konto lub środki' : selected?.name || 'Konto'}
        side="bottom"
        compact
      >
        {editing === 'new' && (
          <AccountForm
            pending={mutations.addAccount.isPending}
            onAdd={(input) =>
              void run(async () => {
                await mutations.addAccount.mutateAsync({ name: input.name, balance: input.balance, account_type: input.type, is_liquid: input.liquid });
                setEditing(null);
              })
            }
          />
        )}
        {selected && (
          <div className="space-y-6">
            <BalanceForm
              key={selected.id}
              account={selected}
              pending={mutations.updateAccount.isPending}
              onSave={(balance) =>
                void run(async () => {
                  await mutations.updateAccount.mutateAsync({ id: selected.id, balance });
                  setEditing(null);
                })
              }
            />
            <Button
              variant="ghost"
              size="sm"
              disabled={mutations.updateAccount.isPending || mutations.removeAccount.isPending}
              className="text-danger"
              onClick={() => void remove(selected)}
            >
              Usuń konto z Finansów
            </Button>
          </div>
        )}
      </Sheet>
    </div>
  );
}
