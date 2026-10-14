/**
 * @file StrengthProgressionCard.tsx
 * @role Karta śledzenia progresji siły (1RM Progression & Strength Trend) w stylu Bevel Health / Strong.
 * Wizualizuje szacowane 1RM, postęp w stosunku do celów siłowych, współczynnik Big 3 / masa ciała
 * oraz umożliwia natychmiastowe uruchomienie kalkulatora talerzy na sztangę dla danego boju.
 */

import { useState } from 'react';
import { Dumbbell, Trophy, TrendingUp, Calculator, Sparkles, AlertCircle } from 'lucide-react';
import { Card } from '../../ui/Card';
import Button from '../../ui/Button';
import { WorkoutPlateCalculatorModal } from '../workout/WorkoutPlateCalculatorModal';
import {
  type OverallStrengthSummary,
  type LiftProgressSummary,
} from '@vanguard/domain';

interface StrengthProgressionCardProps {
  summary: OverallStrengthSummary;
  onSelectLift?: (liftKey: string) => void;
}

export function StrengthProgressionCard({ summary, onSelectLift }: StrengthProgressionCardProps) {
  const [selectedLiftForCalc, setSelectedLiftForCalc] = useState<LiftProgressSummary | null>(null);

  const getStatusBadge = (lift: LiftProgressSummary) => {
    switch (lift.status) {
      case 'target_reached':
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-success/40 bg-success/10 px-2 py-0.5 text-3xs font-semibold uppercase tracking-wider text-success">
            <Trophy size={10} /> Cel osiągnięty
          </span>
        );
      case 'plateau':
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-warning/40 bg-warning/10 px-2 py-0.5 text-3xs font-semibold uppercase tracking-wider text-warning">
            <AlertCircle size={10} /> Zastój
          </span>
        );
      default:
        return lift.deltaVsPreviousPct > 0 ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-3xs font-semibold uppercase tracking-wider text-primary">
            <TrendingUp size={10} /> +{lift.deltaVsPreviousPct}%
          </span>
        ) : null;
    }
  };

  return (
    <>
      <Card className="space-y-4 p-4 text-text-primary">
        {/* Nagłówek */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-border-custom bg-surface-2">
              <Dumbbell size={16} className="text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold tracking-tight">Progresja Siły & 1RM</h3>
              <p className="text-3xs text-text-muted">Szacowany ciężar maksymalny (Epley) & cele</p>
            </div>
          </div>

          {summary.bigThreeTotal1RM > 0 && (
            <div className="text-right">
              <span className="text-3xs font-semibold uppercase tracking-wider text-text-muted">
                Big 3 Total
              </span>
              <div className="flex items-baseline justify-end gap-1">
                <span className="text-base font-bold tracking-tight text-text-primary">
                  {summary.bigThreeTotal1RM} kg
                </span>
                {summary.relativeStrengthRatio && (
                  <span className="text-3xs font-bold text-primary">
                    ({summary.relativeStrengthRatio}x BW)
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Lista głównych bojów */}
        <div className="space-y-3">
          {summary.lifts.map((lift) => (
            <div
              key={lift.key}
              className="rounded-xl border border-border-custom/40 bg-surface-2/30 p-3 transition-colors hover:border-border-custom"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-text-primary">{lift.name}</span>
                  {getStatusBadge(lift)}
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <span className="text-xs font-bold text-text-primary">
                      {lift.current1RM} kg
                    </span>
                    <span className="text-3xs text-text-muted"> / cel {lift.target1RM} kg</span>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedLiftForCalc(lift);
                      onSelectLift?.(lift.key);
                    }}
                    className="!h-7 !w-7 !p-0"
                    title={`Kalkulator talerzy dla ${lift.name}`}
                    aria-label={`Kalkulator talerzy ${lift.name}`}
                  >
                    <Calculator size={12} className="text-text-muted hover:text-text-primary" />
                  </Button>
                </div>
              </div>

              {/* Pasek postępu */}
              <div className="mt-2 space-y-1">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
                  <div
                    className={`h-full rounded-full transition-all ${
                      lift.progressPercentage >= 100 ? 'bg-success' : 'bg-primary'
                    }`}
                    style={{ width: `${Math.min(100, lift.progressPercentage)}%` }}
                  />
                </div>
                <div className="flex justify-between text-3xs text-text-muted">
                  <span>{lift.progressPercentage}% celu</span>
                  <span>Następny cel: {lift.recommendedNextWeightKg} kg</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Stopka z podsumowaniem statusu */}
        <div className="flex items-center justify-between rounded-xl border border-border-custom/30 bg-surface-2/20 p-2.5 text-2xs text-text-secondary">
          <div className="flex items-center gap-1.5">
            <Sparkles size={13} className="text-primary" />
            <span>
              Średni postęp celów siłowych: <strong>{summary.averageProgressPercentage}%</strong>
            </span>
          </div>
          <span className="text-3xs font-semibold text-text-muted">
            {summary.totalRecordsAchieved} aktualnych rekordów (PR)
          </span>
        </div>
      </Card>

      {/* Modal kalkulatora talerzy */}
      {selectedLiftForCalc && (
        <WorkoutPlateCalculatorModal
          isOpen={true}
          onClose={() => setSelectedLiftForCalc(null)}
          initialWeightKg={selectedLiftForCalc.current1RM || selectedLiftForCalc.target1RM}
        />
      )}
    </>
  );
}
