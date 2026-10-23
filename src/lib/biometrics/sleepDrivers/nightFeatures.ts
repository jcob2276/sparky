import { estimateCaffeineMg } from '@vanguard/domain';
import { shiftDateStr } from '../../date';
import { HOUR_MS, localHHmm, parseMs } from './clock';
import { phoneEveningMinutes } from './phoneEvening';
import { nightWeather, type WeatherDay } from './weatherDays';
import type { FoodEvent, NightInput, NightRecord, PhoneDay, SessionSpan, SleepDriversInput } from './inputTypes';

/** Zdarzenia wieczorne szukamy w oknie 24 h przed zaśnięciem. */
const LOOKBACK_H = 24;

interface LastEvent {
  endMs: number;
  gapH: number;
}

function lastBefore(endTimes: number[], bedMs: number): LastEvent | null {
  let best: number | null = null;
  for (const t of endTimes) {
    if (t > bedMs || t <= bedMs - LOOKBACK_H * HOUR_MS) continue;
    if (best == null || t > best) best = t;
  }
  return best == null ? null : { endMs: best, gapH: (bedMs - best) / HOUR_MS };
}

function foodTimes(food: FoodEvent[]): Array<{ ms: number; name: string }> {
  return food.flatMap((f) => {
    const ms = parseMs(f.loggedAt);
    return ms == null ? [] : [{ ms, name: f.name }];
  });
}

export interface NightIndexes {
  food: Array<{ ms: number; name: string }>;
  caffeineMs: number[];
  trainingEnds: number[];
  saunaEnds: number[];
  phoneByDay: Map<string, PhoneDay>;
  bucketsByDay: Map<string, number[]>;
  pcByDay: Map<string, number>;
  weatherByDay: Map<string, WeatherDay>;
}

export function indexInputs(input: SleepDriversInput): NightIndexes {
  const food = foodTimes(input.food);
  const ends = (spans: SessionSpan[]) => spans.map((s) => s.endMs);
  const phoneByDay = new Map(input.phone.map((p) => [p.date, p]));
  const bucketsByDay = new Map<string, number[]>();
  for (const p of input.phone) if (p.buckets) bucketsByDay.set(p.date, p.buckets);
  return {
    food,
    caffeineMs: food.filter((f) => estimateCaffeineMg(f.name) > 0).map((f) => f.ms),
    trainingEnds: ends(input.training),
    saunaEnds: ends(input.sauna),
    phoneByDay,
    bucketsByDay,
    pcByDay: new Map(input.pc.map((p) => [p.date, p.activeH])),
    weatherByDay: new Map(input.weather.map((w) => [w.date, w])),
  };
}

const hhmm = (event: LastEvent | null) => (event ? localHHmm(event.endMs) : null);
const gap = (event: LastEvent | null) => (event ? event.gapH : null);

/**
 * Cechy jednej nocy (kończącej się w dniu D). Predyktory wieczorne z dnia D-1 względem
 * bedtime_start; brak zaśnięcia => brak predyktorów czasowych (null, nie zero).
 * Kawa i posiłek wymagają wpisów jedzenia w oknie (brak wpisów = brak wiedzy, nie „0”).
 */
export function buildNightRecord(night: NightInput, idx: NightIndexes): NightRecord {
  const prevDay = shiftDateStr(night.date, -1);
  const bedMs = parseMs(night.bedtimeStart);
  const caffeine = bedMs == null ? null : lastBefore(idx.caffeineMs, bedMs);
  const meal = bedMs == null ? null : lastBefore(idx.food.map((f) => f.ms), bedMs);
  const training = bedMs == null ? null : lastBefore(idx.trainingEnds, bedMs);
  const sauna = bedMs == null ? null : lastBefore(idx.saunaEnds, bedMs);
  const phone = idx.phoneByDay.get(prevDay);
  const weather = nightWeather(night.date, idx.weatherByDay);
  return {
    date: night.date,
    bedtimeAt: bedMs == null ? null : localHHmm(bedMs),
    outcomes: night.outcomes,
    drivers: {
      caffeine_gap_h: gap(caffeine),
      meal_gap_h: gap(meal),
      training_gap_h: gap(training),
      sauna_gap_h: gap(sauna),
      phone_evening_min: bedMs == null ? null : phoneEveningMinutes(night.date, bedMs, idx.bucketsByDay),
      phone_total_min: phone?.totalMin ?? null,
      pc_active_h: idx.pcByDay.get(prevDay) ?? null,
      night_temp_c: weather.nightTempC,
      night_humidity_pct: weather.nightHumidityPct,
      sunshine_h: weather.sunshineH,
    },
    clock: {
      caffeineLastAt: hhmm(caffeine),
      mealLastAt: hhmm(meal),
      trainingAt: hhmm(training),
      saunaAt: hhmm(sauna),
    },
  };
}
