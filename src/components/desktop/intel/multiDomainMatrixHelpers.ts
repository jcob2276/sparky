import { shiftDateStr } from '../../../lib/date';
import { sessionVol, isLogWellness } from '../../biometrics/workout/workoutUtils';
import type { DesktopSessionRow, StravaActivityRow } from '../../../lib/desktopDashboardTypes';
import type { LenieLogRow } from '../desktopUtils';
import type { HabitRow } from '../shell/useDesktopData';
import type { MultiDomainMatrixApiResult } from '../../../lib/multiDomainMatrixApi';
import type {
  MatrixLayerId,
  DayMatrixDetail,
  MatrixCorrelationStats,
} from './multiDomainMatrixTypes';

const DOW_NAMES = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb', 'Nd'];

interface BuildMatrixParams {
  sessions: DesktopSessionRow[];
  strava: StravaActivityRow[];
  lenieLogs: LenieLogRow[];
  habits: HabitRow[];
  apiData: MultiDomainMatrixApiResult | null | undefined;
  proteinFloorG: number;
  todayStr: string;
  startStr: string;
}

function createDomainMaps(
  sessions: DesktopSessionRow[],
  strava: StravaActivityRow[],
  lenieLogs: LenieLogRow[],
  habits: HabitRow[],
  apiData: MultiDomainMatrixApiResult | null | undefined,
) {
  const gymMap: Record<string, { vol: number; name: string | null; exercises: string[]; rpe: number | null; isWellness: boolean }> = {};
  for (const s of sessions) {
    if (!s.date) continue;
    const vol = sessionVol(s);
    const isWellness = (s.exercise_logs || []).length > 0 && (s.exercise_logs || []).every(l => isLogWellness(l));
    const exercises = [...new Set((s.exercise_logs || []).map(l => l.exercise_name))].slice(0, 4);
    gymMap[s.date] = { vol, name: s.workout_day, exercises, rpe: s.session_rpe, isWellness };
  }

  const runMap: Record<string, { km: number; count: number }> = {};
  for (const a of strava) {
    if (!a.sport_type || !a.start_date || !a.distance) continue;
    if (!['Run', 'TrailRun', 'VirtualRun'].includes(a.sport_type)) continue;
    const d = a.start_date.slice(0, 10);
    const km = (Number(a.distance) || 0) / 1000;
    const cur = runMap[d] || { km: 0, count: 0 };
    runMap[d] = { km: cur.km + km, count: cur.count + 1 };
  }

  const incidentMap: Record<string, { count: number; stimuli: string[]; notes: string[] }> = {};
  for (const log of lenieLogs) {
    if (!log.date) continue;
    const cur = incidentMap[log.date] || { count: 0, stimuli: [], notes: [] };
    cur.count += 1;
    if (log.final_stimulus && !cur.stimuli.includes(log.final_stimulus)) cur.stimuli.push(log.final_stimulus);
    if (log.context_note && !cur.notes.includes(log.context_note)) cur.notes.push(log.context_note);
    incidentMap[log.date] = cur;
  }

  const nutrMap: Record<string, { kcal: number | null; protein: number | null; carbs: number | null; fat: number | null }> = {};
  for (const n of apiData?.nutrition || []) {
    nutrMap[n.date] = {
      kcal: n.calories != null ? Math.round(Number(n.calories)) : null,
      protein: n.protein != null ? Math.round(Number(n.protein)) : null,
      carbs: n.carbs != null ? Math.round(Number(n.carbs)) : null,
      fat: n.fat != null ? Math.round(Number(n.fat)) : null,
    };
  }

  const ouraMap: Record<string, { score: number | null; hours: number | null; hrv: number | null; readiness: number | null }> = {};
  for (const o of apiData?.oura || []) {
    ouraMap[o.date] = {
      score: o.sleep_score != null ? Math.round(Number(o.sleep_score)) : null,
      hours: o.total_sleep_hours != null ? Number(Number(o.total_sleep_hours).toFixed(1)) : null,
      hrv: o.hrv_avg != null ? Math.round(Number(o.hrv_avg)) : null,
      readiness: o.readiness_score != null ? Math.round(Number(o.readiness_score)) : null,
    };
  }

  const winsMap: Record<string, { done: number; total: number; tasks: { title: string; done: boolean }[] }> = {};
  for (const w of apiData?.wins || []) {
    const tasks: { title: string; done: boolean }[] = [];
    if (w.task_1) tasks.push({ title: w.task_1, done: !!w.done_1 });
    if (w.task_2) tasks.push({ title: w.task_2, done: !!w.done_2 });
    if (w.task_3) tasks.push({ title: w.task_3, done: !!w.done_3 });
    if (w.task_4) tasks.push({ title: w.task_4, done: !!w.done_4 });
    if (w.task_5) tasks.push({ title: w.task_5, done: !!w.done_5 });
    winsMap[w.date] = { done: tasks.filter(t => t.done).length, total: tasks.length, tasks };
  }

  const habitNameMap: Record<string, string> = {};
  for (const h of habits) habitNameMap[h.id] = h.name;
  const habitDayMap: Record<string, { doneCount: number; totalCount: number; names: string[] }> = {};
  for (const log of apiData?.habitLogs || []) {
    if (!log.date) continue;
    const cur = habitDayMap[log.date] || { doneCount: 0, totalCount: habits.length, names: [] };
    if (log.completed) {
      cur.doneCount += 1;
      const name = habitNameMap[log.habit_id];
      if (name) cur.names.push(name);
    }
    habitDayMap[log.date] = cur;
  }

  return { gymMap, runMap, incidentMap, nutrMap, ouraMap, winsMap, habitDayMap };
}

export function buildMatrixWeeksAndStats({
  sessions,
  strava,
  lenieLogs,
  habits,
  apiData,
  proteinFloorG,
  todayStr,
  startStr,
}: BuildMatrixParams): { weeks: DayMatrixDetail[][]; stats: MatrixCorrelationStats } {
  const { gymMap, runMap, incidentMap, nutrMap, ouraMap, winsMap, habitDayMap } =
    createDomainMaps(sessions, strava, lenieLogs, habits, apiData);

  const weeksList: DayMatrixDetail[][] = [];
  let curDate = startStr;
  let totalPastDays = 0;
  let incidentDays = 0;
  let cleanDays = 0;
  let sumSleepIncident = 0;
  let countSleepIncident = 0;
  let sumSleepClean = 0;
  let countSleepClean = 0;
  let sumPowerIncident = 0;
  let countPowerIncident = 0;
  let sumPowerClean = 0;
  let countPowerClean = 0;
  let trainingDays = 0;
  let highProteinDays = 0;
  let highCarbsDays = 0;
  let perfectDays = 0;

  while (weeksList.length < 13) {
    const week: DayMatrixDetail[] = [];
    for (let d = 0; d < 7; d++) {
      const isFuture = curDate > todayStr;
      const isToday = curDate === todayStr;
      const dowName = DOW_NAMES[d];

      const gym = gymMap[curDate] || null;
      const run = runMap[curDate] || null;
      const nutrition = nutrMap[curDate] || null;
      const sleep = ouraMap[curDate] || null;
      const powerList = winsMap[curDate] || { done: 0, total: 0, tasks: [] };
      const lenie = incidentMap[curDate] || { count: 0, stimuli: [], notes: [] };
      const dayHabits = habitDayMap[curDate] || { doneCount: 0, totalCount: habits.length, names: [] };

      const activeLayers: MatrixLayerId[] = [];
      if (gym && (!gym.isWellness || gym.vol > 0)) activeLayers.push('gym');
      if (run && run.km > 0) activeLayers.push('run');
      if (nutrition?.protein != null && nutrition.protein >= proteinFloorG) activeLayers.push('protein');
      if (nutrition?.carbs != null && nutrition.carbs >= 200) activeLayers.push('carbs');
      if (sleep && ((sleep.score != null && sleep.score >= 80) || (sleep.hours != null && sleep.hours >= 7.5))) activeLayers.push('sleep');
      if (sleep?.readiness != null && sleep.readiness >= 80) activeLayers.push('readiness');
      if (powerList.done >= 3) activeLayers.push('powerlist');
      if (lenie.count > 0) activeLayers.push('incident');
      if (dayHabits.totalCount > 0 && dayHabits.doneCount / dayHabits.totalCount >= 0.5) activeLayers.push('habits');

      if (!isFuture) {
        totalPastDays++;
        if (lenie.count > 0) {
          incidentDays++;
          if (sleep?.score != null) { sumSleepIncident += sleep.score; countSleepIncident++; }
          if (powerList.total > 0) { sumPowerIncident += (powerList.done / powerList.total) * 100; countPowerIncident++; }
        } else {
          cleanDays++;
          if (sleep?.score != null) { sumSleepClean += sleep.score; countSleepClean++; }
          if (powerList.total > 0) { sumPowerClean += (powerList.done / powerList.total) * 100; countPowerClean++; }
        }

        const hasTraining = (gym && (!gym.isWellness || gym.vol > 0)) || (run && run.km > 0);
        if (hasTraining) trainingDays++;
        if (nutrition?.protein != null && nutrition.protein >= proteinFloorG) highProteinDays++;
        if (nutrition?.carbs != null && nutrition.carbs >= 200) highCarbsDays++;

        const isGoodSleep = (sleep?.score != null && sleep.score >= 78) || (sleep?.hours != null && sleep.hours >= 7.2);
        if (hasTraining && nutrition?.protein && nutrition.protein >= proteinFloorG && isGoodSleep && lenie.count === 0) {
          perfectDays++;
        }
      }

      week.push({
        date: curDate,
        dayOfWeek: dowName,
        isFuture,
        isToday,
        gym,
        run,
        nutrition,
        sleep,
        powerList,
        lenie,
        habits: dayHabits,
        activeLayers,
      });

      curDate = shiftDateStr(curDate, 1);
    }
    weeksList.push(week);
  }

  const stats: MatrixCorrelationStats = {
    totalDays: 91,
    pastDaysCount: totalPastDays,
    daysWithIncident: incidentDays,
    cleanDaysCount: cleanDays,
    avgSleepIncidentDays: countSleepIncident > 0 ? Math.round(sumSleepIncident / countSleepIncident) : null,
    avgSleepCleanDays: countSleepClean > 0 ? Math.round(sumSleepClean / countSleepClean) : null,
    powerListRateIncidentDays: countPowerIncident > 0 ? Math.round(sumPowerIncident / countPowerIncident) : null,
    powerListRateCleanDays: countPowerClean > 0 ? Math.round(sumPowerClean / countPowerClean) : null,
    daysWithTraining: trainingDays,
    daysWithHighProtein: highProteinDays,
    daysWithHighCarbs: highCarbsDays,
    perfectDaysCount: perfectDays,
  };

  return { weeks: weeksList, stats };
}
