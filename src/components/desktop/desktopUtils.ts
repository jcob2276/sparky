// Barrel re-export: this file used to hold colors/types/aggregation/insights/intel-scoring
// all in one 466-line module. Split by concern into the desktop* files below; this barrel
// keeps existing `from '../desktopUtils'` imports working unchanged.
export { isLogWellness } from '../biometrics/workout/workoutUtils';

export { C } from './desktopColors';

export type {
  OuraRow,
  WorkoutSessionSummary,
  StravaActivitySummary,
  NutritionDayRow,
  IntelCard,
} from './desktopDataTypes';

export { daysBefore, avg } from './desktopMath';

export {
  weeklyVolume,
  weeklyRunKm,
  SPRINT_SEASON,
  getSprintInfo,
  sprintMetrics,
} from './desktopMetrics';

export { computeNarrativeInsights } from './desktopNarrativeInsights';

export {
  INTEL_CFG,
  cleanIntelText,
  isUsefulIntelCard,
  intelScore,
} from './desktopIntelConfig';

export {
  computeLenieInsight,
  computeLenieStats,
  type LenieLogRow,
  type LenieStatsResult,
  type LenieHour24Slot,
  type LeniePatternInsight,
  type LenieRecentLogDisplay,
} from './desktopLenieInsight';
