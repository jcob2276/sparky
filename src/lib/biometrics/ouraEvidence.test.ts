import { describe, expect, it } from 'vitest';
import type { ImpactFactor } from '@vanguard/domain';
import {
  selectActionableBehaviorEffects,
  selectActionableSleepFactors,
} from './ouraEvidence';

const factor = (overrides: Partial<ImpactFactor>): ImpactFactor => ({
  id: 'factor',
  x_metric: 'calories_late',
  y_metric: 'rhr',
  x_label: 'Kalorie po 20:00',
  y_label: 'RHR',
  lag_days: 1,
  r: 0.42,
  n: 37,
  p: 0.01,
  ci_lower: 0.12,
  ci_upper: 0.65,
  ci_crosses_zero: false,
  is_stable: true,
  evidence_level: 'confirmed',
  natural_effect: '+2.1 bpm',
  decision_value: 1,
  scatter: [],
  method: 'spearman',
  category: 'zywienie',
  ...overrides,
});

describe('selectActionableSleepFactors', () => {
  it('removes counterintuitive screen correlations from actionable advice', () => {
    const result = selectActionableSleepFactors([factor({
      x_metric: 'phone_active_h',
      x_label: 'Telefon aktywny (h)',
      y_metric: 'sleep_efficiency',
      y_label: 'Efektywność snu',
      r: 0.53,
      natural_effect: '+3%',
      category: 'ekran',
    })]);

    expect(result).toEqual([]);
  });

  it('describes a higher RHR after late calories as a cost, not a positive effect', () => {
    const [result] = selectActionableSleepFactors([factor({})]);

    expect(result.tone).toBe('cost');
    expect(result.summary).toContain('wyższe RHR następnej nocy');
    expect(result.summary).not.toContain('pozytywna');
  });

  it('rejects same-day and hypothesis-level candidates', () => {
    const result = selectActionableSleepFactors([
      factor({ lag_days: 0 }),
      factor({ id: 'weak', evidence_level: 'hypothesis' }),
    ]);

    expect(result).toEqual([]);
  });
});

describe('selectActionableBehaviorEffects', () => {
  it('does not promote statistically weak behavior comparisons', () => {
    const result = selectActionableBehaviorEffects([{
      behavior_key: 'late_meal',
      n_with: 20,
      n_without: 20,
      mean_with: 75,
      mean_without: 76,
      delta: -1,
      pct_change: -1.3,
      cohens_d: -0.1,
      p_value: 0.4,
      significant: false,
      confidence: 'solid',
      dose_response: null,
      outcome_metric: 'readiness',
      lag_days: 1,
    }]);

    expect(result).toEqual([]);
  });
});
