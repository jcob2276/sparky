// Barrel re-export: this file used to hold colors/types/aggregation/insights/intel-scoring
// all in one 466-line module. Split by concern into the desktop* files below; this barrel
// keeps existing `from '../desktopUtils'` imports working unchanged.
export { C } from './desktopColors';

export type {
  OuraRow,
  StravaActivitySummary,
} from './desktopDataTypes';

export { daysBefore, avg } from './desktopMath';

export {
  weeklyRunKm,
} from './desktopMetrics';

export {
  cleanIntelText,
} from './desktopIntelConfig';

export {
  computeLenieInsight,
  computeLenieStats,
  type LenieLogRow,
  type LenieStatsResult,
  type LenieHour24Slot,
} from './desktopLenieInsight';
