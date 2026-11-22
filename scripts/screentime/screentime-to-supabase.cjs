/**
 * screentime-to-supabase.cjs — iPhone Screen Time (eksporter na Macu) → phone_usage_daily
 *
 * Eksporter: https://github.com/nichtlegacy/screentime (`uv tool install`, lokalna baza SQLite).
 * Ten skrypt czyta z niego sesje iPhone'a (`screentime dump`), liczy dzienne podsumowania
 * w tym samym kształcie co Android/ActivityWatch i robi upsert do `phone_usage_daily`.
 *
 * USAGE:
 *   node scripts/screentime/screentime-to-supabase.cjs                 # podgląd, nic nie zapisuje
 *   node scripts/screentime/screentime-to-supabase.cjs --apply         # zapis
 *   --from YYYY-MM-DD   pierwszy dzień (domyślnie 7 dni wstecz)
 *   --device "NAZWA"    urządzenie z `screentime status` (domyślnie iPhone z najnowszymi danymi)
 *   --sync              przed odczytem uruchom `screentime sync` (wymaga Full Disk Access)
 *   --overwrite         pozwól nadpisać dni, które mają już ≥ 30 min (np. dane z Androida)
 *
 * Kategorie i okno „late night” (23:00–04:00 Warsaw) są takie jak w aw-phone-import.cjs.
 * Odblokowania (`unlocks`) nie są zapisywane: Screen Time ich nie udostępnia.
 */
const https = require('https');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const TZ = 'Europe/Warsaw';
const CATEGORIES = {
  social: ['musically', 'tiktok', 'twitter', 'x.android', 'instagram', 'badoo', 'snapchat', 'pinterest', 'reddit', 'threads', 'katana', 'linkedin', 'com.atebits.tweetie2', 'facebook.facebook'],
  messaging: ['orca', 'telegram', 'whatsapp', 'viber', 'signal', 'discord', 'slack', 'messenger'],
  entertainment: ['youtube', 'netflix', 'twitch', 'spotify', 'tidal', 'hbomax', 'prime', 'disney', 'game', 'chess', 'lichess', 'clashroyale', 'brawlstars'],
  ai: ['chatgpt', 'openai', 'grok', 'claude', 'anthropic', 'perplexity', 'gemini', 'bard', 'copilot', 'poe'],
  browser: ['chrome', 'brave', 'firefox', 'opera', 'edge', 'duckduckgo', 'sbrowser', 'mobilesafari', 'com.google.googlemobile'],
};
const BUCKET_SEC = 1800;

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const option = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };

function loadEnv() {
  const root = path.join(__dirname, '..', '..');
  for (const file of ['.env', '.env.local']) {
    const p = path.join(root, file);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
      const [k, ...rest] = line.split('=');
      if (k && rest.length && !process.env[k.trim()]) process.env[k.trim()] = rest.join('=').trim();
    }
  }
}

function screentime(cmdArgs) {
  const bin = path.join(os.homedir(), '.local', 'bin', 'screentime');
  const res = spawnSync(bin, cmdArgs, { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  if (res.status !== 0) throw new Error(`screentime ${cmdArgs[0]}: ${(res.stderr || res.stdout || '').slice(0, 300)}`);
  return res.stdout;
}

function pickIphone() {
  const wanted = option('--device');
  const devices = JSON.parse(screentime(['status'])).devices.filter((d) => d.platform === 'iphone' && d.events > 0);
  if (wanted) return wanted;
  devices.sort((a, b) => String(b.last_event_at).localeCompare(String(a.last_event_at)));
  if (!devices[0]) throw new Error('Brak iPhone\'a z danymi w `screentime status`');
  return devices[0].name;
}

const fmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: TZ, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit',
});
function warsaw(ms) {
  const p = Object.fromEntries(fmt.formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, secOfDay: (+p.hour) * 3600 + (+p.minute) * 60 + (+p.second) };
}

function categorize(session) {
  const key = `${session.bundle_id} ${session.title}`.toLowerCase();
  for (const [cat, words] of Object.entries(CATEGORIES)) if (words.some((w) => key.includes(w))) return cat;
  return 'inne';
}

/** Rozkłada sesję na dni i półgodzinne kubełki według czasu ściennego Warsaw. */
function addSession(days, session) {
  let t = Date.parse(session.start);
  const end = Date.parse(session.end);
  const cat = categorize(session);
  while (t < end) {
    const { date, secOfDay } = warsaw(t);
    const step = Math.min(end - t, (BUCKET_SEC - (secOfDay % BUCKET_SEC)) * 1000);
    const sec = step / 1000;
    const day = (days[date] ||= { total: 0, late: 0, cats: {}, apps: {}, buckets: new Array(48).fill(0) });
    day.total += sec;
    day.cats[cat] = (day.cats[cat] || 0) + sec;
    day.buckets[Math.min(47, Math.floor(secOfDay / BUCKET_SEC))] += sec;
    if (secOfDay >= 23 * 3600 || secOfDay < 4 * 3600) day.late += sec;
    const app = (day.apps[session.bundle_id] ||= { app: session.title || session.bundle_id, pkg: session.bundle_id, sec: 0 });
    app.sec += sec;
    t += step;
  }
}

/** Największe reszty: kategorie + „inne” sumują się do total. */
function allocate(totalMin, weights) {
  const keys = Object.keys(weights);
  const sum = keys.reduce((a, k) => a + weights[k], 0);
  const out = Object.fromEntries(keys.map((k) => [k, 0]));
  if (totalMin <= 0 || sum <= 0) return out;
  const parts = keys.map((k) => { const v = (weights[k] / sum) * totalMin; return { k, min: Math.floor(v), frac: v - Math.floor(v) }; });
  parts.forEach((p) => { out[p.k] = p.min; });
  let remain = totalMin - parts.reduce((a, p) => a + p.min, 0);
  const order = [...parts].sort((a, b) => b.frac - a.frac);
  for (let i = 0; remain > 0; i++, remain--) out[order[i % order.length].k] += 1;
  return out;
}

function toRows(days, userId, from) {
  return Object.entries(days).filter(([date]) => date >= from).sort(([a], [b]) => a.localeCompare(b)).map(([date, d]) => {
    const totalMin = Math.round(d.total / 60);
    const known = ['social', 'messaging', 'entertainment', 'ai', 'browser'];
    const weights = Object.fromEntries(known.map((k) => [k, d.cats[k] || 0]));
    weights.other = Math.max(0, d.total - known.reduce((a, k) => a + weights[k], 0));
    const m = allocate(totalMin, weights);
    return {
      user_id: userId, date, total_minutes: totalMin, late_night_minutes: Math.round(d.late / 60),
      social_minutes: m.social, messaging_minutes: m.messaging, entertainment_minutes: m.entertainment,
      ai_minutes: m.ai, browser_minutes: m.browser,
      top_apps: Object.values(d.apps).sort((a, b) => b.sec - a.sec).slice(0, 10).map((a) => ({ app: a.app, pkg: a.pkg, min: Math.round(a.sec / 60) })),
      usage_buckets: d.buckets.map((s) => Math.min(30, Math.round(s / 60))),
    };
  });
}

function request(method, url, key, body, extra = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const payload = body ? JSON.stringify(body) : null;
    const req = https.request({
      hostname: u.hostname, path: u.pathname + u.search, method,
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}), ...extra },
    }, (res) => { let out = ''; res.on('data', (c) => { out += c; }); res.on('end', () => resolve({ status: res.statusCode, body: out })); });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function main() {
  loadEnv();
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const userId = process.env.VANGUARD_USER_ID;
  if (!url || !key || !userId) throw new Error('Uzupełnij SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, VANGUARD_USER_ID w .env');

  if (flag('--sync')) screentime(['sync']);
  const device = pickIphone();
  const from = option('--from') || new Date(Date.now() - 7 * 864e5).toLocaleDateString('en-CA', { timeZone: TZ });
  const sessions = JSON.parse(screentime(['dump', '--format', 'json', '--from', from, '--device', device]));
  const days = {};
  sessions.filter((s) => s.category !== 'System').forEach((s) => addSession(days, s));
  const rows = toRows(days, userId, from);

  const existing = await request('GET', `${url}/rest/v1/phone_usage_daily?select=date,total_minutes&user_id=eq.${userId}&date=gte.${from}`, key);
  const have = Object.fromEntries(JSON.parse(existing.body).map((r) => [r.date, r.total_minutes || 0]));
  const blocked = (r) => !flag('--overwrite') && (have[r.date] || 0) >= 30;

  console.log(`\nScreen Time → phone_usage_daily · ${device} · od ${from} · ${flag('--apply') ? 'ZAPIS' : 'PODGLĄD'}\n`);
  for (const r of rows) {
    const note = blocked(r) ? `  ⚠ pomijam: dzień ma już ${have[r.date]} min (użyj --overwrite)` : have[r.date] !== undefined ? `  (zastąpi ${have[r.date]} min)` : '';
    console.log(`  ${r.date}  ${String(r.total_minutes).padStart(4)} min  noc ${String(r.late_night_minutes).padStart(3)}  soc ${r.social_minutes}  msg ${r.messaging_minutes}  ent ${r.entertainment_minutes}  ai ${r.ai_minutes}  top: ${r.top_apps[0]?.app}${note}`);
  }
  if (!flag('--apply')) return console.log('\nPodgląd. Dodaj --apply, żeby zapisać.');

  const toWrite = rows.filter((r) => !blocked(r));
  const res = toWrite.length ? await request('POST', `${url}/rest/v1/phone_usage_daily?on_conflict=user_id,date`, key, toWrite, { Prefer: 'resolution=merge-duplicates' }) : { status: 204, body: '' };
  if (res.status >= 300) throw new Error(`Supabase ${res.status}: ${res.body.slice(0, 200)}`);
  console.log(`\nZapisano ${toWrite.length}/${rows.length} dni.`);
}

main().catch((e) => { console.error('Błąd:', e.message); process.exit(1); });
