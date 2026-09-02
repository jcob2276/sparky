import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';

const env = {};
for (const line of fs.readFileSync('.env', 'utf8').split('\n')) {
  const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
  if (!m) continue;
  let v = m[2].trim().replace(/^['"]|['"]$/g, '');
  env[m[1]] = v;
}

const supabase = createClient(env.VITE_SUPABASE_URL, env.SB_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const uid = env.VANGUARD_USER_ID;

const { data: sessions } = await supabase
  .from('workout_sessions')
  .select('id, date, workout_day, session_rpe, duration_minutes')
  .eq('user_id', uid)
  .gte('date', '2026-08-20')
  .order('date', { ascending: false });

const sessionIds = (sessions || []).map((s) => s.id);

const { data: logs } = await supabase
  .from('exercise_logs')
  .select('session_id, exercise_name, weight, reps, rir, rpe, muscle_tags')
  .eq('user_id', uid)
  .in('session_id', sessionIds.length ? sessionIds : ['00000000-0000-0000-0000-000000000000'])
  .order('set_number');

const { data: oura } = await supabase
  .from('oura_daily_summary')
  .select('date, readiness_score, hrv_avg, rhr_avg, sleep_score, total_sleep_hours, steps')
  .eq('user_id', uid)
  .gte('date', '2026-08-26')
  .order('date', { ascending: false });

const legTags = new Set(['nogi', 'czworogłowe', 'dwugłowe ud', 'pośladki', 'łydki']);
const legKeywords = /squat|przysiad|leg|nogi|wypy|rdl|martwy|lung|hack|leg press|czworog|poślad|glute|hamstring|łydek|wspię|hip thrust/i;

console.log('=== OURA (ostatnie dni) ===');
for (const o of oura || []) {
  console.log(`${o.date}: readiness ${o.readiness_score}, HRV ${o.hrv_avg}ms, RHR ${o.rhr_avg}, sen ${o.total_sleep_hours}h, kroki ${o.steps}`);
}

console.log('\n=== TRENINGI (ostatnie 2 tyg) ===');
for (const s of sessions || []) {
  const sLogs = (logs || []).filter((l) => l.session_id === s.id);
  const legLogs = sLogs.filter(
    (l) => legKeywords.test(l.exercise_name) || (l.muscle_tags || []).some((t) => legTags.has(t)),
  );
  const isLegDay = /nogi|leg/i.test(s.workout_day || '');
  if (!legLogs.length && !isLegDay) continue;

  console.log(`\n${s.date} — ${s.workout_day} (RPE ${s.session_rpe ?? '?'})`);
  const byEx = new Map();
  for (const l of legLogs.length ? legLogs : sLogs) {
    const key = l.exercise_name;
    if (!byEx.has(key)) byEx.set(key, []);
    byEx.get(key).push(l);
  }
  for (const [name, sets] of byEx) {
    const summary = sets.map((x) => `${x.weight ?? 'BW'}kg×${x.reps} RIR${x.rir ?? '?'}`).join(' | ');
    console.log(`  ${name}: ${summary}`);
  }
}

console.log('\n=== BIEGI (Strava) ===');
const { data: runs } = await supabase
  .from('strava_activities_clean')
  .select('start_date, name, distance, moving_time, hr_avg, hr_max, sport_type')
  .eq('user_id', uid)
  .gte('start_date', '2026-08-20T00:00:00Z')
  .order('start_date', { ascending: false })
  .limit(8);

for (const r of runs || []) {
  const km = r.distance ? (r.distance / 1000).toFixed(1) : '?';
  const min = r.moving_time ? Math.round(r.moving_time / 60) : '?';
  const date = r.start_date.slice(0, 10);
  console.log(`${date} ${r.sport_type}: ${r.name} — ${km}km, ${min}min, HR avg ${r.hr_avg ?? '?'}`);
}
