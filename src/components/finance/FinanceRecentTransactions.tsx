import {
  ArrowDownLeft,
  Briefcase,
  Car,
  CircleDollarSign,
  Clapperboard,
  GraduationCap,
  Gift,
  HeartPulse,
  Home,
  Palette,
  Utensils,
  type LucideIcon,
} from 'lucide-react';
import { getTodayWarsaw, shiftDateStr } from '../../lib/date';
import type { FinanceTransaction } from '../../lib/financeApi';
import { formatPln } from '../../lib/finance/formatMoney';
import { Pressable } from '../ui/ControlPrimitives';

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Jedzenie: Utensils,
  Transport: Car,
  Zdrowie: HeartPulse,
  Hobby: Palette,
  Rozrywka: Clapperboard,
  Rozwój: GraduationCap,
  Dom: Home,
  Praca: Briefcase,
  Prezenty: Gift,
};

const MONTH_FORMAT = new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'short' });

function dayLabel(date: string, today: string): string {
  if (date === today) return 'dziś';
  if (date === shiftDateStr(today, -1)) return 'wczoraj';
  const [year, month, day] = date.split('-').map(Number);
  return MONTH_FORMAT.format(new Date(year, month - 1, day));
}

interface FinanceRecentTransactionsProps {
  transactions: FinanceTransaction[];
  onShowAll: () => void;
}

export function FinanceRecentTransactions({ transactions, onShowAll }: FinanceRecentTransactionsProps) {
  const today = getTodayWarsaw();
  const recent = transactions.slice(0, 6);

  return (
    <section className="rounded-2xl bg-surface-1 p-2" aria-label="Ostatnie transakcje">
      {recent.length === 0 ? (
        <p className="px-4 py-3 text-center text-sm text-text-muted">
          Brak wpisów. Użyj „Wydatek” albo „Wpływ”, a pojawią się tutaj.
        </p>
      ) : (
        <ul>
          {recent.map((item) => {
            const income = item.kind === 'income';
            const Icon = income ? ArrowDownLeft : CATEGORY_ICONS[item.category] ?? CircleDollarSign;
            return (
              <li key={item.id} className="flex items-center gap-3 rounded-2xl px-3 py-3">
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${income ? 'bg-success/20 text-success' : 'bg-surface-2 text-text-primary'}`}>
                  <Icon size={20} aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-medium">{item.note || item.category}</p>
                  <p className="text-sm text-text-muted">{dayLabel(item.transaction_date, today)}{item.note ? ` · ${item.category}` : ''}</p>
                </div>
                <p className={`shrink-0 text-base font-semibold tabular-nums ${income ? 'text-success' : 'text-text-primary'}`}>
                  {income ? '+' : '−'}{formatPln(Math.abs(item.amount), 2)}
                </p>
              </li>
            );
          })}
        </ul>
      )}
      {recent.length > 0 && (
        <Pressable type="button" onClick={onShowAll} className="w-full rounded-2xl py-3 text-sm font-semibold text-primary">
          Wyświetl wszystko
        </Pressable>
      )}
    </section>
  );
}
