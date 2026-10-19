import type { SleepStage } from './ouraSleepTimeline';

/** Everything that is placed on the shared day→night axis. */
export type DayTimelineMarkerKind = 'caffeine' | 'supplement' | 'meal' | 'workout';

export interface DayTimelineMarker {
  id: string;
  kind: DayTimelineMarkerKind;
  /** ISO timestamp (UTC); rendering converts to Europe/Warsaw. */
  at: string;
  label: string;
  /** Short secondary text, e.g. "85 mg" or "2 kapsułki". */
  detail?: string;
  /** Caffeine markers only: milligrams ingested. */
  caffeineMg?: number;
}

export interface DayTimelinePoint {
  /** ISO timestamp (UTC). */
  at: string;
  value: number;
}

export interface DayTimelineSleepSegment {
  stage: SleepStage;
  start: string;
  end: string;
}

/**
 * One continuous window: the evening/day before the night, then the night itself.
 * `nightDate` is the wake-up date (YYYY-MM-DD, Europe/Warsaw).
 */
export interface DayNightTimeline {
  nightDate: string;
  windowStart: string;
  windowEnd: string;
  /** Bedtime / wake time of the main sleep, null when no sleep was measured. */
  sleepStart: string | null;
  sleepEnd: string | null;
  sleepSegments: DayTimelineSleepSegment[];
  hr: DayTimelinePoint[];
  hrv: DayTimelinePoint[];
  /** Estimated caffeine still in the body (mg) over the window, from logged intake and a ~5 h half-life. */
  caffeineInBody: DayTimelinePoint[];
  markers: DayTimelineMarker[];
  summary: {
    lastCaffeineAt: string | null;
    totalCaffeineMg: number;
    /** Estimated mg still in the body at bedtime, null without sleep start or caffeine. */
    caffeineAtBedtimeMg: number | null;
    supplementsTaken: string[];
    lastMealAt: string | null;
  };
}
