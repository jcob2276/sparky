import React from 'react';
import { Flame, TrendingDown, TrendingUp, Utensils, Zap } from 'lucide-react';
import { calculateNetEnergy, NetEnergyGoal, NetEnergyInput, NetEnergyResult } from '@vanguard/domain';
import { Pressable } from '../../ui/ControlPrimitives';

export interface NetEnergyCardProps {
  activeCaloriesBurned: number;
  caloriesConsumed: number;
  weightKg?: number | null;
  heightCm?: number | null;
  age?: number | null;
  sex?: 'male' | 'female' | null;
  bmrOverride?: number | null;
  targetGoal?: NetEnergyGoal;
  onGoalChange?: (goal: NetEnergyGoal) => void;
}

const GOAL_LABELS: Record<NetEnergyGoal, string> = {
  deficit: 'Redukcja',
  maintenance: 'Utrzymanie',
  surplus: 'Masa',
};

const GoalSelector: React.FC<{
  targetGoal: NetEnergyGoal;
  onGoalChange?: (goal: NetEnergyGoal) => void;
}> = ({ targetGoal, onGoalChange }) => (
  <div className="flex items-center gap-1">
    {(['deficit', 'maintenance', 'surplus'] as NetEnergyGoal[]).map((goal) => {
      const isSelected = targetGoal === goal;
      return (
        <Pressable
          key={goal}
          onClick={() => onGoalChange?.(goal)}
          className={`rounded-lg px-2 py-0.5 text-xs font-medium transition-colors ${
            isSelected
              ? 'bg-primary text-surface-1'
              : 'bg-surface-2 text-secondary hover:text-primary'
          }`}
        >
          {GOAL_LABELS[goal]}
        </Pressable>
      );
    })}
  </div>
);

const EnergyBreakdownGrid: React.FC<{ result: NetEnergyResult }> = ({ result }) => (
  <div className="grid grid-cols-2 gap-2 text-xs">
    <div className="rounded-lg border border-border-custom bg-surface-2/60 p-2.5">
      <div className="flex items-center justify-between text-secondary">
        <span className="flex items-center gap-1 font-medium text-primary">
          <Utensils className="h-3.5 w-3.5 text-success" /> Spożyte
        </span>
        <span className="font-semibold text-primary">{result.consumed} kcal</span>
      </div>
      <div className="mt-2 space-y-1 text-3xs text-secondary">
        <div className="flex justify-between">
          <span>Termogeneza (TEF):</span>
          <span>+{result.tef} kcal</span>
        </div>
      </div>
    </div>

    <div className="rounded-lg border border-border-custom bg-surface-2/60 p-2.5">
      <div className="flex items-center justify-between text-secondary">
        <span className="flex items-center gap-1 font-medium text-primary">
          <Zap className="h-3.5 w-3.5 text-warning" /> Spalone (TDEE)
        </span>
        <span className="font-semibold text-primary">{result.tdee} kcal</span>
      </div>
      <div className="mt-2 space-y-1 text-3xs text-secondary">
        <div className="flex justify-between">
          <span>BMR (spoczynek):</span>
          <span>{result.bmr} kcal</span>
        </div>
        <div className="flex justify-between">
          <span>Ruch i trening:</span>
          <span>+{result.activeBurn} kcal</span>
        </div>
      </div>
    </div>
  </div>
);

export const NetEnergyCard: React.FC<NetEnergyCardProps> = ({
  activeCaloriesBurned,
  caloriesConsumed,
  weightKg,
  heightCm,
  age,
  sex,
  bmrOverride,
  targetGoal = 'maintenance',
  onGoalChange,
}) => {
  const result = calculateNetEnergy({
    activeCaloriesBurned,
    caloriesConsumed,
    weightKg,
    heightCm,
    age,
    sex,
    bmrOverride,
    targetGoal,
  } as NetEnergyInput);

  const isDeficit = result.netKcal < 0;
  const netSign = result.netKcal > 0 ? `+${result.netKcal}` : `${result.netKcal}`;
  const expenditurePercentage = result.tdee > 0 ? Math.min(100, Math.round((result.consumed / result.tdee) * 100)) : 0;

  return (
    <div className="rounded-xl border border-border-custom bg-surface-1 p-4 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-2 text-warning">
            <Flame className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-primary">Bilans Energetyczny Netto</h3>
            <p className="text-xs text-secondary">Spożycie vs Wydatek Całkowity (TDEE)</p>
          </div>
        </div>
        <GoalSelector targetGoal={targetGoal} onGoalChange={onGoalChange} />
      </div>

      {/* Main Net Metric Card */}
      <div className="rounded-xl bg-surface-2 p-3.5 flex items-center justify-between">
        <div className="space-y-0.5">
          <p className="text-xs text-secondary">Bilans dobowy netto</p>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-2xl font-bold tracking-tight ${
                isDeficit ? 'text-info' : result.netKcal > 150 ? 'text-warning' : 'text-success'
              }`}
            >
              {netSign} kcal
            </span>
            <span className="text-xs font-medium text-secondary">
              {result.status === 'deficit' ? 'Deficyt' : result.status === 'surplus' ? 'Nadwyżka' : 'Równowaga'}
            </span>
          </div>
        </div>

        {/* Weekly Trend Indicator */}
        <div className="text-right">
          <p className="text-3xs text-muted flex items-center justify-end gap-1">
            {result.projectedWeeklyKgDelta < 0 ? (
              <TrendingDown className="h-3 w-3 text-info" />
            ) : (
              <TrendingUp className="h-3 w-3 text-warning" />
            )}
            Prognoza tyg.
          </p>
          <p className="text-xs font-semibold text-primary mt-0.5">
            {result.projectedWeeklyKgDelta > 0 ? `+${result.projectedWeeklyKgDelta}` : result.projectedWeeklyKgDelta} kg
          </p>
        </div>
      </div>

      {/* In vs Out Breakdown Grid */}
      <EnergyBreakdownGrid result={result} />

      {/* Energy Visual Progress Bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-secondary">
          <span>Wykorzystanie zapotrzebowania</span>
          <span className="font-medium text-primary">{expenditurePercentage}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
          <div
            className={`h-full transition-all duration-500 ${
              isDeficit ? 'bg-info' : expenditurePercentage > 105 ? 'bg-warning' : 'bg-success'
            }`}
            style={{ width: `${Math.min(100, expenditurePercentage)}%` }}
          />
        </div>
      </div>

      {/* Recommendation */}
      <p className="text-xs leading-relaxed text-secondary border-t border-border-custom pt-2">
        {result.recommendation}
      </p>
    </div>
  );
};
