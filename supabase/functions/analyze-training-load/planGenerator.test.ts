import { assertEquals, assertStringIncludes } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { validateTrainingPlan, type HealthCoachContext } from '@vanguard/domain';
import { buildHealthCoachContext } from '../_shared/healthCoachContext.ts';
const context = buildHealthCoachContext({ asOf: '2026-10-14T12:00:00Z', data: {} });
const constraints = { revision: 1, availability: [{ day: 4, minutes: 60 }, { day: 5, minutes: 60 }], equipment: ['barbell'], limitations: [] };
const session = { key: 'one', date: '2026-10-15', type: 'strength', name: 'Upper', goal: 'Bench',
  durationMinutes: 45, warmupMinutes: 8, cooldownMinutes: 5, intensity: 'moderate', notes: 'RIR 3',
  exercises: [{ name: 'Bench Press', sets: 3, reps: 8, rir: 3, restSeconds: 120, weightKg: null, equipment: ['barbell'], pattern: 'upper' }] };
const draft = { title: 'Hybrid', startDate: '2026-10-15', blockWeeks: 4, progression: 'Reps first', deloadWeeks: [4], tradeoffs: ['Maintain muscle during reduction'], sessions: [session] };
Deno.test('plan fits declared time and equipment without inventing baseline loads', () => {
  assertEquals(validateTrainingPlan(draft, context, constraints).errors, []);
  const invalid = validateTrainingPlan({ ...draft, sessions: [{ ...session, exercises: [{ ...session.exercises[0], weightKg: 100 }] }] }, context, constraints);
  assertStringIncludes(invalid.errors.join(' '), 'ciężaru');
});
Deno.test('unavailable days, time and equipment are rejected', () => {
  const invalid = validateTrainingPlan({ ...draft, sessions: [{ ...session, date: '2026-10-17', durationMinutes: 90,
    exercises: [{ ...session.exercises[0], equipment: ['rings'] }] }] }, context, constraints);
  assertStringIncludes(invalid.errors.join(' '), 'dostępności');
  assertStringIncludes(invalid.errors.join(' '), 'sprzętu');
});
Deno.test('heavy legs cannot precede a hard run and warmup/rest count against session time', () => {
  const invalid = validateTrainingPlan({ ...draft, sessions: [{ ...session, intensity: 'hard', durationMinutes: 10,
    exercises: [{ ...session.exercises[0], pattern: 'lower' }] }, { ...session, key: 'run', date: '2026-10-16', type: 'run', intensity: 'hard', exercises: [] }] }, context, constraints);
  assertStringIncludes(invalid.errors.join(' '), 'nogi');
  assertStringIncludes(invalid.errors.join(' '), 'czasu');
});
Deno.test('explicit exercise exclusions and pain prevent hard prescriptions', () => {
  const invalid = validateTrainingPlan({ ...draft, sessions: [{ ...session, intensity: 'hard' }] }, context,
    { ...constraints, limitations: ['Ból barku'], avoidExercises: ['Bench Press'], painReported: true });
  assertStringIncludes(invalid.errors.join(' '), 'pominięcia');
  assertStringIncludes(invalid.errors.join(' '), 'bólu');
});
