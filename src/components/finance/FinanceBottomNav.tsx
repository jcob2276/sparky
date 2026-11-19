import { motion, useReducedMotion } from 'framer-motion';
import { IOS_SPRING } from '../../lib/motion/iosMotion';
import { createPortal } from 'react-dom';
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
  const reduceMotion = useReducedMotion();
  const index = ITEMS.findIndex(({ key }) => key === active);
  return createPortal(
    <nav className="finance-reference-dock" aria-label="Sekcje finansów">
      <motion.span className="finance-reference-dock-indicator" aria-hidden="true" initial={false}
        animate={{ x: `${Math.max(index, 0) * 100}%`, opacity: index < 0 ? 0 : 1 }}
        transition={reduceMotion ? { duration: 0 } : IOS_SPRING.interactive} />
      {ITEMS.map(({ key, label, icon: Icon }) => (
        <Pressable key={key} type="button" aria-current={active === key ? 'page' : undefined} haptic={active === key ? "none" : "selection"} onClick={() => { if (active !== key) onChange(key); }}>
          <Icon size={22} strokeWidth={active === key ? 2 : 1.65} aria-hidden="true" />
          <span>{label}</span>
        </Pressable>
      ))}
    </nav>,
    document.body
  );
}
