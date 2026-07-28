import type { BehaviorEffectResult, ImpactFactor } from '@vanguard/domain';

export interface ActionableSleepFactor extends ImpactFactor {
  tone: 'benefit' | 'cost';
  summary: string;
}

const HIGHER_IS_BETTER = new Set([
  'sleep_h',
  'sleep_score',
  'sleep_efficiency',
  'deep_sleep_h',
  'rem_sleep_h',
  'sleep_hrv',
  'hrv',
  'readiness',
  'recovery',
]);

const LOWER_IS_BETTER = new Set([
  'rhr',
  'sleep_hr',
  'sleep_lowest_hr',
]);

const EXPECTED_HARMFUL_INPUTS = /phone|screen|fragmentation|caffeine|coffee|alcohol|calories_late|last_meal/;

function isExpectedDirection(factor: ImpactFactor): boolean {
  if (!EXPECTED_HARMFUL_INPUTS.test(factor.x_metric)) return true;
  if (HIGHER_IS_BETTER.has(factor.y_metric)) return factor.r < 0;
  if (LOWER_IS_BETTER.has(factor.y_metric)) return factor.r > 0;
  return false;
}

function worsensOutcome(factor: ImpactFactor): boolean {
  if (HIGHER_IS_BETTER.has(factor.y_metric)) return factor.r < 0;
  if (LOWER_IS_BETTER.has(factor.y_metric)) return factor.r > 0;
  return false;
}

export function selectActionableSleepFactors(
  factors: ImpactFactor[],
): ActionableSleepFactor[] {
  return factors
    .filter((factor) => (
      (factor.evidence_level === 'confirmed' || factor.evidence_level === 'probable')
      && factor.lag_days === 1
      && !factor.ci_crosses_zero
      && factor.is_stable
      && isExpectedDirection(factor)
    ))
    .map((factor) => {
      const higher = factor.r > 0;
      return {
        ...factor,
        tone: worsensOutcome(factor) ? 'cost' as const : 'benefit' as const,
        summary: `${higher ? 'wyższe' : 'niższe'} ${factor.y_label} następnej nocy (${factor.natural_effect})`,
      };
    })
    .sort((a, b) => b.decision_value - a.decision_value);
}

export function selectActionableBehaviorEffects(
  effects: BehaviorEffectResult[],
): BehaviorEffectResult[] {
  return effects
    .filter((effect) => (
      effect.significant
      && effect.p_value != null
      && effect.p_value <= 0.05
      && Math.abs(effect.cohens_d ?? 0) >= 0.2
      && effect.lag_days === 1
      && effect.n_with >= 8
      && effect.n_without >= 8
    ))
    .sort((a, b) => Math.abs(b.cohens_d ?? 0) - Math.abs(a.cohens_d ?? 0));
}
