import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join('=').trim();
  }
});

const url = env.VITE_SUPABASE_URL;
const key = env.SB_SECRET_KEY || env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);

async function main() {
  const today = '2026-07-29';
  console.log(`=== CHECKING DB DATA FOR ${today} ===\n`);

  // 1. strava_activities_clean
  const { data: st, error: e1 } = await supabase
    .from('strava_activities_clean')
    .select('*')
    .gte('start_date', `${today}T00:00:00`)
    .lte('start_date', `${today}T23:59:59`);
  
  console.log(`1. strava_activities_clean (${st?.length || 0} rows):`);
  if (st && st.length > 0) {
    console.log(JSON.stringify(st, null, 2));
  } else if (e1) {
    console.error("Error st:", e1);
  }

  // 2. workout_sessions
  const { data: ws, error: e2 } = await supabase
    .from('workout_sessions')
    .select('*')
    .gte('start_time', `${today}T00:00:00`);

  console.log(`\n2. workout_sessions (${ws?.length || 0} rows):`);
  if (ws && ws.length > 0) {
    console.log(JSON.stringify(ws, null, 2));
  }

  // 3. Oura / HR tables
  const { data: oura5, error: e3 } = await supabase
    .from('oura_hr_5min')
    .select('*')
    .eq('day', today);
  
  console.log(`\n3. oura_hr_5min (${oura5?.length || 0} rows):`);
  if (oura5 && oura5.length > 0) {
    console.log(JSON.stringify(oura5[0], null, 2));
  }

  // 4. oura_enhanced
  const { data: ouraEnh, error: e4 } = await supabase
    .from('oura_enhanced')
    .select('*')
    .eq('day', today);

  console.log(`\n4. oura_enhanced (${ouraEnh?.length || 0} rows):`);
  if (ouraEnh && ouraEnh.length > 0) {
    console.log(JSON.stringify(ouraEnh[0], null, 2));
  }
}

main();
