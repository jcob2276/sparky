import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const { PGlite } = await import(pathToFileURL(resolve(process.env.SPARKY_SQL_TEST_MODULE ?? '.superpowers/sdd/bevel-intelligence/sql-runtime/node_modules/@electric-sql/pglite/dist/index.js')).href);
const db = new PGlite();
const owner = '11111111-1111-4111-8111-111111111111', other = '22222222-2222-4222-8222-222222222222';
try {
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    CREATE TABLE goal_kpis(id uuid DEFAULT gen_random_uuid(),user_id uuid,name text,target numeric,unit text,measurement_spec jsonb,revision integer);
    CREATE TABLE vanguard_preferences(user_id uuid,key text,value text,is_active boolean);
    CREATE TABLE workout_sessions(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid,workout_day text,date date,
      start_time timestamptz,end_time timestamptz,duration_minutes integer,session_notes text,msp_passed boolean,session_rpe integer,importance_score integer);
    CREATE TABLE exercise_logs(session_id uuid,user_id uuid,exercise_name text,set_number integer,reps integer,weight numeric,
      rpe numeric,rir numeric,is_pws_or_msp boolean,muscle_tags text[]);
    CREATE TABLE strava_activities_clean(strava_id bigint,user_id uuid,start_date timestamptz);
    CREATE TABLE training_plan_workouts(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL,
      day_of_week text NOT NULL,planned_date date,workout_type text NOT NULL,workout_name text NOT NULL,
      description text,goal text,target_duration_min integer,target_distance_km double precision,
      target_hr_max integer,target_pace_min_km text,target_pace_max_km text,strava_activity_id bigint,
      completed boolean DEFAULT false,completion_notes text,created_at timestamptz DEFAULT now());
    CREATE SCHEMA vault; CREATE TABLE vault.decrypted_secrets(name text,decrypted_secret text);
    GRANT USAGE ON SCHEMA auth TO authenticated; GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;
  `);
  await db.query('INSERT INTO auth.users VALUES($1),($2)',[owner,other]);
  const baseline = await readFile('supabase/migrations/20260504000000_baseline.sql','utf8');
  const fnStart = baseline.indexOf('CREATE OR REPLACE FUNCTION "public"."save_workout_atomic"');
  const fnEnd = baseline.indexOf('ALTER FUNCTION "public"."save_workout_atomic"',fnStart);
  await db.exec(baseline.slice(fnStart,fnEnd));
  await db.exec(await readFile('supabase/migrations/20261014115955_health_training_plans.sql','utf8'));
  const resultMigration = await readFile('supabase/migrations/20261014121430_planned_workout_result_integrity.sql','utf8');
  await db.exec(resultMigration);
  const today = (await db.query("SELECT (now() AT TIME ZONE 'Europe/Warsaw')::date::text AS day")).rows[0].day;
  const enqueue = async key => (await db.query('SELECT enqueue_health_coach_job($1,$2,$3::jsonb) AS id',[owner,key,'{}'])).rows[0].id;
  const job = await enqueue('request-1');
  assert.equal(await enqueue('request-1'),job,'enqueue retries reuse the same job');
  const claim = (await db.query('SELECT * FROM claim_health_coach_job($1)',[job])).rows[0];
  assert.equal(claim.attempts,1);
  assert.equal((await db.query('SELECT * FROM claim_health_coach_job($1)',[job])).rows.length,0,'a second worker cannot acquire a live lease');
  await db.query("UPDATE health_coach_jobs SET leased_until=now()-interval '1 second' WHERE id=$1",[job]);
  const retry = (await db.query('SELECT * FROM claim_health_coach_job($1)',[job])).rows[0];
  assert.equal(retry.attempts,2);
  assert.notEqual(retry.lease_token,claim.lease_token);
  await assert.rejects(db.query('SELECT complete_health_plan_job($1,$2,$3,$4)',[job,claim.lease_token,'{}','outdated']),/lease lost/i,'an expired worker cannot commit a plan');
  const fingerprint = (await db.query('SELECT health_coach_fingerprint($1) AS value',[owner])).rows[0].value;
  await db.query('SELECT fail_health_coach_job($1,$2,$3)',[job,retry.lease_token,'model timeout']);
  const lastAttempt = (await db.query('SELECT * FROM claim_health_coach_job($1)',[job])).rows[0];
  await db.query('SELECT fail_health_coach_job($1,$2,$3)',[job,lastAttempt.lease_token,'model timeout']);
  assert.equal((await db.query('SELECT status FROM health_coach_jobs WHERE id=$1',[job])).rows[0].status,'failed');
  const snapshot = { title:'Test', startDate:today, blockWeeks:4, sessions:[{ key:'s1', date:today, type:'strength', name:'Upper', goal:'Bench', durationMinutes:50, exercises:[], notes:'Test' }] };
  const version = (await db.query("INSERT INTO training_plan_versions(user_id,revision,base_revision,status,snapshot,context_fingerprint) VALUES($1,1,0,'draft',$2,$3) RETURNING id",[owner,JSON.stringify(snapshot),fingerprint])).rows[0].id;
  await assert.rejects(db.query('SELECT activate_training_plan($1,$2,0,$3)',[other,version,'bad-owner']),/not found/i);
  await db.query('SELECT activate_training_plan($1,$2,0,$3)',[owner,version,'approve-1']);
  await db.query('SELECT activate_training_plan($1,$2,0,$3)',[owner,version,'approve-1']);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM training_plan_workouts')).rows[0].n,1,'double approval creates one set of sessions');
  const planned = (await db.query('SELECT id FROM training_plan_workouts')).rows[0].id;
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[owner]);
  const saveWorkout = logs => db.query("SELECT save_planned_workout_atomic($1,$2,'Upper',now(),now(),'note',false,$3::jsonb,null) AS id",[owner,planned,JSON.stringify(logs)]);
  await assert.rejects(saveWorkout([]),/wynik/i,'a prescribed session is not a completed session');
  const resultLog = [{ exercise_name:'Bench',set_number:1,reps:8,weight:70,rir:3,muscle_tags:[] }];
  const savedWorkout = (await saveWorkout(resultLog)).rows[0].id;
  assert.equal((await saveWorkout(resultLog)).rows[0].id,savedWorkout,'offline retries link exactly one execution');
  assert.equal((await db.query('SELECT count(*)::int AS n FROM workout_sessions')).rows[0].n,1);
  const v2 = (await db.query("INSERT INTO training_plan_versions(user_id,revision,base_revision,status,snapshot,context_fingerprint) VALUES($1,2,1,'draft',$2,$3) RETURNING id",[owner,JSON.stringify(snapshot),fingerprint])).rows[0].id;
  await assert.rejects(db.query('SELECT activate_training_plan($1,$2,0,$3)',[owner,v2,'stale']),/revision/i);
  await db.query("UPDATE training_plan_workouts SET completed=true WHERE user_id=$1",[owner]);
  await db.query('SELECT activate_training_plan($1,$2,1,$3)',[owner,v2,'approve-2']);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM training_plan_workouts WHERE completed')).rows[0].n,1,'completed sessions survive activation');
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[other]);
  await db.exec('SET ROLE authenticated');
  assert.equal((await db.query('SELECT * FROM training_plan_versions')).rows.length,0);
  assert.equal((await db.query('SELECT * FROM health_coach_jobs')).rows.length,0);
  await assert.rejects(db.query('SELECT claim_health_coach_job($1)',[job]),/permission denied/i);
  console.log('Training plan SQL: idempotency/lease recovery/approval conflicts/history/owner isolation PASS');
} catch(error) { console.error(error.message); process.exitCode=1; }
finally { await db.close(); }
