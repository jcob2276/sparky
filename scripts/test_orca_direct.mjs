import fs from 'fs';

const code = fs.readFileSync('scratch_orca_scan/bundle.js', 'utf8');
const keyMatches = code.match(/eyJ[a-zA-Z0-9_\-]{50,}/g) || [];
const anonKey = keyMatches[0];

console.log('Anon key length:', anonKey.length);

async function testFetch() {
  const url = 'https://rtnehnbvteuipkoatdlz.supabase.co/rest/v1/vw_gpw_shorts_agg?select=*&limit=5';
  const res = await fetch(url, {
    headers: {
      'apikey': anonKey,
      'Authorization': `Bearer ${anonKey}`
    }
  });

  console.log('Status:', res.status);
  const data = await res.json();
  console.log('Data:', JSON.stringify(data, null, 2));
}

testFetch().catch(console.error);
