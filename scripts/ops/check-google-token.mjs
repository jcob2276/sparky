/**
 * Diagnostic script: check if vanguard_tokens has a Google refresh token
 * and attempt a test Google Calendar API call.
 * Run: node scripts/ops/check-google-token.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '../../.env');

// Load env vars from .env.local
let env = {};
try {
  const raw = readFileSync(envPath, 'utf8');
  for (const line of raw.split('\n')) {
    const [k, ...rest] = line.split('=');
    if (k && rest.length) env[k.trim()] = rest.join('=').trim();
  }
} catch {
  console.error('Could not read .env.local — make sure it exists');
  process.exit(1);
}

const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SERVICE_KEY = env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

console.log('=== Google Calendar Token Diagnostic ===\n');

// 1. Check vanguard_tokens table
const { data: tokens, error: tokErr } = await supabase
  .from('vanguard_tokens')
  .select('user_id, provider, updated_at')
  .eq('provider', 'google');

if (tokErr) {
  console.error('❌ Cannot read vanguard_tokens:', tokErr.message);
  console.log('→ Using anon key — might need service role key for this table');
} else if (!tokens || tokens.length === 0) {
  console.log('❌ NO Google refresh token found in vanguard_tokens!');
  console.log('→ Trzeba od nowa przejść przez autoryzację Google (kliknij "Synchronizuj" → autoryzuj)');
} else {
  console.log('✅ Google refresh token ZNALEZIONY w bazie:');
  for (const t of tokens) {
    console.log(`   user_id: ${t.user_id}, provider: ${t.provider}, updated: ${t.updated_at}`);
  }
}

console.log('\n=== Koniec diagnostyki ===');
