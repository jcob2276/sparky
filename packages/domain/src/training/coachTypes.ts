/** Shared evidence contract; plans and AI estimates never become measured results. */
export type CoachRow = Record<string, unknown>;
export type EvidenceKind = 'measured' | 'self_reported' | 'estimated' | 'derived' | 'declared';
export type SignalState = 'current' | 'historical' | 'missing' | 'failed' | 'provisional';
export interface EvidenceRef {
  table: string;
  id: string;
  observedAt: string;
  kind: EvidenceKind;
}
export interface CoachSignal<T> {
  value: T | null;
  state: SignalState;
  refs: EvidenceRef[];
  error?: string;
}
export const HEALTH_COACH_SOURCES = [
  'workout_sessions', 'strava_activities_clean', 'training_plan_workouts',
  'oura_daily_summary', 'daily_strain', 'daily_nutrition', 'daily_food_entries',
  'nutrition_day_reviews', 'body_metrics', 'nutrition_profile', 'goal_kpis', 'vanguard_preferences',
] as const;
export type HealthCoachSource = typeof HEALTH_COACH_SOURCES[number];
export interface HealthCoachContext {
  asOf: string;
  localDate: string;
  windowStart: string;
  sources: Record<HealthCoachSource, CoachSignal<CoachRow[]>>;
  coverage: Record<HealthCoachSource, number>;
  queryErrors: string[];
}
