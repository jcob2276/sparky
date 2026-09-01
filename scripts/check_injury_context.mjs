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
  console.log("=== Checking recent vanguard_stream ===");
  const { data: stream } = await supabase
    .from('vanguard_stream')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20);
    
  if (stream) {
    stream.forEach(s => {
      console.log(`[${s.created_at}] ${s.content || s.text || JSON.stringify(s)}`);
    });
  }

  console.log("\n=== Checking friction_events ===");
  const { data: frictions } = await supabase
    .from('friction_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);
    
  if (frictions) {
    frictions.forEach(f => {
      console.log(`[${f.created_at}] ${f.domain || f.category}: ${f.description || f.content}`);
    });
  }
}

main();
