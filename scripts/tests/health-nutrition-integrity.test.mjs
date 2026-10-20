import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
try {
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE TABLE daily_food_entries (
      id integer PRIMARY KEY, user_id uuid NOT NULL, date date NOT NULL,
      calories integer, protein numeric, carbs numeric, fat numeric,
      fiber numeric, sugar numeric, insulin_load numeric
    );
    CREATE TABLE daily_nutrition (
      user_id uuid, date date, calories integer, protein numeric, carbs numeric,
      fat numeric, fiber numeric, sugar numeric, insulin_load numeric,
      UNIQUE(user_id,date)
    );
  `);
  const baseline = await readFile('supabase/migrations/20260504000000_baseline.sql', 'utf8');
  const start = baseline.indexOf('CREATE OR REPLACE FUNCTION "public"."_recompute_daily_nutrition"');
  const end = baseline.indexOf('ALTER FUNCTION "public"."_recompute_daily_nutrition"', start);
  await db.exec(baseline.slice(start, end));
  await db.exec(await readFile('supabase/migrations/20261014115624_health_nutrition_totals_integrity.sql', 'utf8'));
  const owner = '11111111-1111-4111-8111-111111111111';
  const other = '22222222-2222-4222-8222-222222222222';
  await db.query('INSERT INTO daily_food_entries(id,user_id,date,calories,protein) VALUES (1,$1,$2,400,25)', [owner, '2026-10-14']);
  const total = async (user, date) => (await db.query('SELECT calories FROM daily_nutrition WHERE user_id=$1 AND date=$2', [user, date])).rows[0]?.calories;
  assert.equal(await total(owner, '2026-10-14'), 400, 'direct capture must update the daily aggregate');
  await db.query('INSERT INTO daily_food_entries(id,user_id,date,calories) VALUES (2,$1,$2,600)', [owner, '2026-10-14']);
  assert.equal(await total(owner, '2026-10-14'), 1000);
  await db.query('INSERT INTO daily_food_entries(id,user_id,date,calories) VALUES (3,$1,$2,900)', [other, '2026-10-14']);
  await db.exec("UPDATE daily_food_entries SET date='2026-10-15',calories=500 WHERE id=1");
  assert.equal(await total(owner, '2026-10-14'), 600, 'moving an entry must recompute the old day');
  assert.equal(await total(owner, '2026-10-15'), 500, 'moving an entry must recompute the new day');
  assert.equal(await total(other, '2026-10-14'), 900, 'other users remain separate');
  await db.exec('DELETE FROM daily_food_entries WHERE id=1');
  assert.equal(await total(owner, '2026-10-15'), 0, 'removing the last entry must clear the aggregate');
  console.log('Nutrition SQL integrity: insert/update/move/delete/owner isolation PASS');
} finally {
  await db.close();
}
