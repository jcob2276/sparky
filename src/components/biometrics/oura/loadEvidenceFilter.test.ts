import { describe, expect, it } from 'vitest';
import type { BehaviorEffectResult, CorrelationResult } from '@vanguard/domain';
import { filterLoadBehaviors, filterLoadCorrelations } from './loadEvidenceFilter';

const corr = (x_metric: string, x_label = x_metric) => ({ x_metric, x_label } as CorrelationResult);
const beh = (behavior_key: string) => ({ behavior_key } as BehaviorEffectResult);

describe('filterLoadCorrelations', () => {
  it('keeps load topics and drops topics covered by the sleep drivers engine', () => {
    const kept = filterLoadCorrelations([
      corr('strain_score'), corr('steps'), corr('caffeine_mg'), corr('phone_late_min'),
      corr('last_meal_hour'), corr('food_quality'), corr('bedtime_hour'),
    ]).map((c) => c.x_metric);
    expect(kept).toEqual(['strain_score', 'steps']);
  });
});

describe('filterLoadBehaviors', () => {
  it('drops training-gap, caffeine, screen and meal behaviors', () => {
    const kept = filterLoadBehaviors([
      beh('strength_workout'), beh('steps_high'), beh('late_workout'), beh('workout_gap_h'),
      beh('coffee_after_noon'), beh('late_meal'), beh('screen_time'),
    ]).map((b) => b.behavior_key);
    expect(kept).toEqual(['strength_workout', 'steps_high']);
  });
});
