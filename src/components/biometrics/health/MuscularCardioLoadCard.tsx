/**
 * @file MuscularCardioLoadCard.tsx
 * @role Karta rozbicia obciążenia na Cardio Load vs Muscular Load oraz regeneracji partii mięśniowych w stylu Bevel.
 */

import { Heart, Dumbbell, ShieldCheck } from 'lucide-react';
import { computeMuscularCardioLoad, type MuscularCardioLoadInput } from '@vanguard/domain';

interface MuscularCardioLoadCardProps {
  input: MuscularCardioLoadInput;
}

export function MuscularCardioLoadCard({ input }: MuscularCardioLoadCardProps) {
  const result = computeMuscularCardioLoad(input);
  const {
    cardioPoints,
    muscularPoints,
    cardioPercentage,
    muscularPercentage,
    explanation,
    muscleGroups,
  } = result;

  const getStatusBadgeClass = (status: 'recovered' | 'partial' | 'fatigued') => {
    switch (status) {
      case 'recovered':
        return 'text-success bg-success/10 border-success/30';
      case 'partial':
        return 'text-warning bg-warning/10 border-warning/30';
      case 'fatigued':
        return 'text-danger bg-danger/10 border-danger/30';
    }
  };

  return (
    <section className="relative overflow-hidden rounded-3xl border border-border-custom/50 bg-surface-1/90 p-5 shadow-lg backdrop-blur-xl">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold tracking-wide text-text-primary">
          Obciążenie Kardio vs Mięśniowe
        </h3>
        <span className="flex items-center gap-1 text-xs text-text-muted">
          <ShieldCheck size={14} className="text-primary" />
          <span>Analiza adaptacyjna</span>
        </span>
      </div>

      <div className="mt-4 space-y-3">
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className="flex items-center gap-1.5 text-warning">
            <Heart size={14} />
            <span>Kardio (Garmin): {cardioPercentage}%</span>
          </span>
          <span className="flex items-center gap-1.5 text-primary">
            <Dumbbell size={14} />
            <span>Siłowe (Logger): {muscularPercentage}%</span>
          </span>
        </div>

        <div className="flex h-3.5 w-full overflow-hidden rounded-full bg-surface-3/50 p-0.5">
          <div
            className="h-full rounded-l-full bg-warning transition-all"
            style={{ width: `${cardioPercentage}%` }}
            title={`Kardio: ${cardioPercentage}%`}
          />
          <div
            className="h-full rounded-r-full bg-primary transition-all"
            style={{ width: `${muscularPercentage}%` }}
            title={`Siłowe: ${muscularPercentage}%`}
          />
        </div>

        <div className="flex justify-between text-3xs text-text-muted">
          <span>Punkty kardio: {cardioPoints.toFixed(1)}</span>
          <span>Punkty siłowe: {muscularPoints.toFixed(1)}</span>
        </div>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-text-secondary">
        {explanation}
      </p>

      <div className="mt-5 border-t border-border-custom/40 pt-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted">
          Regeneracja Partii Mięśniowych (Muscle Recovery)
        </h4>

        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {muscleGroups.map((muscle) => (
            <div
              key={muscle.name}
              className="flex items-center justify-between rounded-2xl border border-border-custom/30 bg-surface-2/40 px-3.5 py-2.5"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-text-primary">
                  {muscle.name}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-text-primary">
                  {muscle.readinessPercentage}%
                </span>
                <span
                  className={`rounded-full border px-2 py-0.5 text-3xs font-semibold ${getStatusBadgeClass(
                    muscle.status
                  )}`}
                >
                  {muscle.statusLabel}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
