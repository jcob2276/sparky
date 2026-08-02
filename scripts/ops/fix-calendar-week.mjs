/**
 * fix-calendar-week.mjs
 * 1. Usuwa WSZYSTKIE vanguard-* zdarzenia dla tygodnia 27 lip – 2 sie (duplikaty)
 * 2. Wstawia każde RAZ do vanguard_calendar
 * 3. Pushuje je do Google Calendar API (używa refresh_token z bazy)
 *
 * Run: node scripts/ops/fix-calendar-week.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import crypto from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const env = Object.fromEntries(
  readFileSync(join(__dirname, '../../.env'), 'utf8')
    .split('\n')
    .filter(l => l.includes('='))
    .map(l => { const [k, ...v] = l.split('='); return [k.trim(), v.join('=').trim().replace(/\r$/, '')]; })
);

const supabase = createClient(env.VITE_SUPABASE_URL, env.SB_SECRET_KEY);
const USER_ID = env.VANGUARD_USER_ID;
const GCAL_BASE = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

// --- 1. Get Google access token ---
async function getAccessToken() {
  const { data } = await supabase
    .from('vanguard_tokens')
    .select('refresh_token')
    .eq('user_id', USER_ID)
    .eq('provider', 'google')
    .maybeSingle();

  if (!data?.refresh_token) { console.warn('⚠️  Brak Google refresh_token — skip GCal push'); return null; }

  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: data.refresh_token,
      client_id: '111163364613-nqd67ulputbk8ehbusls071g0ae4k2om.apps.googleusercontent.com',
      client_secret: env.GOOGLE_CLIENT_SECRET ?? '',
      grant_type: 'refresh_token',
    }),
  });
  if (!r.ok) { console.warn('⚠️  Token refresh failed:', r.status); return null; }
  const { access_token } = await r.json();
  return access_token ?? null;
}

// Events to restore (once)
const EVENTS = [
  { summary: 'Logopeda',            start: '2026-07-27T15:45:00+02:00', end: '2026-07-27T17:38:00+02:00', category: 'prywatne' },
  { summary: 'wypad z kondziem',    start: '2026-07-27T18:05:00+02:00', end: '2026-07-27T19:00:00+02:00', category: 'prywatne' },
  { summary: 'Sauna ⚠️',           start: '2026-07-27T21:07:00+02:00', end: '2026-07-27T21:25:00+02:00', category: 'sport'    },
  { summary: 'Montowanie internetu',start: '2026-07-29T10:00:00+02:00', end: '2026-07-29T10:30:00+02:00', category: 'praca'    },
  { summary: 'Tenis',               start: '2026-07-29T19:00:00+02:00', end: '2026-07-29T20:30:00+02:00', category: 'sport'    },
  { summary: 'Sauna ⚠️',           start: '2026-07-29T20:56:00+02:00', end: '2026-07-29T21:06:00+02:00', category: 'sport'    },
  { summary: 'Piłka Kondzio Babcia',start: '2026-07-31T16:30:00+02:00', end: '2026-07-31T18:00:00+02:00', category: 'prywatne' },
];

console.log('=== STEP 1: Delete all vanguard-* duplicates for this week ===\n');

const { error: delErr, count } = await supabase
  .from('vanguard_calendar')
  .delete({ count: 'exact' })
  .eq('user_id', USER_ID)
  .gte('start_time', '2026-07-27T00:00:00+02:00')
  .lte('start_time', '2026-08-02T23:59:59+02:00')
  .like('event_id', 'vanguard-%');

if (delErr) {
  console.error('❌ Delete failed:', delErr.message);
  process.exit(1);
}
console.log(`🗑  Deleted ${count ?? '?'} vanguard-* rows\n`);

console.log('=== STEP 2: Insert each event once ===\n');

const access_token = await getAccessToken();
if (access_token) console.log('✅ Google access_token obtained\n');
else console.log('⚠️  No Google token — will only insert locally\n');

let localOk = 0, gcalOk = 0;

for (const ev of EVENTS) {
  const event_id = `vanguard-${crypto.randomUUID()}`;

  // Insert to Supabase
  const { error: insErr } = await supabase.from('vanguard_calendar').insert({
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

  if (insErr) {
    console.error(`❌ DB insert FAIL: ${ev.summary} — ${insErr.message}`);
    continue;
  }
  localOk++;

  // Push to Google Calendar
  if (access_token) {
    try {
      const gcalRes = await fetch(GCAL_BASE, {
        method: 'POST',
        headers: { Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary: ev.summary,
          start: { dateTime: ev.start, timeZone: 'Europe/Warsaw' },
          end:   { dateTime: ev.end,   timeZone: 'Europe/Warsaw' },
        }),
      });
      if (gcalRes.ok) {
        const created = await gcalRes.json();
        // Update event_id to the one Google assigned
        await supabase.from('vanguard_calendar')
          .update({ event_id: created.id })
          .eq('event_id', event_id);
        console.log(`✅ ${ev.summary}  →  DB + GCal (${ev.start.slice(5,10)} ${ev.start.slice(11,16)})`);
        gcalOk++;
      } else {
        const txt = await gcalRes.text();
        console.error(`⚠️  ${ev.summary} → DB OK, GCal ${gcalRes.status}: ${txt.slice(0,100)}`);
      }
    } catch (e) {
      console.error(`⚠️  ${ev.summary} → DB OK, GCal error: ${e}`);
    }
  } else {
    console.log(`✅ ${ev.summary}  →  DB only (${ev.start.slice(5,10)} ${ev.start.slice(11,16)})`);
  }
}

console.log(`\n=== GOTOWE: ${localOk} w DB, ${gcalOk} w Google Calendar ===`);
