/**
 * Restore missing calendar events for week 27 Jul - 2 Aug 2026
 * Based on screenshot comparison between desired and current state.
 *
 * Missing events (visible in screen 1 but absent in screen 3):
 * - Logopeda          Mon 27 Jul, 15:45-17:38
 * - wypad z kondziem  Mon 27 Jul, 18:05-19:00
 * - Montowanie internetu Wed 29 Jul, 10:00-10:30
 * - Tenis             Wed 29 Jul, 19:00-20:30
 * - Piłka Kondzio Babcia Thu 30 Jul, 16:30-18:00
 *
 * Run: node scripts/ops/restore-missing-events.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import crypto from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '../../.env');

let env = {};
try {
  const raw = readFileSync(envPath, 'utf8');
  for (const line of raw.split('\n')) {
    const [k, ...rest] = line.split('=');
    if (k && rest.length) env[k.trim()] = rest.join('=').trim().replace(/\r$/, '');
  }
} catch {
  console.error('Cannot read .env');
  process.exit(1);
}

const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SERVICE_KEY = env.SB_SECRET_KEY;
const USER_ID = env.VANGUARD_USER_ID;

if (!SUPABASE_URL || !SERVICE_KEY || !USER_ID) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// Events to restore — times in Europe/Warsaw (UTC+2 in summer)
const events = [
  {
    summary: 'Logopeda',
    start: '2026-07-27T15:45:00+02:00',
    end:   '2026-07-27T17:38:00+02:00',
    category: 'prywatne',
  },
  {
    summary: 'wypad z kondziem',
    start: '2026-07-27T18:05:00+02:00',
    end:   '2026-07-27T19:00:00+02:00',
    category: 'prywatne',
  },
  {
    summary: 'Sauna ⚠️',
    start: '2026-07-27T21:07:00+02:00',
    end:   '2026-07-27T21:25:00+02:00',
    category: 'sport',
  },
  {
    summary: 'Montowanie internetu',
    start: '2026-07-29T10:00:00+02:00',
    end:   '2026-07-29T10:30:00+02:00',
    category: 'praca',
  },
  {
    summary: 'Tenis',
    start: '2026-07-29T19:00:00+02:00',
    end:   '2026-07-29T20:30:00+02:00',
    category: 'sport',
  },
  {
    summary: 'Sauna ⚠️',
    start: '2026-07-29T20:56:00+02:00',
    end:   '2026-07-29T21:06:00+02:00',
    category: 'sport',
  },
  {
    summary: 'Piłka Kondzio Babcia',
    start: '2026-07-31T16:30:00+02:00',
    end:   '2026-07-31T18:00:00+02:00',
    category: 'prywatne',
  },
];

console.log('=== Restoring missing calendar events ===\n');

let ok = 0;
let fail = 0;

for (const ev of events) {
  const event_id = `vanguard-${crypto.randomUUID()}`;
  const { error } = await supabase.from('vanguard_calendar').insert({
    user_id: USER_ID,
    event_id,
    summary: ev.summary,
    start_time: ev.start,
    end_time: ev.end,
    category: ev.category,
    description: null,
    recurrence: null,
    series_id: null,
  });

  if (error) {
    console.error(`❌ FAIL: ${ev.summary} — ${error.message}`);
    fail++;
  } else {
    console.log(`✅ OK:  ${ev.summary} (${ev.start.slice(0,10)} ${ev.start.slice(11,16)}–${ev.end.slice(11,16)})`);
    ok++;
  }
}

console.log(`\n=== Gotowe: ${ok} dodano, ${fail} błędów ===`);
console.log('\nTeraz kliknij Sync w aplikacji żeby te wydarzenia pojawiły się też na GCalendar.');
console.log('(lub odśwież aplikację — pojawią się natychmiast w kalendarzu Sparky)');
