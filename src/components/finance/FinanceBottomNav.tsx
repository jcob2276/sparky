import { Pressable } from '../ui/ControlPrimitives';
import { ArrowLeftRight, Briefcase, ChartNoAxesColumnIncreasing, Home } from 'lucide-react';
import type { FinanceTabKey } from './FinanceTabContent';

const ITEMS = [
  { key: 'dashboard', label: 'Start', icon: Home },
  { key: 'flows', label: 'Transakcje', icon: ArrowLeftRight },
  { key: 'analysis', label: 'Analiza', icon: ChartNoAxesColumnIncreasing },
  { key: 'portfolio', label: 'Portfel', icon: Briefcase },
] as const;

export function FinanceBottomNav({ active, onChange }: {
  active: FinanceTabKey;
  onChange: (tab: FinanceTabKey) => void;
}) {
  return (
    <nav className="finance-reference-dock" aria-label="Sekcje finansów">
      {ITEMS.map(({ key, label, icon: Icon }) => (
        <Pressable key={key} type="button" aria-current={active === key ? 'page' : undefined} onClick={() => onChange(key)}>
          <Icon size={22} strokeWidth={active === key ? 2 : 1.65} aria-hidden="true" />
          <span>{label}</span>
        </Pressable>
      ))}
    </nav>
  );
}
