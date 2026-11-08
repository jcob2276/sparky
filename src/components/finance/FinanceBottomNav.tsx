import { ArrowLeftRight, Briefcase, Home, Plus, type LucideIcon } from 'lucide-react';
import { Pressable } from '../ui/ControlPrimitives';
import Fab from '../ui/Fab';
import type { FinanceTabKey } from './FinanceTabContent';

const ITEMS: Array<{ key: FinanceTabKey; label: string; icon: LucideIcon }> = [
  { key: 'dashboard', label: 'Pulpit', icon: Home },
  { key: 'portfolio', label: 'Portfel', icon: Briefcase },
  { key: 'flows', label: 'Przepływy', icon: ArrowLeftRight },
];

/** Plus szybkiego wpisu stoi w środku, zaraz za Portfelem, i jest widoczny w każdej zakładce. */
const ADD_AFTER_INDEX = 2;

interface FinanceBottomNavProps {
  active: FinanceTabKey;
  onChange: (tab: FinanceTabKey) => void;
  onAdd: () => void;
}

export function FinanceBottomNav({ active, onChange, onAdd }: FinanceBottomNavProps) {
  const renderTab = ({ key, label, icon: Icon }: (typeof ITEMS)[number]) => {
    const selected = key === active;
    return (
      <li key={key} className="flex-1">
        <Pressable
          type="button"
          onClick={() => onChange(key)}
          aria-current={selected ? 'page' : undefined}
          className={`flex min-h-12 w-full flex-col items-center justify-center gap-0.5 rounded-lg text-xs font-medium transition-colors duration-[var(--motion-fast)] ${selected ? 'text-primary' : 'text-text-muted hover:text-text-secondary'}`}
        >
          <Icon size={22} strokeWidth={selected ? 2.25 : 1.75} aria-hidden="true" />
          {label}
        </Pressable>
      </li>
    );
  };

  return (
    <nav
      aria-label="Sekcje finansów"
      className="fixed inset-x-0 bottom-0 z-[var(--z-sticky)] border-t border-border-custom/30 bg-background/85 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-[var(--blur-material)]"
    >
      <ul className="mx-auto flex max-w-[var(--content-default)] items-stretch justify-around px-2 pt-1.5">
        {ITEMS.slice(0, ADD_AFTER_INDEX).map(renderTab)}
        <li className="flex flex-1 items-center justify-center">
          <Fab position="custom" size="sm" title="Szybki wpis" onClick={onAdd}>
            <Plus size={22} aria-hidden="true" />
          </Fab>
        </li>
        {ITEMS.slice(ADD_AFTER_INDEX).map(renderTab)}
      </ul>
    </nav>
  );
}
