const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('supabase/functions/.env', 'utf8');
const urlMatch = envContent.match(/VITE_SUPABASE_URL=(.*)/);
const keyMatch = envContent.match(/SB_SECRET_KEY=(.*)/);

const url = urlMatch[1].trim();
const key = keyMatch[1].trim();

const supabase = createClient(url, key);

async function main() {
  const { data, error } = await supabase
    .from('oura_daily_summary')
    .select('*')
    .limit(5);

  if (error) {
    console.error(error);
    return;
  }

  console.log('============================================================');
  console.log('DANE Z OURA CLOUD API (ouraring_daily_summary):');
  console.log('============================================================');
  for (const r of data) {
    const tot_h = r.total_sleep_duration ? (r.total_sleep_duration / 3600).toFixed(1) : 'brak';
    const rem_m = r.rem_sleep_duration ? Math.round(r.rem_sleep_duration / 60) : 'brak';
    const deep_m = r.deep_sleep_duration ? Math.round(r.deep_sleep_duration / 60) : 'brak';
    console.log(`Data: ${r.summary_date}`);
    console.log(`  Sleep Score:       ${r.sleep_score}`);
    console.log(`  Readiness Score:   ${r.readiness_score}`);
    console.log(`  Lowest Heart Rate: ${r.lowest_heart_rate} BPM`);
    console.log(`  Average HRV:       ${r.average_hrv} ms`);
    console.log(`  Temp Deviation:    ${r.temperature_deviation} °C`);
    console.log(`  Total Sleep:       ${tot_h}h (REM: ${rem_m}m, Deep: ${deep_m}m)`);
    console.log('--------------------------------------------------');
  }
}

main().catch(console.error);
