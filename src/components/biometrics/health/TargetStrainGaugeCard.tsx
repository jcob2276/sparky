import { calculateTargetStrain } from '@vanguard/domain';
import CoachDecisionContainer from '../workout/CoachDecisionContainer';
export function TargetStrainGaugeCard({recoveryScore,strainScore,userId}:{recoveryScore:number|null|undefined;strainScore:number|null|undefined;userId?:string}) {
  const result=calculateTargetStrain(recoveryScore,strainScore);
  return <section className="rounded-2xl border border-border-custom bg-surface p-4 space-y-3">
    <h3 className="text-sm font-semibold">Obciążenie i plan na dziś</h3>
    <p className="text-sm">Zapisane obciążenie: {result.currentStrain ?? 'brak danych'}{result.currentStrain == null ? '' : '/21'}</p>
    <p className="text-xs text-text-secondary">{result.recommendation}</p>
    {userId && <CoachDecisionContainer userId={userId} />}
  </section>;
}
