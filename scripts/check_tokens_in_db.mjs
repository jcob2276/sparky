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
  const { data: vt, error: e1 } = await supabase.from('vanguard_tokens').select('*');
  console.log("=== vanguard_tokens ===");
  if (vt) console.log(JSON.stringify(vt, null, 2));

  const { data: us, error: e2 } = await supabase.from('user_settings').select('*');
  console.log("=== user_settings keys ===");
  if (us && us[0]) console.log(Object.keys(us[0]));
}

main();
