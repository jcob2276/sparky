import {strict as assert} from 'node:assert';
import {readFile,readdir} from 'node:fs/promises';
import {test} from 'node:test';
import {PGlite} from '@electric-sql/pglite';

test('body estimates and Oura step projections have one input contract', async()=>{
 const db=new PGlite();
 const owner='11111111-1111-4111-8111-111111111111';
 const other='22222222-2222-4222-8222-222222222222';
 try {
  await db.exec(`CREATE SCHEMA auth; CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
   CREATE TABLE auth.users(id uuid PRIMARY KEY);
   INSERT INTO auth.users VALUES('${owner}'),('${other}');
   CREATE TABLE nutrition_profile(user_id uuid PRIMARY KEY,height_cm numeric,sex text);
   CREATE TABLE body_metrics(id uuid DEFAULT gen_random_uuid(),user_id uuid,date date,waist numeric,belly numeric,neck numeric,hips numeric,body_fat numeric);
   CREATE TABLE oura_daily_summary(id uuid DEFAULT gen_random_uuid(),user_id uuid,date date,steps integer,UNIQUE(user_id,date));
   CREATE TABLE oura_enhanced(id uuid DEFAULT gen_random_uuid(),user_id uuid,date date,steps integer,UNIQUE(user_id,date));
   INSERT INTO nutrition_profile VALUES('${owner}',180,'M'),('${other}',165,'F');`);
  await db.exec(await readFile('supabase/migrations/20260825000000_fix_compute_navy_bf_search_path.sql','utf8'));
  await db.exec(`CREATE TRIGGER trg_navy_bf BEFORE INSERT OR UPDATE OF neck,waist,hips ON body_metrics FOR EACH ROW EXECUTE FUNCTION compute_navy_bf();
   INSERT INTO body_metrics(user_id,date,waist,belly,neck) VALUES('${owner}','2026-10-01',87,95,37);
   INSERT INTO body_metrics(user_id,date,waist,belly,neck,body_fat) VALUES('${owner}','2026-10-02',87,95,37,17);
   UPDATE body_metrics SET body_fat=17 WHERE date='2026-10-02';
   INSERT INTO oura_daily_summary(user_id,date,steps) VALUES('${owner}','2026-03-01',NULL),('${owner}','2026-03-21',10634),('${owner}','2026-06-19',0),('${other}','2026-03-21',99);
   INSERT INTO oura_enhanced(user_id,date,steps) VALUES('${owner}','2026-03-01',7696),('${owner}','2026-03-21',NULL),('${owner}','2026-06-19',999),('${other}','2026-03-21',99);`);
  const migration=(await readdir('supabase/migrations')).find(x=>x.endsWith('_body_fat_and_oura_steps_consistency.sql'));
  assert.ok(migration,'generated migration exists');
  await db.exec(await readFile('supabase/migrations/'+migration,'utf8'));
  const bf=async date=>Number((await db.query('SELECT body_fat FROM body_metrics WHERE user_id=$1 AND date=$2',[owner,date])).rows[0].body_fat);
  assert.equal(await bf('2026-10-01'),23.9,'historical value from old generated formula is corrected');
  assert.equal(await bf('2026-10-02'),17,'independent BF value is not rewritten by migration');
  await db.query("UPDATE body_metrics SET belly=100 WHERE user_id=$1 AND date='2026-10-01'",[owner]);
  assert.equal(await bf('2026-10-01'),27,'editing only belly recomputes BF');
  await db.query("INSERT INTO body_metrics(user_id,date,waist,neck) VALUES($1,'2026-10-03',87,37)",[owner]);
  assert.equal(await bf('2026-10-03'),18.4,'waist fallback works without belly');
  await db.query("UPDATE body_metrics SET belly=NULL WHERE user_id=$1 AND date='2026-10-01'",[owner]);
  assert.equal(await bf('2026-10-01'),18.4,'removing belly returns to waist fallback');
  await db.query("INSERT INTO body_metrics(user_id,date,neck,body_fat) VALUES($1,'2026-10-04',37,16)",[owner]);
  assert.equal(await bf('2026-10-04'),16,'insufficient geometry preserves explicitly supplied BF');
  const canonical=(await db.query("SELECT steps FROM oura_daily_summary WHERE user_id=$1 AND date='2026-03-01'",[owner])).rows[0].steps;
  assert.equal(canonical,7696,'missing summary is repaired from the legacy measured value');
  const projected=async()=> (await db.query('SELECT date::text,steps FROM oura_enhanced WHERE user_id=$1 ORDER BY date',[owner])).rows;
  assert.deepEqual((await projected()).map(x=>x.steps),[7696,10634,0],'known canonical values including zero win');
  await db.query("UPDATE oura_enhanced SET steps=999 WHERE user_id=$1 AND date='2026-03-21'",[owner]);
  await db.query("SELECT refresh_oura_steps_projection($1,ARRAY['2026-03-21'::date])",[owner]);
  assert.equal((await projected())[1].steps,10634,'atomic projection refresh uses the current canonical row');
  await db.query("UPDATE oura_daily_summary SET steps=123 WHERE user_id=$1 AND date='2026-03-21'",[owner]);
  assert.equal((await projected())[1].steps,123,'later summary updates maintain projection');
  await db.query("DELETE FROM oura_daily_summary WHERE user_id=$1 AND date='2026-03-21'",[owner]);
  assert.equal((await projected())[1].steps,null,'removing the source clears the projected count');
  assert.equal((await db.query('SELECT steps FROM oura_enhanced WHERE user_id=$1',[other])).rows[0].steps,99,'owner isolation');
  const privileges=(await db.query(`SELECT
    has_function_privilege('anon','public.project_oura_daily_steps()','execute') AS anon,
    has_function_privilege('authenticated','public.project_oura_daily_steps()','execute') AS authenticated`)).rows[0];
  assert.deepEqual(privileges,{anon:false,authenticated:false},'internal definer trigger is not a callable API');
 } finally {await db.close()}
});
