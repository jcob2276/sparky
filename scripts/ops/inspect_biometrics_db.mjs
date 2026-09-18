import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = {};
for (const l of fs.readFileSync('.env', 'utf-8').split('\n')) {
  const m = l.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, '');
}

const supabase = createClient(env.VITE_SUPABASE_URL, env.SB_SECRET_KEY);

async function check() {
  const uid = env.VANGUARD_USER_ID;
  const { data: oura } = await supabase.from('oura_daily_summary').select('*').eq('user_id', uid).order('date', { ascending: false }).limit(2);
  const { data: enhanced } = await supabase.from('oura_enhanced').select('*').eq('user_id', uid).order('date', { ascending: false }).limit(2);
  const { data: strava } = await supabase.from('strava_activities').select('name, distance, moving_time, start_date, average_heartrate, gc_vo2max').eq('user_id', uid).order('start_date', { ascending: false }).limit(4);
  const { data: nut } = await supabase.from('nutrition_logs').select('*').eq('user_id', uid).order('date', { ascending: false }).limit(3);
  const { data: strain } = await supabase.from('daily_strain').select('*').eq('user_id', uid).order('date', { ascending: false }).limit(2);
  
  console.log('Oura summary sample:', oura?.[0]);
  console.log('Oura enhanced sample:', enhanced?.[0]);
  console.log('Garmin / Strava sample:', strava);
  console.log('Nutrition sample:', nut?.[0]);
  console.log('Daily strain sample:', strain?.[0]);
}

check().catch(console.error);
