import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
const owner = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
const current = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const target = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const foreign = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
try {
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS; CREATE ROLE authenticator;
    CREATE SCHEMA auth; CREATE SCHEMA storage;
    CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql AS $$
      SELECT nullif(current_setting('request.jwt.claims', true), '')::jsonb
    $$;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT (auth.jwt()->>'sub')::uuid $$;
    CREATE TABLE auth.users(id uuid PRIMARY KEY);
    CREATE TABLE auth.sessions(id uuid PRIMARY KEY,user_id uuid REFERENCES auth.users ON DELETE CASCADE,
      created_at timestamptz,refreshed_at timestamp,user_agent text,ip inet,not_after timestamptz,
      refresh_token_hmac_key text,refresh_token_counter bigint);
    CREATE TABLE auth.refresh_tokens(session_id uuid REFERENCES auth.sessions ON DELETE CASCADE,revoked boolean);
    CREATE TABLE auth.mfa_amr_claims(session_id uuid REFERENCES auth.sessions ON DELETE CASCADE,authentication_method text);
    CREATE TABLE public.notes(id int PRIMARY KEY,user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE);
    ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
    CREATE POLICY owner ON public.notes TO authenticated USING(user_id=(select auth.uid()));
    GRANT SELECT ON public.notes TO authenticated;
    CREATE TABLE storage.objects(id int PRIMARY KEY);
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
    CREATE POLICY readable ON storage.objects FOR SELECT TO authenticated USING(true);
    GRANT USAGE ON SCHEMA auth, storage TO authenticated;
    GRANT SELECT ON storage.objects TO authenticated;
    INSERT INTO auth.users VALUES ('${owner}'),('${other}');
    INSERT INTO auth.sessions VALUES
      ('${current}','${owner}',now(),null,'Edge Windows','192.0.2.1',null,null,null),
      ('${target}','${owner}',now()-interval '60 days',null,'HeadlessChrome','192.0.2.2',null,null,null),
      ('${foreign}','${other}',now(),null,'Safari','192.0.2.3',null,null,null);
    INSERT INTO auth.refresh_tokens VALUES ('${current}',false),('${target}',false),('${foreign}',false);
    INSERT INTO auth.mfa_amr_claims VALUES ('${current}','password'),('${target}','password'),('${foreign}','oauth');
    INSERT INTO public.notes VALUES (1,'${owner}'),(2,'${other}');
    INSERT INTO storage.objects VALUES (1);
  `);
  await db.exec(await readFile('supabase/migrations/20261107124321_manage_auth_sessions.sql', 'utf8'));
  const claims = async (sub, session_id, role = 'authenticated') => db.query(
    "SELECT set_config('request.jwt.claims',$1,false)", [JSON.stringify({ sub, session_id, role })],
  );
  await claims(owner, current);
  await db.exec('SET ROLE authenticated');
  const rows = (await db.query('SELECT * FROM public.get_my_session_activity()')).rows;
  assert.deepEqual(rows.map(r => r.id), [current, target], 'old but valid sessions remain in the logged-in list');
  assert.equal(rows[1].status, 'active');
  assert.deepEqual(rows[0].authentication_methods, ['password']);
  assert.equal((await db.query('SELECT * FROM public.notes')).rows.length, 1);
  assert.equal((await db.query('SELECT public.is_current_session_active() AS active')).rows[0].active, true);
  await assert.rejects(db.query('SELECT public.revoke_my_session($1)', [foreign]), /Session not found/);
  assert.equal((await db.query('SELECT public.revoke_my_session($1) AS ended', [target])).rows[0].ended, true);
  const after = (await db.query('SELECT * FROM public.get_my_session_activity()')).rows;
  const ended = after.find(r => r.id === target);
  assert.equal(ended.status, 'ended');
  assert.equal(ended.is_current, false);
  assert.deepEqual(ended.authentication_methods, ['password']);
  assert.equal(ended.ip, '192.0.2.2');
  assert.ok(ended.ended_at);
  assert.ok(!Object.keys(ended).some(k => /token|secret|key/.test(k)), 'no credential material in the activity feed');
  await assert.rejects(db.query('DELETE FROM public.auth_session_history'), /permission denied/);
  await assert.rejects(db.query("INSERT INTO public.auth_session_history(id,user_id) VALUES(gen_random_uuid(),$1)", [owner]), /permission denied/);
  await claims(owner, target);
  assert.equal((await db.query('SELECT public.is_current_session_active() AS active')).rows[0].active, false);
  await assert.rejects(db.query('SELECT * FROM public.get_my_session_activity()'), /Session no longer active/);
  await assert.rejects(db.query('SELECT public.revoke_my_session($1)', [current]), /Session no longer active/);
  await claims(other, foreign);
  assert.deepEqual((await db.query('SELECT id FROM public.get_my_session_activity()')).rows.map(r => r.id), [foreign]);
  assert.equal((await db.query('SELECT * FROM public.auth_session_history')).rows.length, 0);
  await db.exec('RESET ROLE');
  assert.equal((await db.query('SELECT * FROM auth.refresh_tokens WHERE session_id=$1', [target])).rows.length, 0);
  // Auth account deletion must not be blocked by the archive trigger or retain deleted personal data.
  await db.query('DELETE FROM auth.users WHERE id=$1', [other]);
  assert.equal((await db.query('SELECT * FROM public.auth_session_history WHERE user_id=$1', [other])).rows.length, 0);
  await claims(owner, current);
  await db.exec('SET ROLE authenticated');
  assert.equal((await db.query('SELECT public.revoke_my_session($1) AS ended', [current])).rows[0].ended, true);
  await assert.rejects(db.query('SELECT * FROM public.get_my_session_activity()'), /Session no longer active/);
  await db.exec('RESET ROLE; SET ROLE anon');
  await claims(null, null, 'anon');
  await assert.rejects(db.query('SELECT * FROM public.get_my_session_activity()'), /permission denied/);
  console.log('Managed sessions: owner-only revocation, history, refresh-token cascade, self-revocation and Auth user deletion PASS');
} catch (error) {
  console.error(error.message, error.query ?? ''); process.exitCode = 1;
} finally {
  await db.close();
}
