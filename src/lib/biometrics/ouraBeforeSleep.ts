import type { DayNightTimeline } from './ouraDayTimeline.types';

export interface BeforeSleepFact {
  key: 'meal' | 'workout' | 'supplements';
  label: string;
  value: string;
  /** Short context, e.g. how long before bedtime it happened. */
  hint: string | null;
}

const WARSAW_TIME = new Intl.DateTimeFormat('pl-PL', {
  timeZone: 'Europe/Warsaw',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

function clock(iso: string): string {
  return WARSAW_TIME.format(new Date(iso));
}

function gapBeforeSleep(eventIso: string, sleepStartIso: string | null): string | null {
  if (!sleepStartIso) return null;
  const minutes = Math.round((new Date(sleepStartIso).getTime() - new Date(eventIso).getTime()) / 60000);
  if (!Number.isFinite(minutes) || minutes < 0) return null;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const text = hours ? `${hours} h${rest ? ` ${rest} min` : ''}` : `${rest} min`;
  return `${text} przed snem`;
}

/** Facts about the evening before the night, taken only from logged data (no causal claims). */
export function buildBeforeSleepFacts(timeline: DayNightTimeline): BeforeSleepFact[] {
  const facts: BeforeSleepFact[] = [];
  const { lastMealAt, supplementsTaken } = timeline.summary;

  facts.push(lastMealAt
    ? { key: 'meal', label: 'Ostatni posiłek', value: clock(lastMealAt), hint: gapBeforeSleep(lastMealAt, timeline.sleepStart) }
    : { key: 'meal', label: 'Ostatni posiłek', value: 'brak wpisu', hint: null });

  const workout = [...timeline.markers]
    .filter((marker) => marker.kind === 'workout' && (!timeline.sleepStart || marker.at <= timeline.sleepStart))
    .sort((a, b) => b.at.localeCompare(a.at))[0];
  facts.push(workout
    ? { key: 'workout', label: 'Trening', value: `${workout.label} · ${clock(workout.at)}`, hint: gapBeforeSleep(workout.at, timeline.sleepStart) }
    : { key: 'workout', label: 'Trening', value: 'nie zapisano', hint: null });

  facts.push({
    key: 'supplements',
    label: 'Suplementy',
    value: supplementsTaken.length ? supplementsTaken.join(', ') : 'nie zaznaczono',
    hint: null,
  });
  return facts;
}
