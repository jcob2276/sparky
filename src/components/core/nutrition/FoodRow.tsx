import { Pressable } from '../../ui/ControlPrimitives';
import { Card } from '../../ui/Card';
import { formatDecimalPl } from '../../../lib/formatPl';

export interface FoodRowProps {
  name: string;
  subtitle?: string | null;
  calories: number | null;
  loading?: boolean;
  onTap: () => void;
  onQuickAdd: () => void;
  quickAddIcon: React.ReactNode;
  quickAddLabel?: string;
}

export default function FoodRow({ name, subtitle, calories, loading, onTap, onQuickAdd, quickAddIcon, quickAddLabel = 'Dodaj' }: FoodRowProps) {
  return (
    <Card className="flex items-center gap-2.5 ui-interactive duration-[var(--motion-fast)] ease-[var(--ease-out,ease-out)] hover:border-primary/25 hover:bg-surface-solid/50 active:scale-[0.98]" padding="0.625rem 0.5rem 0.625rem 0.875rem">
      <Pressable onClick={onTap} className="flex-1 min-w-0 text-left cursor-pointer">
        <p className="text-sm font-semibold text-text-primary truncate">{name}</p>
        {subtitle && <p className="text-xs text-text-muted truncate mt-0.5">{subtitle}</p>}
      </Pressable>
      <span className="text-xs font-medium text-text-secondary shrink-0 tabular-nums">{calories == null ? '—' : formatDecimalPl(calories)} kcal</span>
      <Pressable
        onClick={onQuickAdd}
        loading={loading}
        aria-label={quickAddLabel}
        className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full text-primary transition-transform duration-150 ease-out active:scale-[0.85]"
        size="sm"
      >
        {!loading && quickAddIcon}
      </Pressable>
    </Card>
  );
}
