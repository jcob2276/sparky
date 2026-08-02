import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import https from 'https';

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
  // 1. Get oura token
  const { data: us } = await supabase.from('user_settings').select('oura_token');
  const token = us?.[0]?.oura_token;
  if (!token) {
    console.log("No Oura token");
    return;
  }

  // 2. Fetch Oura HR for today: 2026-07-29
  const startIso = '2026-07-29T00:00:00+02:00';
  const endIso = '2026-07-29T23:59:59+02:00';

  const reqUrl = `https://api.ouraring.com/v2/usercollection/heartrate?start_datetime=${encodeURIComponent(startIso)}&end_datetime=${encodeURIComponent(endIso)}`;

  const req = https.request(reqUrl, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        const parsed = JSON.parse(data);
        const items = parsed.data || [];
        console.log(`Total Oura HR samples today: ${items.length}`);
        if (items.length > 0) {
          console.log(`First timestamp: ${items[0].timestamp}, Last timestamp: ${items[items.length-1].timestamp}`);
        }
        
        const tennisSamples = items.filter(item => {
          const t = new Date(item.timestamp);
          const hrs = t.getUTCHours() + 2; // Warsaw offset (UTC+2)
          const mins = t.getUTCMinutes();
          const totalMin = hrs * 60 + mins;
          // 19:30 is 1170 min, 21:00 is 1260 min
          return totalMin >= 1170 && totalMin <= 1260;
        });


        console.log(`Oura HR samples between 19:30 and 21:00: ${tennisSamples.length}`);
        if (tennisSamples.length > 0) {
          const hrs = tennisSamples.map(s => s.bpm);
          const avg = (hrs.reduce((a,b)=>a+b,0)/hrs.length).toFixed(1);
          const min = Math.min(...hrs);
          const max = Math.max(...hrs);
          console.log(`Oura Tennis HR Summary: Min=${min}, Avg=${avg}, Max=${max}`);
          console.log("\nTimeline (Oura):");
          tennisSamples.forEach(s => {
            const timePart = s.timestamp.substring(11, 19);
            console.log(`  ${timePart} | ${s.bpm} bpm`);
          });
        }
      } catch (e) {
        console.error("Parse error:", e);
      }
    });
  });

  req.on('error', e => console.error(e));
  req.end();
}

main();
