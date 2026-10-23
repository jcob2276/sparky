import { shiftDateStr } from '../../date';
import { round } from './stats';

/** Pogoda jednego dnia lokalnego (Europe/Warsaw): 24 wartości godzinowe + nasłonecznienie dnia. */
export interface WeatherDay {
  date: string;
  hourlyTemp: Array<number | null>;
  hourlyHumidity: Array<number | null>;
  sunshineH: number | null;
}

export interface NightWeather {
  nightTempC: number | null;
  nightHumidityPct: number | null;
  sunshineH: number | null;
}

/** Noc = od 22:00 dnia D-1 do 06:00 dnia D. */
const NIGHT_START_HOUR = 22;
const NIGHT_END_HOUR = 6;

interface OpenMeteoPayload {
  hourly?: { time?: string[]; temperature_2m?: Array<number | null>; relative_humidity_2m?: Array<number | null> };
  daily?: { time?: string[]; sunshine_duration?: Array<number | null> };
}

const finite = (v: number | null | undefined): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** Odpowiedź Open-Meteo (timezone=Europe/Warsaw) => dni z godzinowymi seriami. Czysta funkcja. */
export function parseOpenMeteoDays(payload: OpenMeteoPayload): WeatherDay[] {
  const days = new Map<string, WeatherDay>();
  const day = (date: string): WeatherDay => {
    let entry = days.get(date);
    if (!entry) {
      entry = { date, hourlyTemp: Array(24).fill(null), hourlyHumidity: Array(24).fill(null), sunshineH: null };
      days.set(date, entry);
    }
    return entry;
  };
  const times = payload.hourly?.time ?? [];
  times.forEach((iso, i) => {
    const hour = Number(iso.slice(11, 13));
    if (!Number.isInteger(hour) || hour < 0 || hour > 23) return;
    const entry = day(iso.slice(0, 10));
    entry.hourlyTemp[hour] = finite(payload.hourly?.temperature_2m?.[i]);
    entry.hourlyHumidity[hour] = finite(payload.hourly?.relative_humidity_2m?.[i]);
  });
  (payload.daily?.time ?? []).forEach((date, i) => {
    const seconds = finite(payload.daily?.sunshine_duration?.[i]);
    if (seconds != null) day(date).sunshineH = round(seconds / 3600, 2);
  });
  return [...days.values()];
}

/** Scala dni z kilku zapytań; późniejsze źródło (świeższa prognoza) nadpisuje tylko niepuste wartości. */
export function mergeWeatherDays(...sources: WeatherDay[][]): WeatherDay[] {
  const merged = new Map<string, WeatherDay>();
  for (const source of sources) {
    for (const d of source) {
      const prev = merged.get(d.date);
      merged.set(d.date, prev ? {
        date: d.date,
        hourlyTemp: d.hourlyTemp.map((v, h) => v ?? prev.hourlyTemp[h]),
        hourlyHumidity: d.hourlyHumidity.map((v, h) => v ?? prev.hourlyHumidity[h]),
        sunshineH: d.sunshineH ?? prev.sunshineH,
      } : d);
    }
  }
  return [...merged.values()];
}

function meanOf(values: Array<number | null>, minCount: number): number | null {
  const present = values.filter((v): v is number => v != null);
  return present.length >= minCount ? present.reduce((s, v) => s + v, 0) / present.length : null;
}

/** Minimum godzin z pomiarem w oknie nocy, żeby uznać średnią za wiarygodną. */
const MIN_NIGHT_HOURS = 6;

/** Pogoda dla nocy kończącej się w dniu D; brak wystarczających danych => null (nie zgadujemy). */
export function nightWeather(nightDate: string, byDay: ReadonlyMap<string, WeatherDay>): NightWeather {
  const prev = byDay.get(shiftDateStr(nightDate, -1));
  const cur = byDay.get(nightDate);
  const window = (pick: (d: WeatherDay) => Array<number | null>) => [
    ...(prev ? pick(prev).slice(NIGHT_START_HOUR) : []),
    ...(cur ? pick(cur).slice(0, NIGHT_END_HOUR + 1) : []),
  ];
  const temp = meanOf(window((d) => d.hourlyTemp), MIN_NIGHT_HOURS);
  const humidity = meanOf(window((d) => d.hourlyHumidity), MIN_NIGHT_HOURS);
  return {
    nightTempC: temp == null ? null : round(temp, 1),
    nightHumidityPct: humidity == null ? null : round(humidity, 0),
    sunshineH: prev?.sunshineH ?? null,
  };
}
