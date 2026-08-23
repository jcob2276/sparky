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
  const d = new Date();
  d.setDate(d.getDate() - 3);
  const since = d.toISOString();
  console.log(`=== CHECKING RECENT DATA SINCE ${since} ===\n`);

  const tables = [
    { name: 'vanguard_stream', timeCol: 'created_at' },
    { name: 'daily_reconciliations', timeCol: 'date' },
    { name: 'todo_items', timeCol: 'created_at' },
    { name: 'friction_events', timeCol: 'created_at' },
  ];

  for (const t of tables) {
    const { data, error } = await supabase
      .from(t.name)
      .select('*')
      .gte(t.timeCol, since.split('T')[0])
      .order(t.timeCol, { ascending: false })
      .limit(3);
    
    if (error) {
      console.log(`Error fetching ${t.name}:`, error.message);
    } else {
      console.log(`\n--- ${t.name} (${data.length} recent rows) ---`);
      data.forEach(row => console.log(JSON.stringify(row).substring(0, 1000)));
    }
  }
}

main();
