/**
 * @component Direction
 * @role Zakładka TYDZIEŃ: stan tygodnia (WeekHub). Przeglądy tygodnia, miesiąca i sprintu
 *       zamyka bramka `ReviewGate` (components/review), nie ta zakładka.
 * @usedBy DashboardTydzienTab (lazy)
 */
import WeekHub from './WeekHub';

export default function Direction({ onOpenActionCenter }: { onOpenActionCenter?: () => void } = {}) {
  return (
    <div className="flex-1 space-y-6 overflow-y-auto animate-fadeIn">
      <WeekHub onOpenActionCenter={onOpenActionCenter} />
    </div>
  );
}
