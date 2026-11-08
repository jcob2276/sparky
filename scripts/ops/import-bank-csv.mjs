#!/usr/bin/env node
/**
 * Import starszej historii z eksportu CSV Pekao ("Lista operacji") do bank_transactions.
 * Plik z danymi NIE trafia do repo; skrypt czyta go z podanej sciezki i pisze do linked projektu przez `supabase db query`.
 *
 * Uzycie:
 *   node scripts/ops/import-bank-csv.mjs --file <plik.csv> [--account <uuid>] [--before RRRR-MM-DD]        (walidacja, nic nie zapisuje)
 *   node scripts/ops/import-bank-csv.mjs --file <plik.csv> [--account <uuid>] [--before RRRR-MM-DD] --apply (zapis)
 *
 * --before: importuje tylko wiersze o dacie ksiegowania PRZED ta data (domyslnie: najstarsza transakcja z API),
 *           zeby nie dublowac tego, co pobiera synchronizacja z banku. Zapis jest idempotentny.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined; };
const FILE = opt('file');
const APPLY = args.includes('--apply');
if (!FILE) { console.error('Brak --file <plik.csv>'); process.exit(1); }

const tmp = mkdtempSync(join(tmpdir(), 'bank-import-'));
process.on('exit', () => rmSync(tmp, { recursive: true, force: true })); // pliki SQL zawieraja dane bankowe, nie zostawiamy ich
let seq = 0;
function query(sql) {
  const f = join(tmp, `q${seq++}.sql`);
  writeFileSync(f, sql, 'utf8');
  const out = execFileSync('supabase', ['db', 'query', '--linked', '-o', 'json', '-f', f],
    { encoding: 'utf8', shell: process.platform === 'win32', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
  const s = out.slice(out.indexOf('{'), out.lastIndexOf('}') + 1);
  return JSON.parse(s).rows ?? [];
}

const iso = (d) => d.split('.').reverse().join('-');
const num = (s) => Number(s.replace(/\s/g, '').replace(',', '.')); // \s obejmuje tez twarda spacje
const unq = (s) => (s ?? '').replace(/^'/, '').trim();
const norm = (s) => (s ?? '').toUpperCase().replace(/\s+/g, ' ').trim();

function parseCsv(path) {
  const lines = readFileSync(path, 'utf8').replace(/^\s+/, '').split(/\r?\n/).filter(Boolean); // \s zjada tez BOM
  const head = lines[0].split(';');
  const col = (n) => head.findIndex((h) => h.trim().toLowerCase() === n.toLowerCase());
  const idx = {
    booked: col('Data księgowania'), value: col('Data waluty'), name: col('Nadawca / Odbiorca'), src: col('Rachunek źródłowy'),
    dst: col('Rachunek docelowy'), title: col('Tytułem'), amount: col('Kwota operacji'), ccy: col('Waluta'),
    ref: col('Numer referencyjny'), type: col('Typ operacji'), cat: col('Kategoria'),
  };
  for (const [k, v] of Object.entries(idx)) if (v < 0) throw new Error(`Brak kolumny: ${k}. Nagłówek: ${lines[0]}`);
  const seen = new Map();
  return lines.slice(1).map((line) => {
    // Pole w cudzysłowie (np. nazwa z cudzysłowem w środku) ma podwojone "" w środku. Średnik w polu nie występuje (sprawdzane niżej).
    const c = line.split(';').map((f) => (/^".*"$/.test(f) ? f.slice(1, -1).replace(/""/g, '"') : f));
    if (c.length !== head.length) throw new Error(`Niespodziewana liczba pól (${c.length}): ${line.slice(0, 80)}`);
    const amount = num(c[idx.amount]);
    if (!Number.isFinite(amount)) throw new Error(`Niepoprawna kwota: ${c[idx.amount]}`);
    const debit = amount < 0;
    const iban = unq(debit ? c[idx.dst] : c[idx.src]).replace(/\s/g, '');
    const title = c[idx.title].trim();
    const remittance = !title || /^\*+\d*$/.test(title) ? c[idx.type].trim() : title;
    const base = createHash('sha1').update([c[idx.booked], amount, c[idx.name], title, c[idx.ref]].join('|')).digest('hex').slice(0, 16);
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    const raw = Object.fromEntries(head.map((h, i) => [h.trim(), c[i]]));
    return {
      transaction_id: `csv:${base}${n > 1 ? `:${n}` : ''}`,
      amount, currency: c[idx.ccy].trim() || 'PLN', direction: debit ? 'debit' : 'credit',
      booking_date: iso(c[idx.booked]), value_date: c[idx.value] ? iso(c[idx.value]) : null,
      counterparty_name: c[idx.name].trim() || null,
      counterparty_iban: /^\d{26}$/.test(iban) ? `PL${iban}` : (iban || null),
      remittance: remittance || null,
      raw: { ...raw, _source: 'csv-import', _bank_category: c[idx.cat].trim() },
    };
  });
}

const sq = (s) => (s === null || s === undefined ? 'null' : `'${String(s).replace(/'/g, "''")}'`);
const key = (d, a, n) => `${d}|${Number(a).toFixed(2)}|${norm(n)}`;

const accounts = query('select id::text, user_id::text, iban, hidden from bank_accounts where not hidden');
const wanted = opt('account');
const account = wanted ? accounts.find((a) => a.id === wanted) : accounts.length === 1 ? accounts[0] : null;
if (!account) { console.error(`Podaj --account <uuid>. Widoczne rachunki: ${accounts.map((a) => a.id).join(', ')}`); process.exit(1); }

const api = query(`select booking_date::text d, amount::text a, counterparty_name n from bank_transactions where account_id = '${account.id}' and transaction_id like 'entry:%'`);
const minApi = api.map((r) => r.d).sort()[0];
const before = opt('before') ?? minApi;
const rows = parseCsv(FILE);
console.log(`CSV: ${rows.length} wierszy, ${rows.map((r) => r.booking_date).sort()[0]} .. ${rows.map((r) => r.booking_date).sort().at(-1)}`);
console.log(`API (rachunek ${account.id.slice(0, 8)}): ${api.length} transakcji od ${minApi}; import tylko wiersze sprzed ${before}`);

// Walidacja na okresie, ktory ma obie strony: te same operacje powinny sie zgadzac co do daty, kwoty i kontrahenta.
const bag = (list) => list.reduce((m, [d, a, n]) => m.set(key(d, a, n), (m.get(key(d, a, n)) ?? 0) + 1), new Map());
const csvOverlap = bag(rows.filter((r) => r.booking_date >= minApi && r.booking_date <= api.map((x) => x.d).sort().at(-1)).map((r) => [r.booking_date, r.amount, r.counterparty_name]));
const apiBag = bag(api.map((r) => [r.d, r.a, r.n]));
let matched = 0; const csvOnly = []; const apiOnly = [];
for (const [k, v] of csvOverlap) { const m = Math.min(v, apiBag.get(k) ?? 0); matched += m; if (v > m) csvOnly.push([k, v - m]); }
for (const [k, v] of apiBag) { const m = Math.min(v, csvOverlap.get(k) ?? 0); if (v > m) apiOnly.push([k, v - m]); }
console.log(`WALIDACJA okresu wspolnego: zgodne ${matched}, tylko w CSV ${csvOnly.reduce((s, x) => s + x[1], 0)}, tylko w API ${apiOnly.reduce((s, x) => s + x[1], 0)}`);
const SHOW = args.includes('--verbose') ? Infinity : 5;
csvOnly.slice(0, SHOW).forEach(([k, n]) => console.log(`  tylko CSV: ${k} x${n}`));
apiOnly.slice(0, SHOW).forEach(([k, n]) => console.log(`  tylko API: ${k} x${n}`));

const toImport = rows.filter((r) => r.booking_date < before);
const sum = toImport.reduce((s, r) => s + r.amount, 0);
console.log(`DO IMPORTU: ${toImport.length} wierszy (${toImport.length ? `${toImport.map((r) => r.booking_date).sort()[0]} .. ${toImport.map((r) => r.booking_date).sort().at(-1)}` : '-'}), suma ${sum.toFixed(2)} PLN`);
const ids = new Set(toImport.map((r) => r.transaction_id));
if (ids.size !== toImport.length) throw new Error('Powtorzone transaction_id w importowanych wierszach');

if (!APPLY) { console.log('Tryb walidacji: nic nie zapisano. Dodaj --apply, aby zapisac.'); process.exit(0); }

const countBefore = Number(query(`select count(*) c from bank_transactions where account_id = '${account.id}'`)[0].c);
for (let i = 0; i < toImport.length; i += 150) {
  const chunk = toImport.slice(i, i + 150);
  const values = chunk.map((r) => `('${account.user_id}', '${account.id}', ${sq(r.transaction_id)}, ${r.amount}, ${sq(r.currency)}, ${sq(r.direction)}, ${sq(r.booking_date)}, ${sq(r.value_date)}, ${sq(r.counterparty_name)}, ${sq(r.counterparty_iban)}, ${sq(r.remittance)}, $j$${JSON.stringify(r.raw)}$j$::jsonb)`).join(',\n');
  query(`insert into bank_transactions (user_id, account_id, transaction_id, amount, currency, direction, booking_date, value_date, counterparty_name, counterparty_iban, remittance, raw) values\n${values}\non conflict (account_id, transaction_id) do nothing returning 1`);
}
const countAfter = Number(query(`select count(*) c from bank_transactions where account_id = '${account.id}'`)[0].c);
console.log(`ZAPISANO: ${countAfter - countBefore} nowych wierszy (konto mialo ${countBefore}, ma ${countAfter}).`);
