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
  const today = '2026-07-31';
  console.log(`=== CHECKING DB FOR TODAY ${today} ===\n`);

  const { data: ws } = await supabase
    .from('workout_sessions')
    .select('*')
    .gte('start_time', `${today}T00:00:00`);
  console.log("workout_sessions:", ws);

  const { data: st } = await supabase
    .from('strava_activities_clean')
    .select('*')
    .gte('start_date', `${today}T00:00:00`);
  console.log("strava_activities_clean:", st);

  const { data: oura } = await supabase
    .from('oura_hr_5min')
    .select('*')
    .eq('day', today);
  console.log("oura_hr_5min rows:", oura?.length);
  if (oura?.length) {
    console.log("Oura HR data:", JSON.stringify(oura[0], null, 2));
  }
}

main();
