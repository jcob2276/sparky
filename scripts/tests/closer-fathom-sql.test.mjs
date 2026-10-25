import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
const owner = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
try {
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS
      $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    CREATE TABLE projects(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid,name text,status text);
    CREATE TABLE goal_kpis(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid,project_id uuid,name text);
    CREATE TABLE kpi_entries(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid,kpi_id uuid,week_start date,value numeric,
      UNIQUE(kpi_id,week_start));
    INSERT INTO auth.users VALUES ('${owner}'),('${other}');
  `);
  for (const file of [
    '20260914232000_create_closer_daily_logs.sql',
    '20261021200000_closer_daily_logs_sales_closed.sql',
    '20261025120000_closer_calls.sql',
  ]) await db.exec(await readFile('supabase/migrations/' + file, 'utf8'));
  await db.query("INSERT INTO projects(user_id,name,status) VALUES ($1,'Closer','active')", [owner]);
  await db.query("INSERT INTO goal_kpis(user_id,project_id,name) SELECT $1,id,'Sales calle' FROM projects", [owner]);
  await db.query("INSERT INTO goal_kpis(user_id,project_id,name) SELECT $1,id,'Godziny pracy' FROM projects", [owner]);
  await db.query("INSERT INTO closer_daily_logs(user_id,date,dials,appointments,sales_calls,notes) VALUES ($1,'2026-10-25',7,2,1,'manual')", [owner]);
  const call = (user, id, seconds) => db.query(`
    INSERT INTO closer_calls(user_id,fathom_recording_id,title,call_date,started_at,duration_seconds)
    VALUES ($1,$2,'Call','2026-10-25','2026-10-25T10:00:00Z',$3)
    ON CONFLICT (user_id,fathom_recording_id) DO UPDATE SET duration_seconds=excluded.duration_seconds`, [user,id,seconds]);
  await call(owner,1,3600);
  await call(owner,2,1800);
  await db.query(`
    INSERT INTO closer_calls(user_id,fathom_recording_id,title,call_date,started_at,ended_at,duration_seconds)
    VALUES ($1,99,'Invalid source duration','2021-09-16','2021-09-16T20:42:47Z','2025-07-23T08:48:49Z',121435562)`,[other]);
  await db.exec(await readFile('supabase/migrations/20261025130316_closer_fathom_daily_totals.sql','utf8'));
  assert.equal((await db.query('SELECT duration_seconds FROM closer_calls WHERE fathom_recording_id=99')).rows[0].duration_seconds,
    null,'invalid source duration remains unknown instead of creating thousands of work hours');
  const day = async user => (await db.query('SELECT * FROM closer_daily_logs WHERE user_id=$1 AND date=$2',[user,'2026-10-25'])).rows[0];
  let row = await day(owner);
  assert.equal(row.sales_calls,2,'historical recordings must backfill daily sales calls');
  assert.equal(Number(row.work_hours),1.5,'historical recording duration must backfill hours');
  assert.equal(row.dials,7);
  assert.equal(row.appointments,2);
  assert.equal(row.notes,'manual');
  assert.equal(row.sales_closed,0,'AI never declares a sale in daily statistics');
  await db.exec(await readFile('supabase/migrations/20261025131515_closer_call_review_notes.sql','utf8'));
  await db.exec(await readFile('supabase/migrations/20261025135927_closer_work_context.sql','utf8'));
  await db.exec(await readFile('supabase/migrations/20261025141203_closer_numbers_confirmation.sql','utf8'));
  assert.equal((await day(owner)).work_energy, null, 'historical energy stays unknown');
  await db.query(`INSERT INTO closer_daily_logs(user_id,date,work_energy,work_pressure,notes)
    VALUES ($1,'2026-10-25',2,4,'Trudny dzień') ON CONFLICT(user_id,date)
    DO UPDATE SET work_energy=excluded.work_energy,work_pressure=excluded.work_pressure,notes=excluded.notes`,[owner]);
  assert.equal((await day(owner)).sales_calls,2,'saving personal context preserves recorded totals');
  assert.equal((await day(owner)).dials,7,'saving personal context preserves manual numbers');
  await assert.rejects(db.query('UPDATE closer_daily_logs SET work_energy=6 WHERE user_id=$1',[owner]), /check constraint/);
  await db.query(`INSERT INTO closer_daily_logs(user_id,date,notes,work_energy) VALUES ($1,'2026-10-24','Tylko kontekst',2)`,[owner]);
  assert.equal((await db.query("SELECT numbers_entered_at FROM closer_daily_logs WHERE date='2026-10-24'")).rows[0].numbers_entered_at,null,'context alone never confirms numeric zeros');
  await db.query("DELETE FROM closer_daily_logs WHERE date='2026-10-24'");
  const kpi = async name => Number((await db.query(`
    SELECT e.value FROM kpi_entries e JOIN goal_kpis k ON e.kpi_id=k.id
    WHERE k.name=$1 AND e.week_start='2026-10-19'`,[name])).rows[0].value);
  assert.equal(await kpi('Sales calle'),2);
  assert.equal(await kpi('Godziny pracy'),1.5);
  await db.query("UPDATE closer_daily_logs SET sales_calls=0,work_hours=0 WHERE user_id=$1",[owner]);
  assert.equal((await day(owner)).sales_calls,2,'manual save cannot erase recorded calls');
  assert.equal(Number((await day(owner)).work_hours),1.5,'manual save cannot erase recorded hours');
  await db.query("UPDATE closer_daily_logs SET sales_calls=5,work_hours=8 WHERE user_id=$1",[owner]);
  await call(owner,3,900);
  await call(owner,3,900);
  row = await day(owner);
  assert.equal(row.sales_calls,5,'manual total overlaps recordings and must not be added twice');
  assert.equal(Number(row.work_hours),8,'manual work beyond recorded calls is preserved');
  assert.equal(await kpi('Sales calle'),5);
  assert.equal(await kpi('Godziny pracy'),8);
  await call(owner,1,36000);
  assert.equal(Number((await day(owner)).work_hours),10.75,'updated recording duration raises the floor');
  await call(other,4,3600);
  await call(other,100,121435562);
  assert.equal((await db.query('SELECT duration_seconds FROM closer_calls WHERE fathom_recording_id=100')).rows[0].duration_seconds,
    null,'future webhooks cannot put invalid source durations back into statistics');
  assert.equal((await day(other)).sales_calls,2);
  assert.equal((await day(owner)).sales_calls,5,'another owner cannot affect totals');
  await db.exec(`
    GRANT USAGE ON SCHEMA auth TO authenticated;
    GRANT SELECT ON projects, goal_kpis TO authenticated;
    GRANT SELECT, INSERT, UPDATE ON kpi_entries TO authenticated;
    ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
    ALTER TABLE goal_kpis ENABLE ROW LEVEL SECURITY;
    ALTER TABLE kpi_entries ENABLE ROW LEVEL SECURITY;
    CREATE POLICY owner_projects ON projects USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid());
    CREATE POLICY owner_kpis ON goal_kpis USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid());
    CREATE POLICY owner_entries ON kpi_entries USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid());
  `);
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[owner]);
  await db.exec('SET ROLE authenticated');
  assert.equal((await db.query('SELECT * FROM closer_daily_logs')).rows.length,1,'daily totals keep owner RLS');
  await db.query("UPDATE closer_daily_logs SET sales_calls=0,dials=9 WHERE user_id=$1",[owner]);
  assert.equal((await day(owner)).sales_calls,3,'authenticated manual save respects recorded floor');
  assert.equal(await kpi('Sales calle'),3,'authenticated edits update the same weekly KPI');
  await db.query("UPDATE closer_daily_logs SET sales_calls=0 WHERE user_id=$1",[other]);
  await db.query('UPDATE closer_daily_logs SET work_energy=1,work_pressure=5 WHERE user_id=$1',[other]);
  await db.query("UPDATE closer_calls SET review_notes='Moja notatka' WHERE user_id=$1",[owner]);
  assert.ok((await db.query('SELECT review_notes FROM closer_calls')).rows.every(r=>r.review_notes==='Moja notatka'));
  await db.exec('RESET ROLE');
  assert.equal((await day(other)).work_energy,null,'personal context keeps owner RLS');
  assert.equal((await day(owner)).work_pressure,4,'numeric edits preserve personal context');
  assert.equal((await day(other)).sales_calls,2,'authenticated writes cannot alter another owner');
  console.log('Fathom totals: backfill, overlap, replay, manual floor, weekly KPI and owner RLS PASS');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await db.close();
}

