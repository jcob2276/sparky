import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
const owner = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
const current = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const hmac = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
try {
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$
      SELECT (nullif(current_setting('request.jwt.claims', true), '')::jsonb->>'sub')::uuid
    $$;
    CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql AS $$
      SELECT nullif(current_setting('request.jwt.claims', true), '')::jsonb
    $$;
    CREATE TABLE auth.sessions (
      id uuid PRIMARY KEY, user_id uuid, created_at timestamptz, updated_at timestamptz,
      refreshed_at timestamp, user_agent text, ip inet, not_after timestamptz,
      refresh_token_hmac_key text, refresh_token_counter bigint
    );
    CREATE TABLE auth.refresh_tokens (session_id uuid, revoked boolean);
    GRANT USAGE ON SCHEMA auth TO authenticated;
    INSERT INTO auth.sessions (id, user_id, created_at, refreshed_at, user_agent, ip) VALUES
      ('${current}', '${owner}', '2026-11-07T08:00:00Z', '2026-11-07 10:30:00', 'Chrome Windows', '192.0.2.1'),
      ('${hmac}', '${owner}', '2026-11-06T08:00:00Z', null, null, null),
      ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', '${other}', now(), null, 'Other user', '192.0.2.2'),
      ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', '${owner}', now(), null, 'Expired', null),
      ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', '${owner}', now(), null, 'Revoked', null),
      ('ffffffff-ffff-4fff-8fff-ffffffffffff', '${owner}', now(), null, 'No refresh token', null);
    UPDATE auth.sessions SET not_after = now() - interval '1 minute' WHERE user_agent = 'Expired';
    UPDATE auth.sessions SET refresh_token_hmac_key = 'secret-not-for-clients', refresh_token_counter = 1 WHERE id = '${hmac}';
    INSERT INTO auth.refresh_tokens VALUES ('${current}', false), ('${current}', true),
      ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', false), ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', false),
      ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', true);
  `);
  await db.exec(await readFile('supabase/migrations/20261107121057_list_my_sessions.sql', 'utf8'));
  const claims = async (sub, session_id) => db.query(
    "SELECT set_config('request.jwt.claims', $1, false)", [JSON.stringify({ sub, session_id })],
  );
  await claims(owner, current);
  await db.exec("SET ROLE authenticated; SET TIME ZONE 'America/New_York'");
  const { rows } = await db.query('SELECT * FROM public.list_my_sessions()');
  assert.deepEqual(rows.map(r => r.id), [current, hmac], 'only own, unexpired, non-revoked sessions; current first');
  assert.equal(rows[0].is_current, true);
  assert.equal(rows[1].is_current, false);
  assert.equal(rows[0].last_refreshed_at.toISOString(), '2026-11-07T10:30:00.000Z', 'auth timestamp is UTC, regardless of connection timezone');
  assert.equal(rows[1].last_refreshed_at.toISOString(), '2026-11-06T08:00:00.000Z', 'unrefreshed session falls back to login');
  assert.deepEqual(Object.keys(rows[0]).sort(), ['created_at', 'id', 'ip', 'is_current', 'last_refreshed_at', 'user_agent']);
  assert.equal(rows[0].ip, '192.0.2.1');
  await assert.rejects(db.query('SELECT * FROM auth.sessions'), /permission denied/);
  await claims(other, 'cccccccc-cccc-4ccc-8ccc-cccccccccccc');
  assert.equal((await db.query('SELECT * FROM public.list_my_sessions()')).rows.length, 1);
  await claims(null, null);
  await assert.rejects(db.query('SELECT * FROM public.list_my_sessions()'), /Authentication required/);
  await db.exec('RESET ROLE; SET ROLE anon');
  await assert.rejects(db.query('SELECT * FROM public.list_my_sessions()'), /permission denied/);
  console.log('Session SQL: owner isolation, expiry, revocation, current session, metadata-only response, UTC and permissions PASS');
} finally {
  await db.close();
}
