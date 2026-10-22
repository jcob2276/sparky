import type { CoachRow, HealthCoachContext, EvidenceRef } from './coachTypes.ts';
import type { TrainingConstraints } from './healthGoals.ts';
import type { TrainingSession } from './planValidation.ts';
import { shiftDateStr } from '../date.ts';

export interface CoachDecision {
  asOf: string; localDate: string; recommendation: 'unknown' | 'keep' | 'reduce' | 'recover';
  sessionId: string | null; original: TrainingSession | null; replacement: TrainingSession | null;
  allowIncrease: boolean; reasons: string[]; missing: string[]; refs: EvidenceRef[];
}
const finite = (value: unknown): number | null => typeof value === 'number' && Number.isFinite(value) ? value : null;

/** A conservative text signal for review, never an injury diagnosis. Explicit newer corrections win. */
export function recentPainReport(context: HealthCoachContext): CoachRow | null {
  const instant = Date.parse(context.asOf);
  const reports = (context.sources.vanguard_stream.value ?? []).filter(row => {
    const stamp = Date.parse(String(row.timestamp));
    return stamp <= instant && stamp >= instant - 72 * 3600000 && typeof row.content === 'string';
  }).sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)));
  for (const row of reports) {
    const content = String(row.content).toLocaleLowerCase();
    if (!/boli|bolą|ból|bólu|kontuzj|kłuje|kluje|uraz/iu.test(content)) continue;
    const positive = content.replace(/nie boli(?: mnie)?\s+\p{L}+|nie (?:mam|odczuwam) bólu|bez bólu|brak bólu|ból (?:już )?minął/giu, '');
    if (!/boli|bolą|ból|bólu|kontuzj|kłuje|kluje|uraz/iu.test(positive)) return null;
    const preference = context.sources.vanguard_preferences.value?.find(item => item.key === 'health_coach:constraints');
    if (typeof preference?.value === 'string') {
      try {
        const confirmed = JSON.parse(preference.value);
        if (confirmed.painReported === false && Date.parse(confirmed.confirmedAt) > Date.parse(String(row.timestamp))) return null;
      } catch { /* Missing confirmation does not negate a recent report. */ }
    }
    return row;
  }
  return null;
}

function readSession(raw: unknown): TrainingSession | null {
  if (!raw || typeof raw !== 'object' || !('exercises' in raw) || !Array.isArray(raw.exercises)
    || !('name' in raw) || typeof raw.name !== 'string' || !('date' in raw) || typeof raw.date !== 'string'
    || !('durationMinutes' in raw) || typeof raw.durationMinutes !== 'number'
    || !('warmupMinutes' in raw) || typeof raw.warmupMinutes !== 'number'
    || !('cooldownMinutes' in raw) || typeof raw.cooldownMinutes !== 'number') return null;
  if (!raw.exercises.every(exercise => exercise && typeof exercise === 'object'
    && typeof exercise.name === 'string' && typeof exercise.sets === 'number' && typeof exercise.reps === 'number'
    && typeof exercise.rir === 'number' && typeof exercise.restSeconds === 'number')) return null;
  return raw as TrainingSession;
}

function lowerVolume(session: TrainingSession): TrainingSession {
  const exercises = session.exercises.map(exercise => ({ ...exercise, sets: Math.max(1, Math.floor(exercise.sets * 0.67)),
    rir: Math.max(3, exercise.rir), weightKg: null }));
  const required = exercises.reduce((minutes, exercise) => minutes + exercise.sets * (exercise.reps * 4 + exercise.restSeconds) / 60, 0);
  const durationMinutes = Math.min(session.durationMinutes, Math.max(session.warmupMinutes + session.cooldownMinutes + 5,
    Math.ceil(exercises.length ? session.warmupMinutes + session.cooldownMinutes + required : session.durationMinutes * 0.7)));
  return { ...session, intensity: 'easy', exercises, durationMinutes,
    ...(session.type === 'run' ? { distanceKm: undefined } : {}),
    notes: session.type === 'run'
      ? 'Bieg na czas: swobodny wysiłek, w którym możesz rozmawiać. Dzisiejsza propozycja zastępuje poprzednie tempo, dystans i odcinki; nie nadrabiaj ich. Zapisz rzeczywisty czas i dystans.'
      : `${session.notes}\nPropozycja na dziś: mniejsza objętość, bez dokładania ciężaru. Wpisz rzeczywiste wykonanie w loggerze.` };
}

const WARSAW_STAMP = new Intl.DateTimeFormat('pl-PL', { timeZone: 'Europe/Warsaw', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

/** Znacznik zgłoszenia w czasie Warszawy zamiast surowego ISO/UTC. */
function warsawStamp(value: unknown): string {
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? String(value) : WARSAW_STAMP.format(date);
}

export function decideTraining(context: HealthCoachContext, policy: { constraints: TrainingConstraints }): CoachDecision {
  const row = context.sources.training_plan_workouts.value?.find(row => row.planned_date === context.localDate && !row.completed && !row.skipped_at);
  const original = readSession(row?.prescription);
  const result: CoachDecision = { asOf: context.asOf, localDate: context.localDate, recommendation: 'unknown',
    sessionId: typeof row?.id === 'string' ? row.id : null, original, replacement: null, allowIncrease: false,
    reasons: [], missing: [], refs: ['training_plan_workouts', 'oura_daily_summary', 'daily_strain', 'vanguard_stream']
      .flatMap(source => context.sources[source as keyof typeof context.sources].refs.slice(0, 2)) };
  const pain = recentPainReport(context);
  if (policy.constraints.painReported || pain) {
    result.recommendation = 'recover';
    result.reasons.push(pain ? `W ostatnich 72h pojawiło się zgłoszenie bólu (${warsawStamp(pain.timestamp)}). Potwierdź jego aktualność przed ciężkim treningiem.`
      : 'Zgłoszono ból podczas ruchu. Wstrzymaj ciężką sesję i najpierw wyjaśnij ograniczenie.');
    return result;
  }
  const oura = context.sources.oura_daily_summary.value?.find(row => row.date === context.localDate);
  const sleep = finite(oura?.total_sleep_hours), readiness = finite(oura?.readiness_score);
  if (sleep == null) result.missing.push('Brak snu przypisanego do dzisiejszego dnia.');
  if (readiness == null) result.missing.push('Brak dzisiejszego wyniku regeneracji.');
  const strain = context.sources.daily_strain.value?.find(row => row.date === context.localDate);
  if (strain?.illness_level === 'high' || strain?.illness_level === 'moderate') {
    result.recommendation = 'recover'; result.reasons.push('Bieżący sygnał choroby wymaga ograniczenia wysiłku; sam wskaźnik nie jest diagnozą.'); return result;
  }
  if (!original) { result.missing.push('Brak konkretnej, niezamkniętej sesji na dziś.'); return result; }
  if (row?.started_at) { result.reasons.push('Sesja jest już rozpoczęta. Zakończ ją lub odrzuć szkic przed zmianą planu.'); return result; }
  if (!context.sources.nutrition_day_reviews.value?.some(row => row.date === context.localDate && row.completeness === 'complete')) result.reasons.push('Dziennik jedzenia nie jest zamknięty. Nie oceniam ostatecznego bilansu energii.');
  const hardRunTomorrow = context.sources.training_plan_workouts.value?.some(row => {
    const session = readSession(row.prescription);
    return !row.completed && !row.skipped_at && row.planned_date === shiftDateStr(context.localDate, 1) && session?.type === 'run' && session.intensity === 'hard';
  });
  if (hardRunTomorrow && original.intensity === 'hard' && original.exercises.some(exercise => exercise.pattern === 'lower')) {
    const upper = original.exercises.filter(exercise => exercise.pattern !== 'lower');
    result.recommendation = 'reduce'; result.reasons.push('Ciężkie nogi kolidują z jutrzejszym kluczowym biegiem.');
    result.replacement = upper.length ? lowerVolume({ ...original, exercises: upper, name: `${original.name} — bez ciężkich nóg` })
      : { ...original, type: 'mobility', name: 'Spokojny spacer', intensity: 'easy', exercises: [], durationMinutes: 20,
        warmupMinutes: 0, cooldownMinutes: 0, notes: 'Zamiast ciężkich nóg przed kluczowym biegiem: opcjonalny spokojny spacer.' };
  } else if (result.missing.length) {
    result.reasons.push('Bez bieżących danych nie potwierdzam gotowości do zwiększania obciążenia.');
    result.replacement = lowerVolume(original);
  } else if (sleep! < 6 || readiness! < 60) {
    result.recommendation = 'reduce'; result.reasons.push(`Dzisiejsze dane: sen ${sleep}h, regeneracja ${readiness}. Proponuję mniejszą objętość.`);
    result.replacement = lowerVolume(original);
  } else {
    result.recommendation = 'keep'; result.reasons.push(`Dzisiejsze dane: sen ${sleep}h, regeneracja ${readiness}. Zachowaj ustaloną sesję; progresję oprzyj na wykonanych seriach.`);
  }
  return result;
}
