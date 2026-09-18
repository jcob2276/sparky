import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const envContent = fs.readFileSync('.env', 'utf-8');
const env = {};
for (const line of envContent.split('\n')) {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
  if (match) {
    let val = match[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[match[1]] = val;
  }
}

const sb = createClient(env.VITE_SUPABASE_URL, env.SB_SECRET_KEY);

async function run() {
  // Test workout tables
  const testTables = ['workout_sessions', 'exercise_logs', 'exercises', 'workout_templates', 'workout_presets'];
  for (const t of testTables) {
    const { data, error } = await sb.from(t).select('*').limit(1);
    if (error) {
      console.log(`Table ${t}: Error -> ${error.message}`);
    } else {
      console.log(`Table ${t}: EXISTS! Columns ->`, Object.keys(data[0] || {}));
    }
  }

  // Find recent exercise_logs
  const { data: logs } = await sb.from('exercise_logs').select('exercise_name, weight, reps, rir, created_at').order('created_at', { ascending: false }).limit(10);
  console.log('Recent exercise logs:', logs);

  // Find distinct exercise names
  const { data: distinctNames } = await sb.from('exercise_logs').select('exercise_name').limit(500);
  const names = [...new Set((distinctNames || []).map(d => d.exercise_name))];
  console.log('Unique exercise names logged in DB (' + names.length + '):', names.slice(0, 30));
}

run().catch(console.error);
