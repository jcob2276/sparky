import { useState } from 'react';
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

const MONTH_FORMAT = new Intl.DateTimeFormat('pl-PL', {
  day: 'numeric',
  month: 'short',
});

function dayLabel(date: string, today: string): string {
  if (date === today) return 'dziś';
  if (date === shiftDateStr(today, -1)) return 'wczoraj';
  const [year, month, day] = date.split('-').map(Number);
  return MONTH_FORMAT.format(new Date(year, month - 1, day));
}

interface FinanceManualHistoryProps {
  transactions: FinanceTransaction[];
}

export function FinanceManualHistory({ transactions }: FinanceManualHistoryProps) {
  const [limit, setLimit] = useState(10);
  const today = getTodayWarsaw();
  const recent = transactions.slice(0, limit);
  if (!transactions.length) return null;

  return (
    <section className="rounded-lg bg-surface-1 p-2" aria-label="Wpisy ręczne">
      <h2 className="px-3 py-3 text-base font-semibold">Wpisy ręczne</h2>
      <ul>
        {recent.map((item) => {
          const income = item.kind === 'income';
          const Icon = income ? ArrowDownLeft : (CATEGORY_ICONS[item.category] ?? CircleDollarSign);
          return (
            <li key={item.id} className="flex items-center gap-3 rounded-lg px-3 py-3">
              <span
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${income ? 'bg-success/20 text-success' : 'bg-surface-2 text-text-primary'}`}
              >
                <Icon size={20} aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-medium">{item.note || item.category}</p>
                <p className="text-sm text-text-muted">
                  {dayLabel(item.transaction_date, today)}
                  {item.note ? ` · ${item.category}` : ''}
                </p>
              </div>
              <p className={`shrink-0 text-base font-semibold tabular-nums ${income ? 'text-success' : 'text-text-primary'}`}>
                {income ? '+' : '−'}
                {formatPln(Math.abs(item.amount), 2)}
              </p>
            </li>
          );
        })}
      </ul>
      {transactions.length > limit && (
        <Pressable
          type="button"
          onClick={() => setLimit((current) => current + 20)}
          className="w-full rounded-lg py-3 text-sm font-semibold text-primary"
        >
          Pokaż kolejne wpisy
        </Pressable>
      )}
    </section>
  );
}
