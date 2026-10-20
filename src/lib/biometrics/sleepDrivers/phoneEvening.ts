import { shiftDateStr } from '../../date';
import { localDay, localMinutesOfDay } from './clock';

/** Początek okna wieczornego: 21:30 = bucket 43 (indeks 0 = 00:00–00:30). */
const EVENING_START_BUCKET = 43;
const BUCKET_MIN = 30;

function bucketSum(buckets: number[], fromBucket: number, untilMinute: number): number {
  let total = 0;
  for (let i = fromBucket; i < buckets.length; i++) {
    const start = i * BUCKET_MIN;
    const covered = Math.min(Math.max(untilMinute - start, 0), BUCKET_MIN);
    if (covered === 0) break;
    total += buckets[i] * (covered / BUCKET_MIN);
  }
  return total;
}

/**
 * Minuty telefonu od 21:30 dnia D-1 do zaśnięcia (bedtime_start) dla nocy kończącej się w dniu D.
 * `bucketsByDay` zawiera tylko dni z poprawnym usage_buckets. Brak potrzebnego dnia => null
 * (nie zgadujemy). Ostatni, częściowy bucket liczony proporcjonalnie.
 */
export function phoneEveningMinutes(
  nightDate: string,
  bedtimeMs: number,
  bucketsByDay: ReadonlyMap<string, number[]>,
): number | null {
  const prevDay = shiftDateStr(nightDate, -1);
  const bedDay = localDay(bedtimeMs);
  const bedMinute = localMinutesOfDay(bedtimeMs);
  const prev = bucketsByDay.get(prevDay);
  if (!prev) return null;
  if (bedDay === prevDay) return Math.round(bucketSum(prev, EVENING_START_BUCKET, bedMinute));
  if (bedDay !== nightDate) return null;
  const day = bucketsByDay.get(nightDate);
  if (!day) return null;
  const beforeMidnight = bucketSum(prev, EVENING_START_BUCKET, 24 * 60);
  return Math.round(beforeMidnight + bucketSum(day, 0, bedMinute));
}
