import type { DriverCoverage, DriverId, NightFactors } from '../../../../lib/biometrics/sleepDrivers/types';

export type FactorKey = 'caffeine' | 'meal' | 'training' | 'sauna' | 'phone' | 'pc' | 'weather' | 'sun';

export interface FactorTile {
  key: FactorKey;
  label: string;
  value: string;
  hint: string | null;
  /** `data` = a measured value; `empty` = nothing logged; `stale` = the source stopped syncing. */
  state: 'data' | 'empty' | 'stale';
}

const hours = new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 1 });

/** "3,1 h przed snem" / "40 min przed snem" — gap measured to bedtime. */
function formatGapBeforeSleep(gapH: number | null): string | null {
  if (gapH == null || !Number.isFinite(gapH) || gapH < 0) return null;
  return gapH < 1 ? `${Math.round(gapH * 60)} min przed snem` : `${hours.format(gapH)} h przed snem`;
}

function isStale(coverage: DriverCoverage[], driver: DriverId): DriverCoverage | null {
  const entry = coverage.find(c => c.driver === driver);
  return entry?.stale ? entry : null;
}

function eventTile(key: FactorKey, label: string, at: string | null, gapH: number | null, emptyHint: string): FactorTile {
  return at
    ? { key, label, value: at, hint: formatGapBeforeSleep(gapH), state: 'data' }
    : { key, label, value: 'Brak', hint: emptyHint, state: 'empty' };
}

/** Pogoda: puste pokrycie = brak lokalizacji domu, a nie „zero”. */
function weatherTiles(night: NightFactors, coverage: DriverCoverage[]): FactorTile[] {
  const hasData = (driver: DriverId) => (coverage.find(c => c.driver === driver)?.n ?? 0) > 0;
  const noLocation = !hasData('night_temp_c') && !hasData('sunshine_h');
  const emptyHint = noLocation ? 'ustaw lokalizację domu' : 'bez pomiaru';
  const weather: FactorTile = night.nightTempC != null
    ? { key: 'weather', label: 'Pogoda nocą', value: `${hours.format(night.nightTempC)} °C`, hint: night.nightHumidityPct != null ? `wilgotność ${Math.round(night.nightHumidityPct)}%` : null, state: 'data' }
    : { key: 'weather', label: 'Pogoda nocą', value: 'Brak', hint: emptyHint, state: 'empty' };
  const sun: FactorTile = night.sunshineH != null
    ? { key: 'sun', label: 'Słońce wczoraj', value: `${hours.format(night.sunshineH)} h`, hint: 'nasłonecznienia', state: 'data' }
    : { key: 'sun', label: 'Słońce wczoraj', value: 'Brak', hint: emptyHint, state: 'empty' };
  return [weather, sun];
}

/** Eight context tiles for the last night. States come only from the engine's data and coverage; no thresholds are invented. */
export function buildFactorTiles(night: NightFactors, coverage: DriverCoverage[]): FactorTile[] {
  const phoneStale = isStale(coverage, 'phone_evening_min');
  const pcStale = isStale(coverage, 'pc_active_h');
  const phone: FactorTile = phoneStale
    ? { key: 'phone', label: 'Telefon po 21:30', value: 'Brak świeżych danych', hint: phoneStale.note, state: 'stale' }
    : night.phoneEveningMin != null
      ? { key: 'phone', label: 'Telefon po 21:30', value: `${Math.round(night.phoneEveningMin)} min`, hint: null, state: 'data' }
      : { key: 'phone', label: 'Telefon po 21:30', value: 'Brak', hint: 'bez pomiaru', state: 'empty' };
  const pc: FactorTile = pcStale
    ? { key: 'pc', label: 'Komputer', value: 'Brak świeżych danych', hint: pcStale.note, state: 'stale' }
    : night.pcActiveH != null
      ? { key: 'pc', label: 'Komputer', value: `${hours.format(night.pcActiveH)} h`, hint: 'aktywności w ciągu dnia', state: 'data' }
      : { key: 'pc', label: 'Komputer', value: 'Brak', hint: 'bez pomiaru', state: 'empty' };
  return [
    eventTile('caffeine', 'Ostatnia kawa', night.caffeineLastAt, night.caffeineGapH, 'nie zapisano'),
    eventTile('meal', 'Ostatni posiłek', night.mealLastAt, night.mealGapH, 'nie zapisano'),
    eventTile('training', 'Koniec treningu', night.trainingAt, night.trainingGapH, 'nie zapisano'),
    eventTile('sauna', 'Sauna', night.saunaAt, night.saunaGapH, 'nie zapisano'),
    phone,
    pc,
    ...weatherTiles(night, coverage),
  ];
}
