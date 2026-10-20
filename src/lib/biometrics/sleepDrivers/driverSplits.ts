import type { DriverId } from './types';
import type { SplitLabels, SplitSpec } from './split';

function gapLabels(subject: string, fixed: number | null): SplitLabels & { fixedThreshold: number | null } {
  return {
    fixedThreshold: fixed,
    thresholdLabel: (t) => `${subject} ${t} h przed snem`,
    lowLabel: (t) => `mniej niż ${t} h przed snem`,
    highLabel: (t) => `${t} h lub więcej przed snem`,
  };
}

function amountLabels(subject: string, unit: string, fixed: number | null): SplitLabels & { fixedThreshold: number | null } {
  return {
    fixedThreshold: fixed,
    thresholdLabel: (t) => `${subject}: próg ${t} ${unit}`,
    lowLabel: (t) => `poniżej ${t} ${unit}`,
    highLabel: (t) => `${t} ${unit} lub więcej`,
  };
}

/** Podmiot zdania w nagłówku + progi podziału na grupy per predyktor. */
export const DRIVER_SPLITS: Record<DriverId, { subject: string; spec: SplitSpec }> = {
  caffeine_gap_h: { subject: 'Ostatnia kawa', spec: gapLabels('Kawa', 8) },
  meal_gap_h: { subject: 'Ostatni posiłek', spec: gapLabels('Posiłek', 3) },
  training_gap_h: { subject: 'Trening kończony', spec: gapLabels('Trening', 3) },
  sauna_gap_h: { subject: 'Sauna kończona', spec: gapLabels('Sauna', 2) },
  phone_evening_min: { subject: 'Telefon po 21:30', spec: amountLabels('Telefon po 21:30', 'min', 60) },
  phone_total_min: { subject: 'Telefon w ciągu dnia', spec: amountLabels('Telefon dziennie', 'min', null) },
  pc_active_h: { subject: 'Komputer', spec: amountLabels('Komputer', 'h', null) },
};
