import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
const db = new PGlite();
try {
  await db.exec(`CREATE ROLE authenticated; CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    CREATE TABLE strava_activities (
      strava_id bigint PRIMARY KEY,user_id uuid,name text,sport_type text,start_date timestamptz,
      elapsed_time integer,moving_time integer,distance float,average_heartrate float,max_heartrate float,
      average_speed float,max_speed float,total_elevation_gain float,calories float,suffer_score float,
      perceived_exertion float,manual boolean,raw_data jsonb,synced_at timestamptz,hr_avg float,hr_max float,
      hr_source text,hr_frozen boolean,splits_with_hr jsonb,gear_name text,gear_distance_km float,
      is_oura_duplicate boolean,gc_activity_id bigint,gc_hr_zones jsonb,gc_weather jsonb,gc_laps jsonb,
      gc_training_effect_aerobic float,gc_training_effect_anaerobic float,gc_vo2max float,gc_enriched_at timestamptz,
      source text,icu_activity_id text,icu_hr_zone_times jsonb,trimp numeric);
    ALTER TABLE strava_activities ENABLE ROW LEVEL SECURITY;
    CREATE POLICY owner_read ON strava_activities FOR SELECT TO authenticated USING(user_id=auth.uid());
    GRANT USAGE ON SCHEMA auth TO authenticated; GRANT SELECT ON strava_activities TO authenticated;
  `);
  await db.exec(await readFile('supabase/migrations/20261014125118_activity_provenance_intervals.sql','utf8'));
  await db.exec(`GRANT SELECT ON strava_activities_clean TO authenticated;
    INSERT INTO strava_activities(strava_id,user_id,name,sport_type,start_date,source,icu_activity_id,icu_hr_zone_times,trimp,hr_avg,hr_source)
    VALUES (1,'11111111-1111-4111-8111-111111111111','Run','Run','2026-10-13T17:00:00Z','garmin_intervals','i1','[304,631,0,764,278,71,35]',100.3,145,'garmin_intervals'),
      (2,'11111111-1111-4111-8111-111111111111','Oura Run','Run','2026-10-13T17:00:15Z','oura',null,null,null,144,'oura'),
      (3,'22222222-2222-4222-8222-222222222222','Private','Run','2026-10-13T17:00:00Z','garmin_intervals','i3',null,null,150,'garmin_intervals');
    SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
    SET ROLE authenticated;
  `);
  const rows = (await db.query('SELECT * FROM strava_activities_clean')).rows;
  assert.equal(rows.length,1,'view must deduplicate Oura and isolate owner');
  assert.equal(rows[0].source,'garmin_intervals');
  assert.equal(rows[0].icu_activity_id,'i1');
  assert.deepEqual(rows[0].icu_hr_zone_times,[304,631,0,764,278,71,35]);
  assert.equal(rows[0].trimp,'100.3');
  console.log('Activity view SQL: Intervals provenance/zones/TRIMP, Oura deduplication and owner RLS PASS');
} catch (error) { console.error(error.message); process.exitCode=1; }
finally { await db.close(); }
