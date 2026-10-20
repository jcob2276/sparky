import type { DriverId, DriverMeta, SleepOutcomeId, Top5PredictorId } from './types';

/** Jedyne źródło etykiet PL dla widoków (Dziś, Szczegóły). */
export const DRIVER_META: Record<DriverId, DriverMeta> = {
  caffeine_gap_h: { label: 'Ostatnia kawa przed snem', unit: 'h', hint: 'odstęp od ostatniej kawy do snu; im krócej, tym zwykle gorzej' },
  meal_gap_h: { label: 'Ostatni posiłek przed snem', unit: 'h', hint: 'odstęp od ostatniego posiłku do snu; im krócej, tym zwykle gorzej' },
  training_gap_h: { label: 'Trening przed snem', unit: 'h', hint: 'odstęp od końca treningu do snu; im później trening, tym zwykle gorzej' },
  sauna_gap_h: { label: 'Sauna przed snem', unit: 'h', hint: 'odstęp od końca sauny do snu; liczone tylko w dni z sauną' },
  phone_evening_min: { label: 'Telefon po 21:30', unit: 'min', hint: 'minuty przy telefonie od 21:30 do zaśnięcia; im więcej, tym zwykle gorzej' },
  phone_total_min: { label: 'Telefon w ciągu dnia', unit: 'min', hint: 'łączny czas ekranu danego dnia' },
  pc_active_h: { label: 'Czas przy komputerze', unit: 'h', hint: 'aktywny czas przy komputerze (ActivityWatch) w dniu poprzedzającym noc' },
};

export interface OutcomeMeta {
  label: string;
  unit: string;
}

export const OUTCOME_META: Record<SleepOutcomeId, OutcomeMeta> = {
  sleep_score: { label: 'wynik snu', unit: 'pkt' },
  sleep_h: { label: 'długość snu', unit: 'h' },
  sleep_efficiency: { label: 'efektywność snu', unit: 'pp' },
  deep_sleep_pct: { label: 'sen głęboki', unit: 'pp' },
  sleep_hrv: { label: 'HRV w nocy', unit: 'ms' },
  sleep_latency_min: { label: 'czas zasypiania', unit: 'min' },
};

export const TOP5_PREDICTOR_META: Record<Top5PredictorId, OutcomeMeta> = {
  sleep_h: { label: 'długość snu', unit: 'h' },
  sleep_score: { label: 'wynik snu', unit: 'pkt' },
};

export const DRIVER_IDS = Object.keys(DRIVER_META) as DriverId[];
export const OUTCOME_IDS = Object.keys(OUTCOME_META) as SleepOutcomeId[];
