import { Flame } from 'lucide-react';
import { calculateNetEnergy, type NetEnergyGoal } from '@vanguard/domain';
import DataStateNotice from '../../core/DataStateNotice';
import { Pressable } from '../../ui/ControlPrimitives';

export interface NetEnergyCardProps {
  activeCaloriesBurned?: number | null;
  totalCaloriesBurned?: number | null;
  caloriesConsumed: number;
  foodComplete?: boolean;
  targetGoal?: NetEnergyGoal;
  onGoalChange?: (goal: NetEnergyGoal) => void;
}

const GOAL_LABELS: Record<NetEnergyGoal, string> = {
  deficit: 'Redukcja', maintenance: 'Utrzymanie', surplus: 'Masa',
};

export function NetEnergyCard({
  activeCaloriesBurned,
  totalCaloriesBurned,
  caloriesConsumed,
  foodComplete = false,
  targetGoal = 'maintenance',
  onGoalChange,
}: NetEnergyCardProps) {
  if (totalCaloriesBurned == null || !Number.isFinite(totalCaloriesBurned) || totalCaloriesBurned < 0) {
    return <DataStateNotice title="Brak danych o wydatku energii" detail="Bilans wymaga całkowitego wydatku z tego samego dnia co dziennik jedzenia. Sama energia aktywna nie wystarcza." />;
  }

  const result = calculateNetEnergy({
    totalCaloriesBurned,
    activeCaloriesBurned: activeCaloriesBurned ?? 0,
    caloriesConsumed,
    targetGoal,
  });
  const netSign = result.netKcal > 0 ? `+${result.netKcal}` : `${result.netKcal}`;

  return (
    <section className="space-y-4 rounded-xl border border-border-custom bg-surface-1 p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Flame className="h-4 w-4 text-warning" />
          <div>
            <h3 className="text-sm font-semibold text-text-primary">Bilans Energetyczny Netto</h3>
            <p className="text-xs text-text-secondary">Dziennik jedzenia i szacowany wydatek urządzenia</p>
          </div>
        </div>
        {foodComplete && onGoalChange && <div className="flex items-center gap-1">
          {(Object.keys(GOAL_LABELS) as NetEnergyGoal[]).map((goal) => (
            <Pressable key={goal} onClick={() => onGoalChange(goal)}
              className={`rounded-lg px-2 py-0.5 text-xs font-medium ${goal === targetGoal ? 'bg-primary text-surface-1' : 'bg-surface-2 text-text-secondary'}`}>
              {GOAL_LABELS[goal]}
            </Pressable>
          ))}
        </div>}
      </div>

      <div className="rounded-xl bg-surface-2 p-3.5">
        <p className="text-xs text-text-secondary">{foodComplete ? 'Bilans zapisanego dnia' : 'Bieżąca różnica · niezamknięty dziennik'}</p>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-text-primary">{netSign} kcal</span>
          {foodComplete && <span className="text-xs text-text-secondary">
            {result.status === 'deficit' ? 'Deficyt' : result.status === 'surplus' ? 'Nadwyżka' : 'Równowaga'}
          </span>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg border border-border-custom bg-surface-2/60 p-2.5">
          <p className="text-text-secondary">Zapisane spożycie</p>
          <p className="font-semibold text-text-primary">{result.consumed} kcal</p>
        </div>
        <div className="rounded-lg border border-border-custom bg-surface-2/60 p-2.5">
          <p className="text-text-secondary">Całkowity wydatek</p>
          <p className="font-semibold text-text-primary">{result.tdee} kcal</p>
        </div>
      </div>
      <p className="border-t border-border-custom pt-2 text-xs leading-relaxed text-text-secondary">
        {foodComplete ? result.recommendation : 'Dopóki dziennik nie jest kompletny, różnica nie określa ostatecznego deficytu ani nadwyżki dnia.'}
        {' '}Wydatek jest estymacją i może być jeszcze aktualizowany przez urządzenie.
      </p>
    </section>
  );
}
