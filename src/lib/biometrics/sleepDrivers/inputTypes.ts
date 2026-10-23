import type { DriverId, SleepOutcomeId } from './types';
import type { WeatherDay } from './weatherDays';

/** Noc zakończona w dniu `date` (klucz jak oura_daily_summary.day), z wynikami snu. */
export interface NightInput {
  date: string;
  bedtimeStart: string | null;
  outcomes: Record<SleepOutcomeId, number | null>;
}

export interface FoodEvent {
  name: string;
  loggedAt: string;
}

/** Trening lub sauna jako przedział czasu w ms (end >= start). */
export interface SessionSpan {
  startMs: number;
  endMs: number;
}

export interface PhoneDay {
  date: string;
  totalMin: number | null;
  /** 48 pół-godzin lokalnego dnia; null gdy brak (stary APK / historia sprzed wdrożenia). */
  buckets: number[] | null;
}

export interface PcDay {
  date: string;
  activeH: number;
}

export interface Top5Day {
  date: string;
  donePct: number;
}

export interface SleepDriversInput {
  nights: NightInput[];
  food: FoodEvent[];
  training: SessionSpan[];
  sauna: SessionSpan[];
  phone: PhoneDay[];
  pc: PcDay[];
  top5: Top5Day[];
  weather: WeatherDay[];
}

/** Godziny lokalne „HH:mm” zdarzeń wieczornych (do paska NightFactors). */
interface NightClock {
  caffeineLastAt: string | null;
  mealLastAt: string | null;
  trainingAt: string | null;
  saunaAt: string | null;
}

export interface NightRecord {
  date: string;
  bedtimeAt: string | null;
  outcomes: Record<SleepOutcomeId, number | null>;
  drivers: Record<DriverId, number | null>;
  clock: NightClock;
}
