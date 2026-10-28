import { assertEquals, assertStringIncludes } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { validateTrainingPlan, futureTrainingPlan, type TrainingSession } from '@vanguard/domain';
import { buildHealthCoachContext } from '../_shared/healthCoachContext.ts';
const context = buildHealthCoachContext({ asOf: '2026-10-14T12:00:00Z', data: {} });
const constraints = { revision: 1, availability: [{ day: 4, minutes: 60 }, { day: 5, minutes: 60 }], equipment: ['barbell'], limitations: [] };
const session: TrainingSession = { key: 'one', date: '2026-10-15', type: 'strength', name: 'Upper', goal: 'Bench',
  durationMinutes: 45, warmupMinutes: 8, cooldownMinutes: 5, intensity: 'moderate', notes: 'RIR 3',
  exercises: [{ name: 'Bench Press', sets: 3, reps: 8, rir: 3, restSeconds: 120, weightKg: null, equipment: ['barbell'], pattern: 'upper' }] };
const draft = { title: 'Hybrid', startDate: '2026-10-15', blockWeeks: 1, progression: 'Reps first', deloadWeeks: [1], tradeoffs: ['Maintain muscle during reduction'], sessions: [session] };
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

Deno.test('compact templates expand into concrete multiweek prescriptions and a missing week is rejected', () => {
  const sessions = ['2026-10-15', '2026-10-22', '2026-10-29', '2026-11-05'].map((date, index) => ({ key: `w${index}`, date, template: 'upper' }));
  const compact = { ...draft, blockWeeks: 4, deloadWeeks: [4], templates: { upper: session }, sessions };
  const result = validateTrainingPlan(compact, context, constraints);
  assertEquals(result.errors, []);
  assertEquals(result.plan?.sessions[3].exercises[0].reps, 8);
  const missing = validateTrainingPlan({ ...compact, sessions: sessions.slice(0, 3) }, context, constraints);
  assertStringIncludes(missing.errors.join(' '), 'tygodniu');
});

Deno.test('undo only restores remaining future prescriptions and rebases the remaining block', () => {
  const previous = { ...draft, startDate: '2026-10-01', blockWeeks: 4, deloadWeeks: [4],
    sessions: ['2026-10-01', '2026-10-08', '2026-10-15', '2026-10-22'].map((date, index) => ({ ...session, key: `s${index}`, date })) };
  const future = futureTrainingPlan(previous, context.localDate);
  assertEquals(future?.sessions.map(row => row.date), ['2026-10-15','2026-10-22']);
  assertEquals(future?.startDate,'2026-10-14');
  assertEquals(future?.blockWeeks,2);
  assertEquals(future ? validateTrainingPlan(future, context, constraints).errors : ['missing'],[]);
});
