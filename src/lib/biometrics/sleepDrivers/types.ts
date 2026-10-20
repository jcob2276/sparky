/**
 * @file types.ts
 * @role Wspólny kontrakt silnika „co wpływa na Twój sen” (Oura /oura: zakładki Dziś i Szczegóły).
 * Silnik (A) produkuje te typy, widoki (B, C) tylko je czytają. Nie łam kształtu bez uzgodnienia.
 *
 * Konwencja czasu: noc = noc ZAKOŃCZONA w dniu D (klucz D jak w oura_daily_summary.day).
 * Predyktory wieczorne pochodzą z dnia D-1 (czas ścienny Europe/Warsaw), mierzone względem
 * początku snu (bedtime_start). Wynik dnia (Top 5) dotyczy dnia D.
 */

export type DriverId =
  | 'caffeine_gap_h'
  | 'meal_gap_h'
  | 'training_gap_h'
  | 'sauna_gap_h'
  | 'phone_evening_min'
  | 'phone_total_min'
  | 'pc_active_h';

export type SleepOutcomeId =
  | 'sleep_score'
  | 'sleep_h'
  | 'sleep_efficiency'
  | 'deep_sleep_pct'
  | 'sleep_hrv'
  | 'sleep_latency_min';

export type Top5PredictorId = 'sleep_h' | 'sleep_score';

export type EvidenceStrength = 'confirmed' | 'probable' | 'tentative' | 'insufficient';

/** Kierunek z punktu widzenia użytkownika (czy to pomaga czy szkodzi wynikowi). */
export type EffectDirection = 'helps' | 'hurts' | 'unclear';

export interface SplitComparison {
  /** np. „Kawa ≥ 8 h przed snem” */
  thresholdLabel: string;
  lowLabel: string;
  highLabel: string;
  lowN: number;
  highN: number;
  lowMean: number;
  highMean: number;
  /** highMean − lowMean w jednostce wyniku */
  delta: number;
}

export interface DriverEffect {
  /** `${driver}:${outcome}` */
  id: string;
  driver: DriverId;
  outcome: SleepOutcomeId;
  n: number;
  /** Spearman rho; null gdy za mało danych */
  rho: number | null;
  pValue: number | null;
  strength: EvidenceStrength;
  direction: EffectDirection;
  split: SplitComparison | null;
  /** Jedno zdanie po polsku, bez żargonu, np. „Trening kończony < 3 h przed snem: sen głęboki −3 pp”. */
  headline: string;
}

export interface SleepToTop5Effect {
  predictor: Top5PredictorId;
  n: number;
  rho: number | null;
  pValue: number | null;
  strength: EvidenceStrength;
  direction: EffectDirection;
  split: SplitComparison | null;
  headline: string;
}

export interface DriverCoverage {
  driver: DriverId;
  /** liczba nocy z danymi predyktora w analizowanym oknie */
  n: number;
  firstDate: string | null;
  lastDate: string | null;
  /** true gdy ostatnie dane są starsze niż 14 dni względem ostatniej nocy */
  stale: boolean;
  /** uczciwy komunikat po polsku, np. „ActivityWatch nie synchronizuje się od 2026-06-10” */
  note: string | null;
}

/** Czynniki ostatniej nocy do paska na zakładce Dziś. Czasy jako lokalne „HH:mm” (Warsaw). */
export interface NightFactors {
  date: string;
  bedtimeAt: string | null;
  caffeineLastAt: string | null;
  caffeineGapH: number | null;
  mealLastAt: string | null;
  mealGapH: number | null;
  trainingAt: string | null;
  trainingGapH: number | null;
  saunaAt: string | null;
  saunaGapH: number | null;
  phoneEveningMin: number | null;
  phoneTotalMin: number | null;
  pcActiveH: number | null;
}

export interface SleepDriversResult {
  nightsAnalyzed: number;
  effects: DriverEffect[];
  top5Effects: SleepToTop5Effect[];
  coverage: DriverCoverage[];
  lastNight: NightFactors | null;
}

export interface UseSleepDriversResult {
  data: SleepDriversResult | null;
  isLoading: boolean;
  error: Error | null;
}

/** Polskie etykiety i jednostki — jedno źródło dla obu zakładek. Wypełnia silnik (A). */
export interface DriverMeta {
  label: string;
  unit: string;
  /** „im więcej tym gorzej” / „im później tym gorzej” — do opisu osi */
  hint: string;
}
