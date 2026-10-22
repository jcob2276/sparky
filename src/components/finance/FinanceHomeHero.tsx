import { ArrowDownLeft, ArrowUpRight, MoreHorizontal, Target, type LucideIcon } from 'lucide-react';
import { formatPln } from '../../lib/finance/formatMoney';
import { Pressable } from '../ui/ControlPrimitives';
import type { FinanceMetrics } from './useFinanceMetrics';

interface FinanceHomeHeroProps {
  metrics: FinanceMetrics;
  onQuickEntry: (kind: 'expense' | 'income') => void;
  onGoal: () => void;
  onMore: () => void;
  onAccounts: () => void;
}

function ActionButton({ icon: Icon, label, onClick }: { icon: LucideIcon; label: string; onClick: () => void }) {
  return (
    <Pressable
      type="button"
      onClick={onClick}
      className="group flex flex-col items-center gap-2 text-xs font-semibold text-text-primary"
    >
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-2 transition-[transform,background-color] duration-[var(--motion-instant)] group-active:scale-[var(--scale-pressed-strong)] group-hover:bg-surface-2/70">
        <Icon size={22} aria-hidden="true" />
      </span>
      {label}
    </Pressable>
  );
}

export function FinanceHomeHero({ metrics, onQuickEntry, onGoal, onMore, onAccounts }: FinanceHomeHeroProps) {
  return (
    <section className="space-y-6 pt-2 text-center" aria-label="Majątek netto">
      <div className="space-y-2">
        <p className="text-sm text-text-secondary">Majątek netto</p>
        <p className="text-[length:var(--finance-display-size)] font-semibold tabular-nums leading-[var(--line-height-display)] tracking-[var(--tracking-display)]">
          {formatPln(metrics.netWorth)}
        </p>
        <Pressable
          type="button"
          onClick={onAccounts}
          className="rounded-full bg-surface-2/80 px-5 py-2 text-sm font-semibold text-text-primary transition-transform duration-[var(--motion-instant)] active:scale-[var(--scale-pressed)]"
        >
          Konta
        </Pressable>
      </div>

      <div className="mx-auto flex max-w-sm justify-between gap-2 px-2">
        <ActionButton icon={ArrowUpRight} label="Wydatek" onClick={() => onQuickEntry('expense')} />
        <ActionButton icon={ArrowDownLeft} label="Wpływ" onClick={() => onQuickEntry('income')} />
        <ActionButton icon={Target} label="Cel" onClick={onGoal} />
        <ActionButton icon={MoreHorizontal} label="Więcej" onClick={onMore} />
      </div>
    </section>
  );
}
