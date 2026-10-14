import { describe, expect, it } from 'vitest';
import { assessHealthGoal, HEALTH_GOAL_PRESETS, validateTrainingConstraints } from '@vanguard/domain';

describe('measurable health goals', () => {
  const goals = HEALTH_GOAL_PRESETS;
  const sample = { value: 100, unit: 'kg', variant: 'barbell', standard: 'full_rom', source: 'measured', techniqueConfirmed: true, reserveReps: 2 } as const;
  it('keeps all six goals and stores 45 minutes as 2700 seconds', () => {
    expect(goals).toHaveLength(6);
    expect(goals.find(g => g.spec.kind === 'run_10k')?.target).toBe(2700);
  });
  it('does not treat an estimate, unconfirmed standard or missing effort as bench achievement', () => {
    const bench = { ...goals[4], spec: { ...goals[4].spec, variant: 'barbell', standard: 'full_rom', reserveReps: 2 } };
    expect(assessHealthGoal(bench, { ...sample, source: 'estimated' }).state).toBe('unknown');
    expect(assessHealthGoal(bench, { ...sample, reserveReps: null }).state).toBe('unknown');
    expect(assessHealthGoal(goals[4], sample).state).toBe('unknown');
    expect(assessHealthGoal(bench, sample).state).toBe('achieved');
  });
  it('does not equate minutes with seconds or chin-ups with pull-ups', () => {
    const run = { ...goals[0], spec: { ...goals[0].spec, variant: 'road', standard: 'elapsed_time' } };
    expect(assessHealthGoal(run, { ...sample, value: 45, unit: 'minutes', variant: 'road', standard: 'elapsed_time' }).state).toBe('unknown');
    const pull = { ...goals[2], spec: { ...goals[2].spec, variant: 'pronated', standard: 'strict_full_rom' } };
    expect(assessHealthGoal(pull, { ...sample, unit: 'reps', value: 10, variant: 'supinated', standard: 'strict_full_rom' }).state).toBe('unknown');
  });
  it('requires a measured BF result and user confirmation of posture', () => {
    const bf = { ...goals[1], spec: { ...goals[1].spec, variant: 'dexa', standard: 'same_method' } };
    expect(assessHealthGoal(bf, { ...sample, value: 13, unit: 'percent', variant: 'dexa', standard: 'same_method', source: 'estimated' }).state).toBe('unknown');
    const posture = { ...goals[5], spec: { ...goals[5].spec, variant: 'user', standard: 'comfortable_upright' } };
    expect(assessHealthGoal(posture, { ...sample, value: 1, unit: 'confirmed', variant: 'user', standard: 'comfortable_upright' }).state).toBe('unknown');
    expect(assessHealthGoal(posture, { ...sample, value: 1, unit: 'confirmed', variant: 'user', standard: 'comfortable_upright', source: 'self_reported' }).state).toBe('achieved');
  });
  it('rejects invalid availability rather than inventing training time', () => {
    expect(validateTrainingConstraints({ availability: [{ day: 1, minutes: -20 }], equipment: [], limitations: [], revision: 1 })).not.toEqual([]);
    expect(validateTrainingConstraints({ availability: [{ day: 1, minutes: 50 }], equipment: ['barbell'], limitations: [], revision: 1 })).toEqual([]);
  });
  it('does not auto-achieve a goal with an unrecognized measurement standard', () => {
    const goal = { ...goals[4], spec: { ...goals[4].spec, variant: 'barbell', standard: 'unknown_test', reserveReps: 2 } };
    expect(assessHealthGoal(goal, { ...sample, standard: 'unknown_test' }).state).toBe('unknown');
  });
});
