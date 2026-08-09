import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const lineClean = line.trim();
  if (lineClean && !lineClean.startsWith('#')) {
    const eqIdx = lineClean.indexOf('=');
    if (eqIdx !== -1) {
      const k = lineClean.slice(0, eqIdx).trim();
      const v = lineClean.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
      env[k] = v;
    }
  }
});

const url = env.VITE_SUPABASE_URL;
const key = env.SB_SECRET_KEY || env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);

async function main() {
  console.log("=== CHECKING ALL OURA TABLES ===");
  const tables = ['oura_daily_summary', 'oura_enhanced', 'oura_sleep_sessions', 'oura_hr_5min', 'oura_activity_daily'];
  for (const t of tables) {
    const { data, error } = await supabase.from(t).select('*').limit(3);
    console.log(`Table ${t}: ${data?.length || 0} rows. Error: ${error ? error.message : 'none'}`);
    if (data && data.length > 0) {
      console.log("Sample keys:", Object.keys(data[0]));
    }
  }
}

main().catch(err => console.error(err));
