import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const modulePath = process.env.SPARKY_SQL_TEST_MODULE ?? '.superpowers/sdd/bevel-intelligence/sql-runtime/node_modules/@electric-sql/pglite/dist/index.js';
const { PGlite } = await import(pathToFileURL(resolve(modulePath)).href);
const db = new PGlite();
const owner = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
try {
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    CREATE TABLE goal_kpis(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL,pillar text NOT NULL,
      name text NOT NULL,unit text NOT NULL,target numeric,higher_is_better boolean DEFAULT true);
    CREATE TABLE nutrition_profile(user_id uuid PRIMARY KEY,goal_body_fat numeric,updated_at timestamptz);
    CREATE TABLE vanguard_preferences(user_id uuid,key text,value text,is_active boolean,updated_at timestamptz,UNIQUE(user_id,key));
    ALTER TABLE goal_kpis ENABLE ROW LEVEL SECURITY;
    CREATE POLICY owner_read ON goal_kpis FOR SELECT TO authenticated USING(user_id=auth.uid());
    GRANT USAGE ON SCHEMA auth TO authenticated; GRANT SELECT ON goal_kpis TO authenticated;
  `);
  if (!process.env.SPARKY_SKIP_GOAL_MIGRATION) await db.exec(await readFile('supabase/migrations/20261014115309_health_goal_standards.sql','utf8'));
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [owner]);
  const goal = { revision: 0, name: '13% BF', unit: 'percent', target: 13,
    spec: { kind: 'body_fat', variant: null, standard: null, priority: 1, reserveReps: null } };
  let constraints = { revision: 0, availability: [{ day: 1, minutes: 60 }], equipment: ['barbell'], limitations: [] };
  const save = async (goals, input = constraints) => db.query('SELECT save_health_goals($1::jsonb,$2::jsonb)', [JSON.stringify(goals),JSON.stringify(input)]);
  await save([goal]);
  const saved = (await db.query('SELECT * FROM goal_kpis')).rows[0];
  assert.equal(saved.target, '13');
  assert.equal((await db.query('SELECT goal_body_fat FROM nutrition_profile')).rows[0].goal_body_fat,'13');
  await assert.rejects(save([goal]), /constraints changed/i, 'retry cannot create duplicate goals');
  constraints = { ...constraints, revision: 1 };
  await save([{ ...goal, id: saved.id, revision: 1, target: 14 }]);
  const edited = (await db.query('SELECT * FROM goal_kpis')).rows[0];
  assert.equal(edited.revision,2);
  assert.equal(edited.measurement_history[0].target,13);
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [other]);
  await assert.rejects(save([{ ...goal, id: saved.id, revision: 2 }], { ...constraints, revision: 0 }), /not found/i);
  await db.exec('SET ROLE authenticated');
  assert.equal((await db.query('SELECT * FROM goal_kpis')).rows.length,0);
  await db.exec('RESET ROLE');
  await db.query("SELECT set_config('request.jwt.claim.sub','',false)");
  await assert.rejects(save([]), /Authentication required/);
  console.log('Health goal SQL: persistence/profile sync/revisions/history/retry/owner isolation PASS');
} catch (error) {
  console.error(error.message); process.exitCode = 1;
} finally { await db.close(); }
