const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('supabase/functions/.env', 'utf8');
const urlMatch = envContent.match(/VITE_SUPABASE_URL=(.*)/);
const keyMatch = envContent.match(/SB_SECRET_KEY=(.*)/);

const url = urlMatch[1].trim();
const key = keyMatch[1].trim();

const supabase = createClient(url, key);

const tables = [
  'vanguard_stream',
  'friction_events',
  'notes',
  'todos',
  'ouraring_daily_summary',
  'vanguard_llm_usage',
  'vanguard_knowledge_graph',
  'vanguard_wiki_pages',
  'daily_food_entries',
  'workout_sessions',
  'body_metrics'
];

async function main() {
  console.log('============================================================');
  console.log('RAPORT ZUŻYCIA BAZY SUPABASE:');
  console.log('============================================================');

  let totalRows = 0;

  for (const table of tables) {
    const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
    if (!error && count !== null) {
      console.log(`- Tabela [${table.padEnd(25)}]: ${count.toLocaleString('pl-PL').padStart(8)} rekordów`);
      totalRows += count;
    } else {
      console.log(`- Tabela [${table.padEnd(25)}]: (error: ${error?.message || 'brak'})`);
    }
  }

  console.log('============================================================');
  console.log(`ŁĄCZNIE REKORDÓW W GŁÓWNYCH TABELACH: ${totalRows.toLocaleString('pl-PL')}`);
  console.log('============================================================');
}

main().catch(console.error);
