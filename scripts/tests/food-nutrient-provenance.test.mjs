import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
const owner = '11111111-1111-4111-8111-111111111111';
try {
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS
      $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    CREATE TABLE daily_food_entries (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, date date, name text, brand text,
      calories integer, protein numeric, carbs numeric, fat numeric, fiber numeric, sugar numeric,
      saturated_fat numeric, salt numeric, meal_type text, amount text, logged_at timestamptz,
      meal_group_id uuid, parse_meta jsonb, request_id uuid
    );
    CREATE TABLE food_favorites (
      id uuid DEFAULT gen_random_uuid(), user_id uuid, name text, brand text, barcode text,
      calories integer, protein numeric, carbs numeric, fat numeric, fiber numeric, sugar numeric,
      saturated_fat numeric, default_grams integer, is_pinned boolean,
      use_count integer DEFAULT 1, last_used timestamptz DEFAULT now()
    );
    CREATE UNIQUE INDEX favorite_name ON food_favorites(user_id,name,coalesce(brand,''));
    CREATE TABLE food_library (
      user_id uuid, name text, brand text, barcode text, calories numeric,
      protein numeric, carbs numeric, fat numeric, fiber numeric, sugar numeric,
      saturated_fat numeric, default_grams integer, source text
    );
    CREATE UNIQUE INDEX library_name ON food_library(user_id,name,coalesce(brand,''));
    CREATE FUNCTION public._recompute_daily_nutrition(uuid,date) RETURNS void LANGUAGE sql AS $$ SELECT $$;
    CREATE FUNCTION public.cache_food_to_library(uuid,text,text,text,numeric,numeric,numeric,numeric,numeric,numeric,integer,numeric)
      RETURNS void LANGUAGE sql AS $$ SELECT $$;
  `);
  await db.exec(await readFile('supabase/migrations/20261027160425_food_nutrient_provenance.sql', 'utf8'));
  await db.exec(await readFile('supabase/migrations/20261021211000_update_food_entry_saturated_fat.sql', 'utf8'));
  await db.exec(await readFile('supabase/migrations/20261027222927_food_entry_portion_micronutrients.sql', 'utf8'));
  const payload = {
    name: 'Chleb', calories: 250, protein: 8, carbs: 48, fat: 2,
    fiber: 6, sugar: 3, saturated_fat: 0.5, salt: 1.2,
    request_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    parse_meta: { micronutrientSources: { salt: 'data', fiber: 'estimate' } },
  };
  const add = () => db.query('SELECT add_food_entry($1,$2,50,$3::jsonb)', [owner, '2026-10-27', JSON.stringify(payload)]);
  await add();
  const entry = (await db.query('SELECT * FROM daily_food_entries')).rows[0];
  assert.equal(Number(entry.salt), 0.6, 'salt scales with the portion');
  assert.equal(Number(entry.saturated_fat), 0.3);
  const favorite = (await db.query('SELECT * FROM food_favorites')).rows[0];
  assert.equal(Number(favorite.salt), 1.2, 'favorites store salt per 100 g');
  assert.deepEqual(favorite.nutrient_sources, { salt: 'data', fiber: 'estimate', sugar: 'unknown', saturated_fat: 'unknown' });
  await add();
  assert.equal((await db.query('SELECT count(*)::int as n FROM daily_food_entries')).rows[0].n, 1, 'retries are idempotent');
  await db.query('SELECT add_food_entry($1,$2,50,$3::jsonb)', [owner, '2026-10-27', JSON.stringify({ ...payload, fiber: 10, salt: null, request_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', parse_meta: {} })]);
  const reused = (await db.query('SELECT * FROM food_favorites')).rows[0];
  assert.equal(reused.nutrient_sources.fiber, 'unknown', 'a replacement value without provenance must not inherit old certainty');
  assert.equal(reused.nutrient_sources.salt, 'data', 'a retained value keeps its actual origin');
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", ['22222222-2222-4222-8222-222222222222']);
  await assert.rejects(add, /forbidden/);
  await db.exec("SELECT set_config('request.jwt.claim.sub','',false)");
  const cache = (salt, sources) => db.query(`SELECT cache_food_to_library(
    $1,'Chleb',null,null,250,8,48,2,6,3,100,0.5,$2,$3::jsonb
  )`, [owner, salt, JSON.stringify(sources)]);
  await cache(null, {});
  await cache(1.2, { salt: 'data' });
  await cache(2.5, { salt: 'estimate' });
  const library = (await db.query('SELECT * FROM food_library')).rows[0];
  assert.equal(Number(library.salt), 1.2, 'model guesses cannot overwrite label salt');
  assert.equal(library.nutrient_sources.salt, 'data');
  await cache(1.1, { salt: 'data' });
  assert.equal(Number((await db.query('SELECT salt FROM food_library')).rows[0].salt), 1.1, 'new label data refreshes the cache');
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [owner]);
  await db.query('SELECT update_food_entry($1,$2,$3::jsonb)', [owner, entry.id, JSON.stringify({ amount: '100 g', calories: 250, protein: 8, carbs: 48, fat: 2 })]);
  const resized = (await db.query('SELECT * FROM daily_food_entries WHERE id=$1', [entry.id])).rows[0];
  assert.equal(Number(resized.salt), 1.2, 'editing grams scales stored salt with the whole portion');
  assert.equal(Number(resized.saturated_fat), 0.6, 'editing scales the previously rounded saturated fat');
  assert.equal(Number(resized.fiber), 6);
  assert.equal(Number(resized.sugar), 3);
  await db.query('UPDATE daily_food_entries SET amount=$1 WHERE id=$2', ['100 gr', entry.id]);
  await db.query('SELECT update_food_entry($1,$2,$3::jsonb)', [owner, entry.id, JSON.stringify({ amount: '200 g' })]);
  assert.equal(Number((await db.query('SELECT salt FROM daily_food_entries WHERE id=$1', [entry.id])).rows[0].salt), 2.4, 'historical gr abbreviation follows the canonical parser');
  await db.query('SELECT update_food_entry($1,$2,$3::jsonb)', [owner, entry.id, JSON.stringify({ amount: '100 gr' })]);
  assert.equal(Number((await db.query('SELECT salt FROM daily_food_entries WHERE id=$1', [entry.id])).rows[0].salt), 1.2, 'the same abbreviation is valid in a new amount');
  await db.query('UPDATE daily_food_entries SET amount=$1 WHERE id=$2', ['0,1 kg', entry.id]);
  await db.query('SELECT update_food_entry($1,$2,$3::jsonb)', [owner, entry.id, JSON.stringify({ amount: '50 g' })]);
  assert.equal(Number((await db.query('SELECT salt FROM daily_food_entries WHERE id=$1', [entry.id])).rows[0].salt), 0.6, 'unit conversion uses the mass, not the first number');
  await db.query('SELECT update_food_entry($1,$2,$3::jsonb)', [owner, entry.id, JSON.stringify({ amount: '100 g', salt: 0.9 })]);
  assert.equal(Number((await db.query('SELECT salt FROM daily_food_entries WHERE id=$1', [entry.id])).rows[0].salt), 0.9, 'an explicit nutrient correction wins over proportional scaling');
  await db.query('SELECT update_food_entry($1,$2,$3::jsonb)', [owner, entry.id, JSON.stringify({ salt: null })]);
  assert.equal((await db.query('SELECT salt FROM daily_food_entries WHERE id=$1', [entry.id])).rows[0].salt, null, 'explicitly missing data stays missing');
  await db.query('UPDATE daily_food_entries SET amount=$1, salt=1.2 WHERE id=$2', ['1 porcja', entry.id]);
  await db.query('SELECT update_food_entry($1,$2,$3::jsonb)', [owner, entry.id, JSON.stringify({ amount: '300 g' })]);
  assert.equal(Number((await db.query('SELECT salt FROM daily_food_entries WHERE id=$1', [entry.id])).rows[0].salt), 1.2, 'assigning mass to an unweighed old portion preserves its whole-portion nutrients');
  await assert.rejects(() => db.query('SELECT update_food_entry($1,$2,$3::jsonb)', [owner, entry.id, JSON.stringify({ amount: '0 g' })]), /invalid portion mass/);
  await db.exec("SELECT set_config('request.jwt.claim.sub','',false)");
  await assert.rejects(() => db.query('SELECT update_food_entry($1,$2,$3::jsonb)', [owner, entry.id, '{}']), /forbidden/);
  await db.exec(`
    CREATE SCHEMA cron; CREATE SCHEMA net;
    CREATE TABLE cron.job(jobid bigint,jobname text,command text);
    INSERT INTO cron.job VALUES(1,'food-integrity-audit',$cmd$SELECT net.http_post(body := '{}'::jsonb)$cmd$);
    CREATE FUNCTION cron.alter_job(job_id bigint,command text) RETURNS void LANGUAGE sql AS
      $$ UPDATE cron.job SET command=$2 WHERE jobid=$1 $$;
    CREATE FUNCTION net.http_post(body jsonb,timeout_milliseconds integer DEFAULT 5000) RETURNS integer LANGUAGE sql AS
      $$ SELECT timeout_milliseconds $$;
  `);
  const timeoutMigration = await readFile('supabase/migrations/20261027161423_food_audit_cron_timeout.sql', 'utf8');
  await db.exec(timeoutMigration);
  await db.exec(timeoutMigration);
  const cron = (await db.query('SELECT command FROM cron.job WHERE jobid=1')).rows[0].command;
  assert.equal(Object.values((await db.query(cron)).rows[0])[0], 120000, 'scheduled audit receives its full timeout, also after migration retry');
  console.log('Food nutrient SQL: portion scaling, provenance, cache precedence, retries, owner guard PASS');
} finally {
  await db.close();
}
