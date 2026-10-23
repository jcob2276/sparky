import { describe, expect, it } from 'vitest';
import { mergeWeatherDays, nightWeather, parseOpenMeteoDays, type WeatherDay } from './weatherDays';

function hourly(date: string, temp: (h: number) => number, hum: (h: number) => number) {
  const time = Array.from({ length: 24 }, (_, h) => `${date}T${String(h).padStart(2, '0')}:00`);
  return { time, temperature_2m: time.map((_, h) => temp(h)), relative_humidity_2m: time.map((_, h) => hum(h)) };
}

describe('parseOpenMeteoDays', () => {
  it('groups hourly values per day and converts sunshine seconds to hours', () => {
    const a = hourly('2026-10-21', () => 10, () => 80);
    const b = hourly('2026-10-22', () => 8, () => 90);
    const days = parseOpenMeteoDays({
      hourly: { time: [...a.time, ...b.time], temperature_2m: [...a.temperature_2m, ...b.temperature_2m], relative_humidity_2m: [...a.relative_humidity_2m, ...b.relative_humidity_2m] },
      daily: { time: ['2026-10-21'], sunshine_duration: [18_000] },
    });
    expect(days.map((d) => d.date)).toEqual(['2026-10-21', '2026-10-22']);
    expect(days[0].sunshineH).toBe(5);
    expect(days[1].sunshineH).toBeNull();
    expect(days[1].hourlyTemp[3]).toBe(8);
  });
});

describe('nightWeather', () => {
  const day = (date: string, t: number, h: number, sun: number | null): WeatherDay => ({
    date, hourlyTemp: Array(24).fill(t), hourlyHumidity: Array(24).fill(h), sunshineH: sun,
  });

  it('averages 22:00 of D-1 through 06:00 of D and takes sunshine from D-1', () => {
    const w = nightWeather('2026-10-22', new Map([['2026-10-21', day('2026-10-21', 10, 80, 5)], ['2026-10-22', day('2026-10-22', 6, 90, 1)]]));
    expect(w.nightTempC).toBe(6.9); // (2 * 10 + 7 * 6) / 9
    expect(w.sunshineH).toBe(5);
  });

  it('returns null instead of guessing without enough hours', () => {
    const w = nightWeather('2026-10-22', new Map([['2026-10-22', { ...day('2026-10-22', 6, 90, 1), hourlyTemp: [6, 6, 6, ...Array(21).fill(null)], hourlyHumidity: Array(24).fill(null) }]]));
    expect(w).toEqual({ nightTempC: null, nightHumidityPct: null, sunshineH: null });
  });
});

describe('mergeWeatherDays', () => {
  it('lets a later source fill gaps without erasing earlier values', () => {
    const earlier: WeatherDay = { date: 'd', hourlyTemp: [1, null], hourlyHumidity: [null, null], sunshineH: 2 };
    const later: WeatherDay = { date: 'd', hourlyTemp: [null, 5], hourlyHumidity: [70, null], sunshineH: null };
    expect(mergeWeatherDays([earlier], [later])[0]).toEqual({ date: 'd', hourlyTemp: [1, 5], hourlyHumidity: [70, null], sunshineH: 2 });
  });
});
