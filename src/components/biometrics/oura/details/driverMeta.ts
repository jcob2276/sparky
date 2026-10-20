import type { DriverId, SleepOutcomeId } from '../../../../lib/biometrics/sleepDrivers/types';

export { DRIVER_META, OUTCOME_META } from '../../../../lib/biometrics/sleepDrivers/meta';

/** Kolejność kart: od pór dnia (trening, sauna, posiłek, kawa) do ekranów. */
export const DRIVER_ORDER: DriverId[] = [
  'training_gap_h', 'sauna_gap_h', 'meal_gap_h', 'caffeine_gap_h',
  'phone_evening_min', 'phone_total_min', 'pc_active_h',
];

/** Etykiety z silnika są małą literą — do nagłówków kart. */
export const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

export const OUTCOME_ORDER: SleepOutcomeId[] = [
  'sleep_score', 'sleep_h', 'sleep_efficiency', 'deep_sleep_pct', 'sleep_hrv', 'sleep_latency_min',
];
