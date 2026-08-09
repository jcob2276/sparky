export interface CalRow {
  id: string;
  event_id: string | null;
  summary: string | null;
  start_time: string | null;
  end_time: string | null;
  category: string | null;
  description?: string | null;
  location?: string | null;
  is_all_day?: boolean | null;
  reminder_minutes?: number | null;
  recurrence?: string[] | null;
  series_id?: string | null;
}
