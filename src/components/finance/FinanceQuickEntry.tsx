import { useEffect, useState } from 'react';
import {
  ArrowDownLeft, ArrowUpRight, Banknote, BriefcaseBusiness, Car, ChartNoAxesCombined,
  Gift, GraduationCap, HeartPulse, House, MoreHorizontal, NotebookPen, Popcorn,
  ShoppingBag, Sparkles, Utensils, type LucideIcon,
} from 'lucide-react';
import { FINANCE_EXPENSE_CATEGORIES, FINANCE_INCOME_LABELS } from '@vanguard/domain';
import type { FinanceAccount } from '../../lib/financeApi';
import type { CashEntryInput } from '../../lib/finance/cashEntryApi';
import { formatPln } from '../../lib/finance/formatMoney';
import { applyKeypadKey, keyFromKeyboard, parseKeypadAmount } from '../../lib/finance/keypadInput';
import { loadQuickEntryMemory, saveQuickEntryMemory } from '../../lib/finance/quickEntryMemory';
import Sheet from '../ui/Sheet';
import { ControlInput, ControlSelect, Pressable } from '../ui/ControlPrimitives';
import { FinanceKeypad } from './FinanceKeypad';

type Kind = 'expense' | 'income';

interface FinanceQuickEntryProps {
  accounts: FinanceAccount[];
  pending: boolean;
  open: boolean;
  initialKind: Kind;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: CashEntryInput) => Promise<boolean>;
}

const INCOME_CATEGORIES = Object.values(FINANCE_INCOME_LABELS);
const NO_ACCOUNT = '';
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Jedzenie: Utensils, Transport: Car, Zdrowie: HeartPulse, Hobby: Sparkles,
  Rozrywka: Popcorn, Rozwój: GraduationCap, Dom: House, Praca: BriefcaseBusiness,
  Prezenty: Gift, 'UoZ / etat': BriefcaseBusiness, 'Setter / sprzedaż': ShoppingBag,
  'Closer / prowizje': Banknote, Odsetki: ChartNoAxesCombined, Dywidendy: ChartNoAxesCombined,
  Zwroty: ArrowDownLeft,
};

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

function EntryForm({ accounts, pending, initialKind, onSubmit, onDone }: Pick<FinanceQuickEntryProps, 'accounts' | 'pending' | 'initialKind' | 'onSubmit'> & { onDone: () => void }) {
  const [kind, setKind] = useState<Kind>(initialKind);
  const [initial] = useState(() => pickInitial(initialKind, accounts));
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
      className="space-y-3 pb-1"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <div className="grid grid-cols-2 gap-1 rounded-2xl bg-surface-2 p-1" role="group" aria-label="Rodzaj wpisu">
        {(['expense', 'income'] as const).map(item => {
          const Icon = item === 'expense' ? ArrowUpRight : ArrowDownLeft;
          return <Pressable key={item} type="button" aria-pressed={kind === item} onClick={() => switchKind(item)}
            className={`flex min-h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold ${kind === item ? `bg-surface-1 ${item === 'expense' ? 'text-danger' : 'text-success'}` : 'text-text-secondary'}`}>
            <Icon size={17} aria-hidden="true" />{item === 'expense' ? 'Wydatek' : 'Wpływ'}
          </Pressable>;
        })}
      </div>

      <div className="text-center" aria-live="polite">
        <p className={`break-all text-5xl font-semibold tabular-nums tracking-[var(--tracking-display)] ${amount ? 'text-text-primary' : 'text-text-muted'}`}>
          {kind === 'expense' && value > 0 ? '−' : ''}{amount || '0'}<span className="ml-2 text-2xl font-medium text-text-muted">zł</span>
        </p>
        <p className="mt-1 text-sm text-text-secondary">{value > 0 ? category : 'Wpisz kwotę na klawiaturze'}</p>
      </div>

      <div>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2" role="group" aria-label="Kategoria">
          {categoriesFor(kind).map(item => {
            const Icon = CATEGORY_ICONS[item] ?? MoreHorizontal;
            return <Pressable key={item} type="button" aria-pressed={category === item} onClick={() => setCategory(item)}
              className={`flex min-h-16 shrink-0 flex-col items-center justify-center gap-1 rounded-2xl px-4 py-2 text-xs font-medium ${category === item ? 'bg-text-primary text-background' : 'bg-surface-2/60 text-text-secondary hover:bg-surface-2'}`}>
              <Icon size={20} aria-hidden="true" />{item}
            </Pressable>;
          })}
        </div>
      </div>

      <div className="space-y-1">
        <p className="text-sm font-medium text-text-secondary">{kind === 'expense' ? 'Płatność z' : 'Wpływ na'}</p>
        <div className="flex items-center gap-2">
        <ControlSelect
          aria-label="Konto"
          value={accountId}
          onChange={(event) => setAccountId(event.target.value)}
          className="min-h-12 min-w-0 flex-1 rounded-2xl bg-surface-2/60 px-4 text-sm"
        >
          <option value={NO_ACCOUNT}>Bez konta (tylko wpis)</option>
          {liquid.map((account) => (
            <option key={account.id} value={account.id}>{account.name} · {formatPln(account.balance)}</option>
          ))}
        </ControlSelect>
        {!noteOpen && (
          <Pressable type="button" onClick={() => setNoteOpen(true)} aria-label="Dodaj notatkę" className="flex min-h-12 shrink-0 items-center gap-2 rounded-2xl bg-surface-2/60 px-3 text-sm text-text-secondary">
            <NotebookPen size={18} aria-hidden="true" /><span className="sr-only sm:not-sr-only">Notatka</span>
          </Pressable>
        )}
        </div>
      </div>
      {noteOpen && (
        <ControlInput
          autoFocus
          aria-label="Notatka"
          placeholder="Notatka (opcjonalnie)"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          className="min-h-12 w-full rounded-2xl border-0 bg-surface-2/60 px-4 text-sm"
        />
      )}

      <FinanceKeypad onKey={(key) => setAmount((current) => applyKeypadKey(current, key))} />

      <Pressable
        type="submit"
        disabled={!(value > 0) || pending}
        aria-busy={pending || undefined}
        className="flex min-h-14 w-full items-center justify-center rounded-2xl bg-text-primary text-base font-semibold text-background transition-[transform,opacity] duration-[var(--motion-instant)] active:scale-[var(--scale-pressed)] disabled:opacity-[var(--opacity-disabled)]"
      >
        {pending ? 'Zapisuję…' : `${kind === 'expense' ? 'Dodaj wydatek' : 'Dodaj wpływ'}${value > 0 ? ` · ${formatPln(value, 2)}` : ''}`}
      </Pressable>
    </form>
  );
}

export function FinanceQuickEntry({ accounts, pending, open, initialKind, onOpenChange, onSubmit }: FinanceQuickEntryProps) {
  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange} title="Szybki wpis" side="bottom" compact>
        {open && <EntryForm accounts={accounts} pending={pending} initialKind={initialKind} onSubmit={onSubmit} onDone={() => onOpenChange(false)} />}
      </Sheet>
    </>
  );
}
