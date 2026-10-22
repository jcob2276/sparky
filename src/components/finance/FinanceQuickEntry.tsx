import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { FINANCE_EXPENSE_CATEGORIES, FINANCE_INCOME_LABELS } from '@vanguard/domain';
import type { FinanceAccount } from '../../lib/financeApi';
import type { CashEntryInput } from '../../lib/finance/cashEntryApi';
import { formatPln } from '../../lib/finance/formatMoney';
import { applyKeypadKey, keyFromKeyboard, parseKeypadAmount } from '../../lib/finance/keypadInput';
import { loadQuickEntryMemory, saveQuickEntryMemory } from '../../lib/finance/quickEntryMemory';
import Fab from '../ui/Fab';
import Sheet from '../ui/Sheet';
import { ToggleChip } from '../ui/ToggleChip';
import { ControlInput, ControlSelect, Pressable } from '../ui/ControlPrimitives';
import { FinanceKeypad } from './FinanceKeypad';

interface FinanceQuickEntryProps {
  accounts: FinanceAccount[];
  pending: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  showFab: boolean;
  onSubmit: (input: CashEntryInput) => Promise<boolean>;
}

type Kind = 'expense' | 'income';

const INCOME_CATEGORIES = Object.values(FINANCE_INCOME_LABELS);
const NO_ACCOUNT = '';

function categoriesFor(kind: Kind): readonly string[] {
  return kind === 'expense' ? FINANCE_EXPENSE_CATEGORIES : INCOME_CATEGORIES;
}

function pickInitial(kind: Kind, accounts: FinanceAccount[]) {
  const liquid = accounts.filter((account) => account.is_liquid);
  const fallbackAccount = (liquid.find((account) => account.account_type === 'cash') ?? liquid[0])?.id ?? NO_ACCOUNT;
  const memory = loadQuickEntryMemory(kind);
  const category = memory && categoriesFor(kind).includes(memory.category) ? memory.category : categoriesFor(kind)[0];
  const accountId = memory && (memory.accountId === NO_ACCOUNT || liquid.some((account) => account.id === memory.accountId))
    ? memory.accountId
    : fallbackAccount;
  return { category, accountId };
}

function EntryForm({ accounts, pending, onSubmit, onDone }: Pick<FinanceQuickEntryProps, 'accounts' | 'pending' | 'onSubmit'> & { onDone: () => void }) {
  const [kind, setKind] = useState<Kind>('expense');
  const [initial] = useState(() => pickInitial('expense', accounts));
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(initial.category);
  const [accountId, setAccountId] = useState(initial.accountId);
  const [note, setNote] = useState('');
  const [noteOpen, setNoteOpen] = useState(false);
  const value = parseKeypadAmount(amount);
  const liquid = accounts.filter((account) => account.is_liquid);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)) return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const key = keyFromKeyboard(event);
      if (key) {
        event.preventDefault();
        setAmount((current) => applyKeypadKey(current, key));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const switchKind = (next: Kind) => {
    setKind(next);
    const memory = pickInitial(next, accounts);
    setCategory(memory.category);
    setAccountId(memory.accountId);
  };

  const submit = async () => {
    if (!(value > 0) || pending) return;
    const saved = await onSubmit({ kind, amount: value, category, note, accountId: accountId || null });
    if (saved) {
      saveQuickEntryMemory(kind, { category, accountId });
      onDone();
    }
  };

  return (
    <form
      className="space-y-4 px-1 pb-2"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <div className="flex justify-center gap-2">
        <ToggleChip active={kind === 'expense'} onClick={() => switchKind('expense')} variant="danger">Wydatek</ToggleChip>
        <ToggleChip active={kind === 'income'} onClick={() => switchKind('income')} variant="success">Wpływ</ToggleChip>
      </div>

      <div className="text-center" aria-live="polite">
        <p className={`text-5xl font-semibold tabular-nums tracking-[var(--tracking-display)] ${amount ? 'text-text-primary' : 'text-text-muted'}`}>
          {kind === 'expense' && value > 0 ? '−' : ''}{amount || '0'}<span className="ml-1.5 text-2xl text-text-muted">zł</span>
        </p>
        <p className="mt-1 min-h-5 text-sm text-text-muted">{value > 0 ? `${formatPln(value, 2)} · ${category}` : 'Wpisz kwotę'}</p>
      </div>

      <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label="Kategoria">
        {categoriesFor(kind).map((item) => (
          <ToggleChip key={item} active={category === item} onClick={() => setCategory(item)} className="shrink-0">{item}</ToggleChip>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <ControlSelect
          aria-label="Konto"
          value={accountId}
          onChange={(event) => setAccountId(event.target.value)}
          className="min-h-11 min-w-0 flex-1 rounded-full bg-surface-2/70 px-4 text-sm ring-1 ring-border-custom/25"
        >
          <option value={NO_ACCOUNT}>Bez konta (tylko wpis)</option>
          {liquid.map((account) => (
            <option key={account.id} value={account.id}>{account.name} · {formatPln(account.balance)}</option>
          ))}
        </ControlSelect>
        {!noteOpen && (
          <Pressable type="button" onClick={() => setNoteOpen(true)} className="min-h-11 shrink-0 rounded-full px-4 text-sm font-medium text-primary">
            Notatka
          </Pressable>
        )}
      </div>
      {noteOpen && (
        <ControlInput
          autoFocus
          aria-label="Notatka"
          placeholder="Notatka (opcjonalnie)"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          className="min-h-11 w-full rounded-full border-0 bg-surface-2/70 px-4 text-sm ring-1 ring-border-custom/25"
        />
      )}

      <FinanceKeypad onKey={(key) => setAmount((current) => applyKeypadKey(current, key))} />

      <Pressable
        type="submit"
        disabled={!(value > 0) || pending}
        aria-busy={pending || undefined}
        className="flex min-h-14 w-full items-center justify-center rounded-full bg-text-primary text-base font-semibold text-background transition-[transform,opacity] duration-[var(--motion-instant)] active:scale-[var(--scale-pressed)] disabled:opacity-[var(--opacity-disabled)]"
      >
        {pending ? 'Zapisuję…' : value > 0 ? `Zapisz ${formatPln(value, 2)}` : 'Zapisz'}
      </Pressable>
    </form>
  );
}

export function FinanceQuickEntry({ accounts, pending, open, onOpenChange, showFab, onSubmit }: FinanceQuickEntryProps) {
  return (
    <>
      {showFab && !open && (
        <Fab onClick={() => onOpenChange(true)} title="Szybki wpis" size="lg">
          <Plus size={24} aria-hidden="true" />
        </Fab>
      )}
      <Sheet open={open} onOpenChange={onOpenChange} title="Szybki wpis" side="bottom" compact>
        {open && <EntryForm accounts={accounts} pending={pending} onSubmit={onSubmit} onDone={() => onOpenChange(false)} />}
      </Sheet>
    </>
  );
}
