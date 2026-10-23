import { shiftDateStr } from '../../date';
import { mergeWeatherDays, parseOpenMeteoDays, type WeatherDay } from './weatherDays';

const HOURLY = 'temperature_2m,relative_humidity_2m';
const ARCHIVE_LAG_DAYS = 6;
const RECENT_PAST_DAYS = 10;

async function fetchJson(url: string, signal?: AbortSignal): Promise<Parameters<typeof parseOpenMeteoDays>[0]> {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
  return res.json();
}

/**
 * Historia pogody dla lokalizacji domu: archiwum Open-Meteo (do ~6 dni wstecz) + prognoza z past_days
 * dla najświeższych dni. Brak pogody nie może psuć analizy snu, więc błąd => pusta lista.
 */
export async function fetchWeatherHistory(lat: number, lng: number, since: string, today: string, signal?: AbortSignal): Promise<WeatherDay[]> {
  const base = `latitude=${lat}&longitude=${lng}&hourly=${HOURLY}&daily=sunshine_duration&timezone=Europe%2FWarsaw`;
  const archiveEnd = shiftDateStr(today, -ARCHIVE_LAG_DAYS);
  try {
    const [archive, recent] = await Promise.all([
      archiveEnd >= since
        ? fetchJson(`https://archive-api.open-meteo.com/v1/archive?${base}&start_date=${since}&end_date=${archiveEnd}`, signal)
        : Promise.resolve({}),
      fetchJson(`https://api.open-meteo.com/v1/forecast?${base}&past_days=${RECENT_PAST_DAYS}&forecast_days=1`, signal),
    ]);
    return mergeWeatherDays(parseOpenMeteoDays(archive), parseOpenMeteoDays(recent));
  } catch (err) {
    console.warn('[SleepDrivers] weather history unavailable:', err);
    return [];
  }
}
