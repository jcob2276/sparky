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
  console.log("=== CHECKING OURA HR 5-MIN FOR SAUNA SESSIONS ===\n");

  const today = '2026-08-03';
  const { data: todayHr } = await supabase
    .from('oura_hr_5min')
    .select('*')
    .eq('day', today);

  console.log(`Today (${today}) Oura HR rows:`, todayHr?.length || 0);
  if (todayHr?.length) {
    console.log("Today Oura HR Data:", JSON.stringify(todayHr[0], null, 2));
  }

  const prevDate = '2026-07-28';
  const { data: prevHr } = await supabase
    .from('oura_hr_5min')
    .select('*')
    .eq('day', prevDate);

  console.log(`\nPrevious Sauna (${prevDate}) Oura HR rows:`, prevHr?.length || 0);
  if (prevHr?.length) {
    console.log("Prev Oura HR Data:", JSON.stringify(prevHr[0], null, 2));
  }

  const { data: saunas } = await supabase
    .from('workout_sessions')
    .select('*')
    .ilike('workout_day', '%sauna%')
    .order('date', { ascending: false })
    .limit(10);
  console.log("\nRecent Sauna Sessions in DB:", saunas);
}

main();
