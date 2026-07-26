const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('supabase/functions/.env', 'utf8');
const urlMatch = envContent.match(/VITE_SUPABASE_URL=(.*)/);
const keyMatch = envContent.match(/SB_SECRET_KEY=(.*)/);

const url = urlMatch[1].trim();
const key = keyMatch[1].trim();

const supabase = createClient(url, key);

async function main() {
  const { data: cloudRows, error } = await supabase
    .from('oura_daily_summary')
    .select('*')
    .order('date', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error fetching cloud rows:', error);
    return;
  }

  console.log('========================================================================================');
  console.log('HISTORYCZNE PORÓWNANIE METRYK: OURA CLOUD API vs SPARKY SCHEMA');
  console.log('========================================================================================');
  console.log('DATA       | SLEEP SCORE | READINESS | RHR (BPM) | HRV RMSSD (ms) | TEMP (°C) | SEN TOTAL (h)');
  console.log('----------------------------------------------------------------------------------------');

  for (const r of cloudRows) {
    const d = r.date;
    const ss = String(r.sleep_score ?? '-').padStart(11);
    const rs = String(r.readiness_score ?? '-').padStart(9);
    const rhr = String(r.rhr_avg ?? r.lowest_heart_rate ?? '-').padStart(9);
    const hrv = String(r.hrv_avg ?? r.average_hrv ?? '-').padStart(14);
    const temp = String(r.temp_deviation ?? r.temperature_deviation ?? '-').padStart(9);
    const sleepH = String(r.total_sleep_hours ?? (r.total_sleep_duration ? (r.total_sleep_duration/3600).toFixed(1) : '-')).padStart(13);

    console.log(`${d} | ${ss} | ${rs} | ${rhr} | ${hrv} | ${temp} | ${sleepH}`);
  }
  console.log('========================================================================================');
}

main().catch(console.error);
