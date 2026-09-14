import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { getTodayWarsaw, shiftDateStr } from '../../../lib/date';
import { isLogWellness, sessionVol } from '../../biometrics/workout/workoutUtils';
import { isGarminSaunaActivity } from '../../../lib/health/workoutSauna';
import { HeatmapTooltip, type HeatmapCellData, type HeatmapDay, type HeatmapTooltipState } from './HeatmapTooltip';

interface ExerciseLog {
  exercise_name: string;
  weight: number | string | null;
  reps: number | string | null;
  muscle_tags?: string[];
}

interface SessionItem {
  id: string;
  date: string | null;
  workout_day: string | null;
  session_rpe: number | null;
  exercise_logs: ExerciseLog[];
}

interface StravaActivity {
  name?: string | null;
  sport_type: string | null;
  distance: number | null;
  start_date: string | null;
}

interface HeatmapProps {
  sessions: SessionItem[];
  strava: StravaActivity[];
}

function getRunColor(km: number): string {
  if (km < 5)  return 'bg-warning/40';
  if (km < 12) return 'bg-warning/60';
  return 'bg-warning/80';
}

function getGymColor(vol: number): string {
  if (vol < 3000)  return 'bg-primary/30';
  if (vol < 8000)  return 'bg-primary/55';
  if (vol < 15000) return 'bg-primary/80';
  return 'bg-primary';
}

function getDayColors(day: HeatmapDay, kmRun: number): string[] {
  if (day.future) return ['bg-transparent border border-border-custom/20'];
  const hasRun = kmRun > 0;
  const data = day.data;
  const hasGym = !!data && !data.wellness;
  const hasWellness = !!data && data.wellness;

  const categories: string[] = [];
  if (hasRun) categories.push(getRunColor(kmRun));
  if (hasGym) categories.push(getGymColor(data.vol));
  if (hasWellness) categories.push('bg-info/50');

  if (categories.length === 0) return ['bg-border-custom'];
  return categories;
}

export default function Heatmap({ sessions, strava = [] }: HeatmapProps) {
  const [tooltip, setTooltip] = useState<HeatmapTooltipState | null>(null);

  const todayStr = getTodayWarsaw();

  const dateMap: Record<string, HeatmapCellData> = {};
  for (const s of sessions) {
    if (!s.date) continue;
    const vol = sessionVol(s);
    const wellness = (s.exercise_logs || []).length > 0 && (s.exercise_logs || []).every(l => isLogWellness(l));
    const exercises = [...new Set((s.exercise_logs || []).map(l => l.exercise_name))].slice(0, 3);
    dateMap[s.date] = { vol, wellness, name: s.workout_day, exercises, rpe: s.session_rpe };
  }

  const runMap: Record<string, number> = {};
  for (const a of strava) {
    if (!a.sport_type || !a.start_date) continue;
    const d = a.start_date.slice(0, 10);
    if (['Run', 'TrailRun', 'VirtualRun'].includes(a.sport_type) && a.distance) {
      runMap[d] = (runMap[d] || 0) + (Number(a.distance) || 0) / 1000;
    }
    if (isGarminSaunaActivity(a)) {
      if (!dateMap[d]) {
        dateMap[d] = {
          vol: 0,
          wellness: true,
          name: a.name || 'Sauna (Garmin Kardio)',
          exercises: ['Sauna (regeneracja ciepłem)'],
          rpe: null,
        };
      } else {
        dateMap[d].wellness = true;
        if (!dateMap[d].exercises.some(e => e.toLowerCase().includes('sauna'))) {
          dateMap[d].exercises.push('Sauna (Garmin Kardio)');
        }
      }
    }
  }

  const dow = new Date(todayStr + 'T12:00:00Z').getUTCDay();
  const offsetToMonday = -(dow === 0 ? 6 : dow - 1);
  const mondayStr = shiftDateStr(todayStr, offsetToMonday);
  const startStr = shiftDateStr(mondayStr, -12 * 7);

  const weeks: HeatmapDay[][] = [];
  let currentStr = startStr;
  while (weeks.length < 13) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      week.push({ date: currentStr, future: currentStr > todayStr, data: dateMap[currentStr] || null });
      currentStr = shiftDateStr(currentStr, 1);
    }
    weeks.push(week);
  }

  const DAYS = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb', 'Nd'];

  // Adherence & discipline statistics for 13 weeks
  const nonFutureDays = weeks.flatMap((w) => w).filter((d) => !d.future);
  const totalDays = nonFutureDays.length || 1;
  let activeDays = 0;
  let runCount = 0;
  let gymCount = 0;
  let wellnessCount = 0;

  for (const day of nonFutureDays) {
    const km = runMap[day.date] || 0;
    const hasGym = day.data && !day.data.wellness;
    const hasWellness = day.data && day.data.wellness;
    if (km > 0 || hasGym || hasWellness) {
      activeDays++;
      if (km > 0) runCount++;
      if (hasGym) gymCount++;
      if (hasWellness) wellnessCount++;
    }
  }

  const adherencePct = Math.round((activeDays / totalDays) * 100);
  const weeksCount = Math.max(1, Math.round(totalDays / 7));
  const avgUnitsPerWeek = (activeDays / weeksCount).toFixed(1);
  const totalEvents = (runCount + gymCount + wellnessCount) || 1;
  const runPct = Math.round((runCount / totalEvents) * 100);
  const gymPct = Math.round((gymCount / totalEvents) * 100);
  const wellPct = Math.round((wellnessCount / totalEvents) * 100);

  return (
    <div>
      {/* ── Summary Strip: Adherence, weekly rhythm, discipline balance ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-1.5 rounded-lg bg-surface-2/40 border border-border-custom/50 text-2xs mb-3.5">
        <div className="flex items-center gap-1.5">
          <span className="text-text-muted">Konsekwencja:</span>
          <span className="font-bold text-text-primary">{activeDays}/{totalDays} dni</span>
          <span className={`font-mono font-bold ${adherencePct >= 75 ? 'text-success' : 'text-warning'}`}>({adherencePct}% spójności)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-text-muted">Rytm:</span>
          <span className="font-bold text-text-primary">{avgUnitsPerWeek} jedn./tydzień</span>
        </div>
        <div className="flex items-center gap-1.5 text-3xs text-text-muted">
          <span>Balans:</span>
          <span className="text-warning font-semibold">{runPct}% bieg</span>
          <span>·</span>
          <span className="text-primary font-semibold">{gymPct}% siła</span>
          <span>·</span>
          <span className="text-info font-semibold">{wellPct}% wellness</span>
        </div>
      </div>

      <div className="flex gap-1.5 items-start">
        <div className="flex flex-col gap-[var(--ds-arbitrary-5px-coll-2)] pt-7 mr-1">
          {DAYS.map(d => <div key={d} className="text-2xs text-text-muted w-4 h-3.5 flex items-center">{d}</div>)}
        </div>
        <div className="flex gap-1 flex-1 overflow-hidden">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-[var(--ds-arbitrary-5px-coll-2)] flex-1">
              <div className="text-2xs text-text-muted h-6 flex items-end pb-0.5">
                {wi % 3 === 0 ? format(parseISO(week[0].date), 'dd.MM') : ''}
              </div>
              {week.map((day, di) => {
                const kmRun = runMap[day.date] || 0;
                const colors = getDayColors(day, kmRun);
                const hasActivity = !!day.data || kmRun > 0;

                const onEnter = hasActivity ? (e: React.MouseEvent<HTMLDivElement>) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setTooltip({ day, kmRun, rect });
                } : undefined;

                if (colors.length > 1) {
                  return (
                    <div
                      key={di}
                      className={`h-3.5 rounded-sm overflow-hidden flex transition-opacity ${
                        hasActivity ? 'cursor-pointer hover:opacity-[var(--opacity-70)]' : 'cursor-default'
                      }`}
                      onMouseEnter={onEnter}
                      onMouseLeave={() => setTooltip(null)}
                    >
                      {colors.map((c, idx) => (
                        <div key={idx} className={`h-full flex-1 ${c}`} />
                      ))}
                    </div>
                  );
                }

                return (
                  <div
                    key={di}
                    className={`h-3.5 rounded-sm transition-opacity ${
                      hasActivity ? 'cursor-pointer hover:opacity-[var(--opacity-70)]' : 'cursor-default'
                    } ${colors[0]}`}
                    onMouseEnter={onEnter}
                    onMouseLeave={() => setTooltip(null)}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <HeatmapTooltip tooltip={tooltip} />

      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border-custom flex-wrap">
        <span className="text-2xs font-bold uppercase tracking-wider text-text-muted">Legenda:</span>
        {[
          { color: 'bg-border-custom',  label: 'Odpoczynek' },
          { color: 'bg-info/50',        label: 'Wellness' },
          { color: 'bg-warning/40',     label: 'Bieg <5km' },
          { color: 'bg-warning/60',     label: 'Bieg 5-12km' },
          { color: 'bg-warning/80',     label: 'Bieg >12km' },
          { color: 'bg-primary/30',     label: '<3 Mg' },
          { color: 'bg-primary/55',     label: '3–8 Mg' },
          { color: 'bg-primary/80',     label: '8–15 Mg' },
          { color: 'bg-primary',        label: '>15 Mg' },
          { split: ['bg-warning/60', 'bg-info/50'], label: 'Łączony' },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            {item.split ? (
              <div className="w-3 h-3 rounded-sm overflow-hidden flex">
                <div className={`h-full flex-1 ${item.split[0]}`} />
                <div className={`h-full flex-1 ${item.split[1]}`} />
              </div>
            ) : (
              <div className={`w-3 h-3 rounded-sm ${item.color}`} />
            )}
            <span className="text-2xs text-text-muted">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
