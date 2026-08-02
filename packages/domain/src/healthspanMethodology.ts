import type { HealthspanContributorKey, HealthspanInput } from './healthspan';

export const HEALTHSPAN_MODEL_VERSION = 'healthspan-v2' as const;

export type HealthspanEvidenceClass =
  | 'guideline'
  | 'consensus'
  | 'cohort'
  | 'observational';

export interface ContributorMethodology {
  key: HealthspanContributorKey;
  label: string;
  inputKey: keyof HealthspanInput;
  unit: string;
  benchmark: string;
  sourceTitle: string;
  sourceUrl: string;
  evidenceClass: HealthspanEvidenceClass;
  minimumSamples: number;
  staleAfterDays: number;
  weight: number;
  maxAgeImpactYears: number;
}

const WHO_ACTIVITY_SOURCE = 'https://www.who.int/publications/i/item/9789240014886';
const AASM_SLEEP_SOURCE = 'https://aasm.org/resources/pdf/pressroom/adult-sleep-duration-consensus.pdf';
const JACC_FITNESS_SOURCE = 'https://www.jacc.org/doi/10.1016/j.jacc.2018.08.2166';
const AHA_LIFE_SOURCE = 'https://doi.org/10.1161/CIR.0000000000001078';

export const HEALTHSPAN_METHODOLOGY: Record<HealthspanContributorKey, ContributorMethodology> = {
  cardio_fitness: {
    key: 'cardio_fitness', label: 'Wydolność VO₂ max', inputKey: 'vo2Max', unit: 'ml/kg/min',
    benchmark: 'Zakres zależny od wieku, płci i rodzaju pomiaru',
    sourceTitle: 'Cardiorespiratory Fitness and Mortality in Healthy Men and Women',
    sourceUrl: JACC_FITNESS_SOURCE, evidenceClass: 'cohort',
    minimumSamples: 1, staleAfterDays: 45, weight: 1.5, maxAgeImpactYears: 5,
  },
  resting_heart_rate: {
    key: 'resting_heart_rate', label: 'Tętno spoczynkowe', inputKey: 'restingHeartRate', unit: 'bpm',
    benchmark: 'Trend osobisty; zakres referencyjny nie jest diagnozą',
    sourceTitle: 'Life’s Essential 8', sourceUrl: AHA_LIFE_SOURCE, evidenceClass: 'guideline',
    minimumSamples: 7, staleAfterDays: 14, weight: 1, maxAgeImpactYears: 2,
  },
  sleep_duration: {
    key: 'sleep_duration', label: 'Długość snu', inputKey: 'sleepDurationHours', unit: 'h',
    benchmark: 'Regularnie co najmniej 7 godzin dla zdrowych dorosłych',
    sourceTitle: 'AASM/SRS adult sleep duration consensus',
    sourceUrl: AASM_SLEEP_SOURCE, evidenceClass: 'consensus',
    minimumSamples: 7, staleAfterDays: 14, weight: 1, maxAgeImpactYears: 2,
  },
  sleep_regularity: {
    key: 'sleep_regularity', label: 'Regularność snu', inputKey: 'sleepRegularity', unit: 'score',
    benchmark: 'Stabilność pory snu względem własnego trendu',
    sourceTitle: 'AASM/SRS adult sleep duration consensus',
    sourceUrl: AASM_SLEEP_SOURCE, evidenceClass: 'observational',
    minimumSamples: 7, staleAfterDays: 14, weight: 1, maxAgeImpactYears: 2,
  },
  daily_movement: {
    key: 'daily_movement', label: 'Codzienny ruch', inputKey: 'stepsDaily', unit: 'steps/day',
    benchmark: 'Ruch codzienny jako uzupełnienie aktywności tygodniowej',
    sourceTitle: 'WHO physical activity guidelines',
    sourceUrl: WHO_ACTIVITY_SOURCE, evidenceClass: 'guideline',
    minimumSamples: 7, staleAfterDays: 14, weight: 0.8, maxAgeImpactYears: 1.5,
  },
  aerobic_activity: {
    key: 'aerobic_activity', label: 'Aktywność aerobowa', inputKey: 'moderateVigorousMinutesWeekly', unit: 'min/week',
    benchmark: '150–300 minut umiarkowanej aktywności tygodniowo lub ekwiwalent',
    sourceTitle: 'WHO physical activity guidelines',
    sourceUrl: WHO_ACTIVITY_SOURCE, evidenceClass: 'guideline',
    minimumSamples: 1, staleAfterDays: 21, weight: 1, maxAgeImpactYears: 2,
  },
  strength: {
    key: 'strength', label: 'Trening siłowy', inputKey: 'strengthDaysWeekly', unit: 'days/week',
    benchmark: 'Ćwiczenia głównych grup mięśni co najmniej 2 dni w tygodniu',
    sourceTitle: 'WHO physical activity guidelines',
    sourceUrl: WHO_ACTIVITY_SOURCE, evidenceClass: 'guideline',
    minimumSamples: 1, staleAfterDays: 21, weight: 0.9, maxAgeImpactYears: 1.5,
  },
  body_composition: {
    key: 'body_composition', label: 'Skład ciała', inputKey: 'bodyComposition', unit: '% body fat',
    benchmark: 'Trend osobisty i zakres funkcjonalny zależny od płci',
    sourceTitle: 'Life’s Essential 8', sourceUrl: AHA_LIFE_SOURCE, evidenceClass: 'guideline',
    minimumSamples: 1, staleAfterDays: 60, weight: 0.7, maxAgeImpactYears: 1.5,
  },
  stress_recovery: {
    key: 'stress_recovery', label: 'Bilans stres–regeneracja', inputKey: 'stressRecoveryBalance', unit: 'score',
    benchmark: 'Własny baseline z pomiarów podłużnych',
    sourceTitle: 'Life’s Essential 8', sourceUrl: AHA_LIFE_SOURCE, evidenceClass: 'observational',
    minimumSamples: 7, staleAfterDays: 14, weight: 0.8, maxAgeImpactYears: 1.5,
  },
  lifestyle: {
    key: 'lifestyle', label: 'Styl życia', inputKey: 'lifestyle', unit: 'score',
    benchmark: 'Żywienie i alkohol wyłącznie na podstawie zapisanych danych',
    sourceTitle: 'Life’s Essential 8', sourceUrl: AHA_LIFE_SOURCE, evidenceClass: 'guideline',
    minimumSamples: 1, staleAfterDays: 21, weight: 0.7, maxAgeImpactYears: 1.5,
  },
  social_connection: {
    key: 'social_connection', label: 'Relacje i połączenie społeczne', inputKey: 'socialConnection', unit: 'score',
    benchmark: 'Regularny jakościowy kontakt względem własnego baseline',
    sourceTitle: 'Social relationships and mortality risk meta-analysis',
    sourceUrl: 'https://doi.org/10.1371/journal.pmed.1000316', evidenceClass: 'observational',
    minimumSamples: 1, staleAfterDays: 21, weight: 0.5, maxAgeImpactYears: 1,
  },
};

const clamp = (value: number) => Math.max(0, Math.min(100, value));

export function scoreContributorValue(
  key: HealthspanContributorKey,
  value: number,
  context: { age: number; sex: 'M' | 'F' },
): number {
  switch (key) {
    case 'cardio_fitness': {
      const target = (context.sex === 'M' ? 50 : 43) - Math.max(0, context.age - 30) * 0.35;
      return clamp(50 + (Math.max(15, Math.min(75, value)) - target) * 4);
    }
    case 'resting_heart_rate': return clamp(100 - Math.abs(Math.max(40, Math.min(100, value)) - 55) * 2.5);
    case 'sleep_duration': return value >= 7 ? 100 : clamp(100 - (7 - value) * 25);
    case 'sleep_regularity':
    case 'stress_recovery':
    case 'lifestyle':
    case 'social_connection': return clamp(value);
    case 'daily_movement': return clamp(20 + (Math.max(2_000, Math.min(10_000, value)) - 2_000) / 100);
    case 'aerobic_activity': return value >= 300 ? 100 : clamp((value / 150) * 80);
    case 'strength': return clamp((value / 2) * 100);
    case 'body_composition': {
      const center = context.sex === 'M' ? 17 : 25;
      return clamp(100 - Math.abs(Math.max(5, Math.min(50, value)) - center) * 4);
    }
  }
}
