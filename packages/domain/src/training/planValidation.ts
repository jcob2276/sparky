import type { HealthCoachContext } from './coachTypes.ts';
import type { TrainingConstraints } from './healthGoals.ts';
import { canonicalExerciseName } from './exerciseAliases.ts';
import { shiftDateStr } from '../date.ts';

export interface PlanExercise {
  name: string; sets: number; reps: number; rir: number; restSeconds: number;
  weightKg: number | null; equipment: string[]; pattern: 'upper' | 'lower' | 'core' | 'skill';
}
export interface TrainingSession {
  key: string; date: string; type: 'strength' | 'run' | 'mobility' | 'skills'; name: string; goal: string;
  durationMinutes: number; warmupMinutes: number; cooldownMinutes: number;
  intensity: 'easy' | 'moderate' | 'hard'; exercises: PlanExercise[]; notes: string; distanceKm?: number;
}
export interface TrainingPlanDraft {
  title: string; startDate: string; blockWeeks: number; progression: string; deloadWeeks: number[]; tradeoffs: string[];
  sessions: TrainingSession[];
  changes?: Array<{ sessionKey: string; before: TrainingSession; after: TrainingSession; why: string[] }>;
}
/** Restore prescriptions only; actual executions remain in their original records. */
export function futureTrainingPlan(plan: TrainingPlanDraft, localDate: string): TrainingPlanDraft | null {
  const sessions = plan.sessions.filter(session => session.date >= localDate);
  if (!sessions.length) return null;
  const last = sessions.reduce((date, session) => session.date > date ? session.date : date, localDate);
  const dayOffset = (date: string) => Math.round((Date.parse(date) - Date.parse(localDate)) / 86400000);
  const blockWeeks = Math.ceil((dayOffset(last) + 1) / 7);
  const deloadWeeks = [...new Set(plan.deloadWeeks.map(week => Math.floor(dayOffset(shiftDateStr(plan.startDate, (week - 1) * 7)) / 7) + 1))]
    .filter(week => week >= 1 && week <= blockWeeks);
  return { ...plan, startDate: localDate, blockWeeks, deloadWeeks, sessions };
}
const record = (value: unknown): Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const text = (value: unknown) => typeof value === 'string' ? value.trim() : '';
const number = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? value : NaN;
const strings = (value: unknown) => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;

export function validateTrainingPlan(raw: unknown, context: HealthCoachContext, constraints: TrainingConstraints): { plan: TrainingPlanDraft | null; errors: string[] } {
  const draft = record(raw), errors: string[] = [];
  const startDate = text(draft.startDate), blockWeeks = number(draft.blockWeeks);
  if (!validDate(startDate) || startDate < context.localDate) errors.push('Plan musi zaczynać się od aktualnej lub przyszłej daty.');
  if (!Number.isInteger(blockWeeks) || blockWeeks < 1 || blockWeeks > 12) errors.push('Blok musi mieć od 1 do 12 tygodni.');
  if (!text(draft.title) || !text(draft.progression)) errors.push('Brak nazwy lub reguły progresji.');
  const rawSessions = Array.isArray(draft.sessions) ? draft.sessions : [];
  if (!rawSessions.length || rawSessions.length > 120) errors.push('Plan musi zawierać konkretne sesje.');
  const baseline = new Map<string, number>();
  for (const workout of context.sources.workout_sessions.value ?? []) {
    if (!Array.isArray(workout.exercise_logs)) continue;
    for (const log of workout.exercise_logs) {
      const row = record(log), name = canonicalExerciseName(text(row.exercise_name)), weight = number(row.weight);
      if (weight >= 0) baseline.set(name, Math.max(baseline.get(name) ?? 0, weight));
    }
  }
  const equipment = new Set(constraints.equipment.map(item => item.toLocaleLowerCase()));
  const keys = new Set<string>(), days = new Set<string>();
  const sessions: TrainingSession[] = [];
  for (const item of rawSessions) {
    const reference = record(item), templates = record(draft.templates);
    if (typeof reference.template === 'string' && !(reference.template in templates)) errors.push('Nieznany szablon sesji.');
    const row = { ...record(templates[text(reference.template)]), ...reference };
    const key = text(row.key), date = text(row.date), type = text(row.type), intensity = text(row.intensity);
    if (!key || keys.has(key) || days.has(date)) errors.push('Sesje muszą mieć unikalne identyfikatory i dni.');
    keys.add(key); days.add(date);
    if (!validDate(date) || !validDate(startDate) || date < startDate || (blockWeeks > 0 && date >= shiftDateStr(startDate, blockWeeks * 7))) errors.push('Data sesji poza blokiem.');
    const weekday = validDate(date) ? new Date(date + 'T12:00:00Z').getUTCDay() || 7 : 0;
    const slot = constraints.availability.find(entry => entry.day === weekday);
    if (!slot) errors.push(`${date}: brak dostępności.`);
    const duration = number(row.durationMinutes), warmup = number(row.warmupMinutes), cooldown = number(row.cooldownMinutes);
    if (!(duration >= 10 && duration <= (slot?.minutes ?? 240)) || !(warmup >= 0 && cooldown >= 0 && warmup + cooldown < duration)) errors.push(`${date}: przekroczony lub nieznany limit czasu.`);
    if (!['strength', 'run', 'mobility', 'skills'].includes(type) || !['easy', 'moderate', 'hard'].includes(intensity)) errors.push('Nieznany rodzaj lub intensywność treningu.');
    if (!text(row.name) || !text(row.goal) || text(row.notes).length > 3000) errors.push('Sesja wymaga nazwy, celu i krótkich wskazówek.');
    if (constraints.painReported && intensity === 'hard') errors.push('Przy zgłoszonym bólu plan wymaga łagodnego wariantu i ponownego przeglądu.');
    const exercises: PlanExercise[] = [];
    let exerciseMinutes = 0;
    for (const value of Array.isArray(row.exercises) ? row.exercises : []) {
      const exercise = record(value), name = text(exercise.name), sets = number(exercise.sets), reps = number(exercise.reps);
      const rir = number(exercise.rir), restSeconds = number(exercise.restSeconds), required = strings(exercise.equipment), pattern = text(exercise.pattern);
      if (!name || !Number.isInteger(sets) || sets < 1 || sets > 8 || !Number.isInteger(reps) || reps < 1 || reps > 30 || !(rir >= 0 && rir <= 5) || !(restSeconds >= 15 && restSeconds <= 300)) errors.push('Nieprawidłowa recepta ćwiczenia.');
      if (!['upper', 'lower', 'core', 'skill'].includes(pattern)) errors.push('Brak wzorca ruchowego.');
      if (required.some(need => !equipment.has(need.toLocaleLowerCase()))) errors.push(`${name}: brak zadeklarowanego sprzętu.`);
      if (constraints.avoidExercises?.some(avoid => canonicalExerciseName(avoid) === canonicalExerciseName(name))) errors.push(`${name}: ćwiczenie wskazane do pominięcia.`);
      const weight = exercise.weightKg === null ? null : number(exercise.weightKg);
      if (weight !== null && (!Number.isFinite(weight) || !baseline.has(canonicalExerciseName(name)) || weight > (baseline.get(canonicalExerciseName(name)) ?? 0) * 1.1 || weight < 0)) errors.push(`${name}: brak podstaw do takiego ciężaru.`);
      if (/muscle.?up/i.test(name) && !/assist|band|gum|regres|transition|przejści/i.test(name) && !baseline.has(canonicalExerciseName(name))) errors.push('Muscle-up wymaga regresji przy braku punktu odniesienia.');
      exerciseMinutes += sets * (reps * 4 + restSeconds) / 60;
      exercises.push({ name, sets, reps, rir, restSeconds, weightKg: weight, equipment: required, pattern: pattern as PlanExercise['pattern'] });
    }
    if (warmup + cooldown + exerciseMinutes > duration) errors.push(`${date}: serie, przerwy i rozgrzewka nie mieszczą się w limicie czasu.`);
    if ((type === 'strength' || type === 'skills') && !exercises.length) errors.push('Brak ćwiczeń w sesji siłowej.');
    if (row.distanceKm != null && !(number(row.distanceKm) > 0 && number(row.distanceKm) <= 50)) errors.push('Nieprawidłowy dystans.');
    sessions.push({ key, date, type: type as TrainingSession['type'], name: text(row.name), goal: text(row.goal), durationMinutes: duration,
      warmupMinutes: warmup, cooldownMinutes: cooldown, intensity: intensity as TrainingSession['intensity'], exercises, notes: text(row.notes),
      ...(row.distanceKm != null ? { distanceKm: number(row.distanceKm) } : {}) });
  }
  if (validDate(startDate) && Number.isInteger(blockWeeks) && blockWeeks > 0 && blockWeeks <= 12) {
    for (let week = 0; week < blockWeeks; week++) {
      const from = shiftDateStr(startDate, week * 7), until = shiftDateStr(from, 7);
      if (!sessions.some(session => session.date >= from && session.date < until)) errors.push(`Brak konkretnej sesji w tygodniu ${week + 1}.`);
    }
  }
  for (const lower of sessions.filter(session => session.intensity === 'hard' && session.exercises.some(exercise => exercise.pattern === 'lower'))) {
    if (sessions.some(run => run.type === 'run' && run.intensity === 'hard' && run.date >= lower.date && run.date <= shiftDateStr(lower.date, 1))) errors.push('Ciężkie nogi kolidują z kluczowym biegiem.');
  }
  const deloadWeeks = Array.isArray(draft.deloadWeeks) ? draft.deloadWeeks.map(number) : [];
  if (deloadWeeks.some(week => !Number.isInteger(week) || week < 1 || week > blockWeeks)) errors.push('Nieprawidłowy tydzień lżejszy.');
  return { errors: [...new Set(errors)], plan: errors.length ? null : {
    title: text(draft.title), startDate, blockWeeks, progression: text(draft.progression), deloadWeeks,
    tradeoffs: strings(draft.tradeoffs), sessions,
  } };
}
