import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

// Applies the real initplan-wrap migration (a DO block) to a tiny schema.
const migration = await readFile('supabase/migrations/20261020130000_rls_initplan_wrap_auth_calls.sql', 'utf8');
const owner = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
const db = new PGlite();
try {
  await db.exec(`CREATE ROLE authenticated; CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql AS $$ SELECT 'authenticated' $$;
    CREATE TABLE public.notes(id int PRIMARY KEY, user_id uuid NOT NULL, body text);
    ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
    CREATE POLICY bare ON public.notes FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    CREATE POLICY wrapped ON public.notes FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
    GRANT SELECT, INSERT ON public.notes TO authenticated;
    INSERT INTO public.notes VALUES (1, '${owner}', 'mine');`);

  const policies = async () => Object.fromEntries((await db.query(
    `SELECT policyname, qual, with_check FROM pg_policies WHERE tablename='notes'`)).rows.map((r) => [r.policyname, r]));
  const readAs = async (uid) => {
    await db.exec(`SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','${uid}',false)`);
    try { return (await db.query('SELECT id FROM public.notes')).rows.length; }
    finally { await db.exec('RESET ROLE'); }
  };

  const before = await policies();
  assert.doesNotMatch(before.bare.qual, /select auth\.uid\(\)/i);
  assert.equal(await readAs(owner), 1);
  assert.equal(await readAs(other), 0);

  await db.exec(migration);

  const after = await policies();
  assert.match(after.bare.qual, /SELECT auth\.uid\(\)/i);
  assert.match(after.bare.with_check, /SELECT auth\.uid\(\)/i);
  assert.equal((after.bare.qual.match(/auth\.uid\(\)/g) ?? []).length, 1);
  assert.equal((after.wrapped.qual.match(/auth\.uid\(\)/g) ?? []).length, 1, 'already-wrapped call must not be double-wrapped');
  assert.doesNotMatch(after.wrapped.qual, /select\s+\(?\s*select/i);

  assert.equal(await readAs(owner), 1, 'owner still reads own row');
  assert.equal(await readAs(other), 0, 'other user still cannot read');

  // idempotent: second run changes nothing
  await db.exec(migration);
  assert.deepEqual(await policies(), after);
} finally {
  await db.close();
}
