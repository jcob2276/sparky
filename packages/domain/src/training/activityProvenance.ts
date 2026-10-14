export interface ActivityProvenance {
  source?: unknown;
  hr_source?: unknown;
  icu_hr_zone_times?: unknown;
  gc_hr_zones?: unknown;
}

/** The activity importer and HR sensor are separate provenance fields. */
export function activitySourceLabel(activity: ActivityProvenance): string {
  if (activity.source === 'garmin_intervals') return 'Garmin przez Intervals.icu';
  if (activity.source === 'strava') return 'Strava';
  if (activity.source === 'oura') return 'Oura';
  return 'Źródło nieznane';
}

/** Durations in source-configured zones, not inferred BPM thresholds. */
export function activityHeartRateZones(activity: ActivityProvenance): number[] {
  const raw = activity.icu_hr_zone_times;
  if (Array.isArray(raw) && raw.length && raw.every(value => typeof value === 'number' && Number.isFinite(value) && value >= 0)) return raw;
  const gc = activity.gc_hr_zones;
  if (!Array.isArray(gc) || !gc.length) return [];
  const seconds: unknown[] = gc.map(zone => zone && typeof zone === 'object' ? zone.secsInZone : null);
  return seconds.every((value): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0) ? seconds : [];
}
