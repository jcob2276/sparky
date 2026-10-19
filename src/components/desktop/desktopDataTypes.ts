export interface OuraRow {
  date: string;
  hrv_avg: number | null;
  rhr_avg: number | null;
  readiness_score: number | null;
  total_sleep_hours: number | null;
  sleep_score?: number | null;
  sleep_efficiency?: number | null;
}

export interface StravaActivitySummary {
  start_date: string;
  sport_type: string;
  distance: number | string | null;
  hr_avg?: number | null;
}

