import { calculateTargetStrain } from '@vanguard/domain';
import CoachDecisionContainer from '../workout/CoachDecisionContainer';

interface TargetStrainGaugeCardProps {
  recoveryScore: number | null | undefined;
  strainScore: number | null | undefined;
  userId?: string;
}

export function TargetStrainGaugeCard({
  recoveryScore,
  strainScore,
  userId,
}: TargetStrainGaugeCardProps) {
  const result = calculateTargetStrain(recoveryScore, strainScore);

  return (
    <section className="rounded-2xl border border-border-custom/50 bg-surface-1 p-4 space-y-3">
      <h3 className="text-sm font-semibold text-text-primary">Obciążenie i plan na dziś</h3>
      <p className="text-sm text-text-primary">
        Zapisane obciążenie:{' '}
        <span className="font-bold">
          {result.currentStrain ?? 'brak danych'}
          {result.currentStrain == null ? '' : '/21'}
        </span>
      </p>
      <p className="text-xs leading-relaxed text-text-secondary">{result.recommendation}</p>
      {userId && <CoachDecisionContainer userId={userId} />}
    </section>
  );
}
