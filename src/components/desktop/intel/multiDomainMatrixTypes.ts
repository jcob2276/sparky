export type MatrixLayerId =
  | 'gym'
  | 'run'
  | 'protein'
  | 'carbs'
  | 'sleep'
  | 'readiness'
  | 'powerlist'
  | 'incident'
  | 'habits';

export interface MatrixLayerConfig {
  id: MatrixLayerId;
  label: string;
  shortLabel: string;
  icon: string;
  colorClass: string;
  badgeClass: string;
  description: string;
}

export interface DayPowerTask {
  title: string;
  done: boolean;
}

export interface DayMatrixDetail {
  date: string;
  dayOfWeek: string;
  isFuture: boolean;
  isToday: boolean;
  gym: {
    vol: number;
    name: string | null;
    exercises: string[];
    rpe: number | null;
    isWellness: boolean;
  } | null;
  run: {
    km: number;
    count: number;
  } | null;
  nutrition: {
    kcal: number | null;
    protein: number | null;
    carbs: number | null;
    fat: number | null;
  } | null;
  sleep: {
    score: number | null;
    hours: number | null;
    hrv: number | null;
    readiness: number | null;
  } | null;
  powerList: {
    done: number;
    total: number;
    tasks: DayPowerTask[];
  };
  lenie: {
    count: number;
    stimuli: string[];
    notes: string[];
  };
  habits: {
    doneCount: number;
    totalCount: number;
    names: string[];
  };
  activeLayers: MatrixLayerId[];
}

export interface MatrixCorrelationStats {
  totalDays: number;
  pastDaysCount: number;
  daysWithIncident: number;
  cleanDaysCount: number;
  avgSleepIncidentDays: number | null;
  avgSleepCleanDays: number | null;
  powerListRateIncidentDays: number | null;
  powerListRateCleanDays: number | null;
  daysWithTraining: number;
  daysWithHighProtein: number;
  daysWithHighCarbs: number;
  perfectDaysCount: number; // Days with training + protein + good sleep + clean
}
