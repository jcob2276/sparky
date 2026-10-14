/**
 * @file dayTimeline.ts
 * @role Chronologiczna 24-godzinna oś czasu dnia (Combined Day Timeline) w stylu Bevel / Whoop.
 * Gromadzi sesje snu, aktywności biegowe Garmin, treningi siłowe i okresy regeneracji w jeden spójny strumień.
 */

export interface RawTimelineActivity {
  id?: string;
  name?: string | null;
  sport_type?: string | null;
  start_date?: string | null;
  distance?: number | null;
  moving_time?: number | null;
  average_heartrate?: number | null;
  hr_max?: number | null;
  source?: string | null;
}

export interface RawTimelineSleep {
  bedtime_start?: string | null;
  bedtime_end?: string | null;
  sleep_score?: number | null;
  total_sleep_hours?: number | null;
  deep_sleep_hours?: number | null;
  rem_sleep_hours?: number | null;
  hrv_average?: number | null;
}

export interface RawTimelineWorkout {
  id: string;
  name?: string | null;
  date: string;
  total_volume_kg?: number | null;
  sets_count?: number | null;
}

export interface DayTimelineItem {
  id: string;
  type: 'sleep' | 'running' | 'workout' | 'restorative' | 'stress_event';
  title: string;
  timeFormatted: string;
  durationFormatted: string;
  metrics: Array<{ label: string; value: string }>;
  accentColor: 'indigo' | 'orange' | 'green' | 'red' | 'blue';
  timestamp: number; // do sortowania
}

export function buildDayTimeline(options: {
  date: string; // YYYY-MM-DD
  sleep?: RawTimelineSleep | null;
  activities?: RawTimelineActivity[] | null;
  workouts?: RawTimelineWorkout[] | null;
  recoveryHighMinutes?: number | null;
  stressHighMinutes?: number | null;
}): DayTimelineItem[] {
  const items: DayTimelineItem[] = [];

  // 1. Sesja snu
  if (options.sleep && options.sleep.bedtime_start) {
    const start = new Date(options.sleep.bedtime_start);
    const end = options.sleep.bedtime_end ? new Date(options.sleep.bedtime_end) : null;
    const timeFormatted = `${start.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}${
      end ? ` – ${end.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}` : ''
    }`;

    const durationMin = end ? Math.round((end.getTime() - start.getTime()) / (60 * 1000)) : Math.round((options.sleep.total_sleep_hours ?? 7) * 60);
    const h = Math.floor(durationMin / 60);
    const m = durationMin % 60;

    const metrics: Array<{ label: string; value: string }> = [];
    if (options.sleep.sleep_score != null) {
      metrics.push({ label: 'Wynik', value: `${options.sleep.sleep_score}` });
    }
    if (options.sleep.hrv_average != null) {
      metrics.push({ label: 'HRV', value: `${Math.round(options.sleep.hrv_average)} ms` });
    }
    if (options.sleep.deep_sleep_hours != null) {
      metrics.push({ label: 'Głęboki', value: `${options.sleep.deep_sleep_hours.toFixed(1)}h` });
    }

    items.push({
      id: `sleep-${start.getTime()}`,
      type: 'sleep',
      title: 'Główny sen',
      timeFormatted,
      durationFormatted: `${h}h ${m}m`,
      metrics,
      accentColor: 'indigo',
      timestamp: start.getTime(),
    });
  }

  // 2. Aktywności (Garmin / Bieganie / Rower)
  if (options.activities && options.activities.length > 0) {
    options.activities.forEach((act, idx) => {
      const actDate = act.start_date ? new Date(act.start_date) : new Date(`${options.date}T12:00:00Z`);
      const durSec = act.moving_time ?? 0;
      const durMin = Math.round(durSec / 60);
      const distKm = act.distance ? (act.distance / 1000).toFixed(2) : null;

      const metrics: Array<{ label: string; value: string }> = [];
      if (distKm) metrics.push({ label: 'Dystans', value: `${distKm} km` });
      if (act.average_heartrate) metrics.push({ label: 'Śr. HR', value: `${Math.round(act.average_heartrate)} bpm` });
      if (act.hr_max) metrics.push({ label: 'Max HR', value: `${Math.round(act.hr_max)} bpm` });

      items.push({
        id: act.id ?? `act-${idx}-${actDate.getTime()}`,
        type: 'running',
        title: act.name || 'Aktywność Garmin',
        timeFormatted: actDate.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }),
        durationFormatted: durMin >= 60 ? `${Math.floor(durMin / 60)}h ${durMin % 60}m` : `${durMin} min`,
        metrics,
        accentColor: 'orange',
        timestamp: actDate.getTime(),
      });
    });
  }

  // 3. Treningi siłowe
  if (options.workouts && options.workouts.length > 0) {
    options.workouts.forEach((w) => {
      const wDate = new Date(`${w.date}T17:00:00Z`);
      const metrics: Array<{ label: string; value: string }> = [];
      if (w.total_volume_kg != null) {
        metrics.push({ label: 'Tonaż', value: `${Math.round(w.total_volume_kg)} kg` });
      }
      if (w.sets_count != null) {
        metrics.push({ label: 'Serie', value: `${w.sets_count}` });
      }

      items.push({
        id: `workout-${w.id}`,
        type: 'workout',
        title: w.name || 'Trening siłowy',
        timeFormatted: '17:00',
        durationFormatted: 'ok. 60 min',
        metrics,
        accentColor: 'blue',
        timestamp: wDate.getTime(),
      });
    });
  }

  // 4. Okres regeneracji / relaksu
  if (options.recoveryHighMinutes && options.recoveryHighMinutes >= 30) {
    items.push({
      id: `restorative-${options.date}`,
      type: 'restorative',
      title: 'Okres regeneracji i spokoju',
      timeFormatted: 'W ciągu dnia',
      durationFormatted: `${options.recoveryHighMinutes} min`,
      metrics: [{ label: 'Wpływ', value: '+ Regeneracja' }],
      accentColor: 'green',
      timestamp: new Date(`${options.date}T14:30:00Z`).getTime(),
    });
  }

  // Sortowanie chronologiczne
  return items.sort((a, b) => a.timestamp - b.timestamp);
}
