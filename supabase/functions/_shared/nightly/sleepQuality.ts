import { clamp, mean, sampleSD } from './baselines.ts';

export interface SleepNightRow {
  date: string;
  total_sleep_hours?: number | string | null;
  deep_sleep_hours?: number | string | null;
  rem_sleep_hours?: number | string | null;
  sleep_efficiency?: number | string | null;
  latency_minutes?: number | string | null;
  bedtime_timestamp?: string | null;
}

export interface SleepQuality {
  /** Ważone odchylenie jakości snu od Twojej normy (dodatnie = lepiej). */
  z: number;
  parts: Record<string, number>;
}

const num = (v: unknown): number | null => (v == null || v === '' ? null : Number.isFinite(Number(v)) ? Number(v) : null);

/** Minuty od 12:00, żeby 23:00 i 01:00 leżały obok siebie; strefa Warszawy, bo tam zasypiasz. */
function bedtimeMinutes(ts: string | null | undefined): number | null {
  if (!ts) return null;
  const d = new Date(ts.replace(' ', 'T').replace(/\+00$/, 'Z'));
  if (Number.isNaN(d.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Warsaw', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(d);
  const h = Number(parts.find((p) => p.type === 'hour')?.value);
  const m = Number(parts.find((p) => p.type === 'minute')?.value);
  return (h * 60 + m + 720) % 1440;
}

const WEIGHTS = { deep: 0.28, rem: 0.24, efficiency: 0.18, latency: 0.1, regularity: 0.12, duration: 0.08 };
/** Najmniejszy rozrzut uznawany za realny, żeby drobna zmiana nie wyglądała na wielkie odchylenie. */
const SD_FLOOR = { deep: 0.02, rem: 0.02, efficiency: 2, latency: 4, duration: 0.4 };
const MIN_HISTORY = 14;
const WINDOW = 60;

interface Night { deepPct: number | null; remPct: number | null; eff: number | null; lat: number | null; hours: number | null; bed: number | null }

function toNight(r: SleepNightRow): Night {
  const hours = num(r.total_sleep_hours);
  const deep = num(r.deep_sleep_hours);
  const rem = num(r.rem_sleep_hours);
  return {
    hours,
    deepPct: hours && deep != null ? deep / hours : null,
    remPct: hours && rem != null ? rem / hours : null,
    eff: num(r.sleep_efficiency),
    lat: num(r.latency_minutes),
    bed: bedtimeMinutes(r.bedtime_timestamp),
  };
}

/**
 * Jakość snu z fazy głębokiej, REM, efektywności, czasu zasypiania i regularności pory snu.
 * Każdy składnik jest porównany z Twoją własną normą z ostatnich 60 nocy, a czas snu waży tylko tyle,
 * żeby bardzo krótka noc nie wyglądała dobrze dzięki samym proporcjom faz.
 */
export function computeSleepQuality(rows: SleepNightRow[], date: string): SleepQuality | null {
  const sorted = [...rows].sort((a, b) => a.date.localeCompare(b.date));
  const today = sorted.find((r) => r.date === date);
  if (!today) return null;
  const history = sorted.filter((r) => r.date < date).slice(-WINDOW).map(toNight);
  if (history.length < MIN_HISTORY) return null;
  const night = toNight(today);

  const parts: Record<string, number> = {};
  const personalZ = (key: keyof typeof SD_FLOOR, value: number | null, pick: (n: Night) => number | null, higherBetter: boolean) => {
    if (value == null) return;
    const past = history.map(pick).filter((v): v is number => v != null);
    if (past.length < MIN_HISTORY) return;
    const m = mean(past);
    const sd = sampleSD(past);
    if (m == null || sd == null) return;
    const z = ((higherBetter ? value - m : m - value) / Math.max(sd, SD_FLOOR[key]));
    parts[key] = Math.round(clamp(z, -3, 3) * 100) / 100;
  };

  personalZ('deep', night.deepPct, (n) => n.deepPct, true);
  personalZ('rem', night.remPct, (n) => n.remPct, true);
  personalZ('efficiency', night.eff, (n) => n.eff, true);
  personalZ('latency', night.lat, (n) => n.lat, false);
  personalZ('duration', night.hours, (n) => n.hours, true);

  // Regularność: rozrzut pory zasypiania z ostatnich 7 nocy (łącznie z dzisiejszą).
  const recentBeds = [...sorted.filter((r) => r.date <= date).slice(-7)].map((r) => bedtimeMinutes(r.bedtime_timestamp)).filter((v): v is number => v != null);
  if (recentBeds.length >= 4) {
    const sd = sampleSD(recentBeds);
    if (sd != null) parts.regularity = Math.round(clamp((45 - sd) / 30, -2, 2) * 100) / 100;
  }

  let sum = 0;
  let weight = 0;
  for (const [key, z] of Object.entries(parts)) {
    const w = WEIGHTS[key as keyof typeof WEIGHTS];
    sum += w * z;
    weight += w;
  }
  // Bez fazy głębokiej i REM nie udajemy, że oceniliśmy jakość.
  if (weight < 0.5 || parts.deep == null || parts.rem == null) return null;
  return { z: Math.round((sum / weight) * 100) / 100, parts };
}
