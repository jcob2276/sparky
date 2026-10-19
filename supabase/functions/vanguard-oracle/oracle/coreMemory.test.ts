import assert from 'node:assert/strict';
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { applyCoreMemoryMutation, fetchCoreMemory, persistCoreMemoryResponse, type CoreMemoryMutation } from './coreMemory.ts';

type Row = { id: string; key: string; value: string; updated_at: string | null };
function database(options: { rows?: Row[]; readError?: object; writeError?: object; acknowledged?: boolean } = {}) {
  const writes: Record<string, unknown>[] = [];
  const filters: unknown[][] = [];
  let requests = 0;
  const client = {
    from(table: string) {
      assert.equal(table, 'vanguard_preferences');
      requests++;
      let writing = false;
      const response = () => writing
        ? { data: options.acknowledged === false ? null : { id: 'written' }, error: options.writeError ?? null }
        : { data: options.rows ?? [], error: options.readError ?? null };
      const chain = {
        select(_columns: string) { return chain; },
        eq(...args: unknown[]) { filters.push(args); return chain; },
        is(...args: unknown[]) { filters.push(args); return chain; },
        like(...args: unknown[]) { filters.push(args); return chain; },
        upsert(payload: Record<string, unknown>) { writing = true; writes.push(payload); return chain; },
        insert(payload: Record<string, unknown>) { writing = true; writes.push(payload); return chain; },
        update(payload: Record<string, unknown>) { writing = true; writes.push(payload); return chain; },
        single() { return Promise.resolve(response()); },
        maybeSingle() {
          return Promise.resolve(writing ? response() : { data: options.rows?.[0] ?? null, error: options.readError ?? null });
        },
        then(resolve: (value: ReturnType<typeof response>) => unknown) { return Promise.resolve(response()).then(resolve); },
      };
      return chain;
    },
  };
  return { client: client as unknown as SupabaseClient, writes, filters, requests: () => requests };
}
const row = (value: string): Row => ({ id: 'owned-row', key: 'core_memory:focus', value, updated_at: '2026-01-01T00:00:00Z' });
const futureEnvelope = (text: string) => JSON.stringify({ text, expires_at: '2999-01-01T00:00:00Z' });

Deno.test('core memory read excludes expired, invalid and missing TTL envelopes but preserves legacy text', async () => {
  for (const value of [
    '{"text":"Expired","expires_at":"2000-01-01T00:00:00Z"}',
    '{"text":"Invalid","expires_at":"invalid"}',
    '{"text":"Missing TTL"}', '{"text":17,"expires_at":"2999-01-01T00:00:00Z"}', '{broken',
  ]) {
    const db = database({ rows: [row(value)] });
    assert.deepEqual(await fetchCoreMemory(db.client, 'owner'), {}, value);
  }
  const db = database({ rows: [row('Legacy text')] });
  assert.deepEqual(await fetchCoreMemory(db.client, 'owner'), { focus: 'Legacy text' });
  assert.ok(db.filters.some(([key, value]) => key === 'user_id' && value === 'owner'));
  assert.ok(db.filters.some(([key, value]) => key === 'is_active' && value === true));
});

Deno.test('failed core memory fetch is surfaced, not presented as an empty memory', async () => {
  const db = database({ readError: { message: 'storage unavailable' } });
  await assert.rejects(() => fetchCoreMemory(db.client, 'owner'));
});

Deno.test('mutation validates untrusted block/action/content before making a query', async () => {
  for (const mutation of [
    null, { block: 'focus', action: 'delete', content: 'value' },
    { block: 'other', action: 'set', content: 'value' },
    { block: 'focus', action: 'set', content: 17 },
    { block: 'focus', action: 'set', content: '\n  ' },
  ]) {
    const db = database();
    assert.equal(await applyCoreMemoryMutation(db.client, 'owner', mutation as CoreMemoryMutation), false);
    assert.equal(db.requests(), 0);
  }
});

Deno.test('set is bounded to 220 and reports success only for an acknowledged write', async () => {
  const db = database();
  assert.equal(await applyCoreMemoryMutation(db.client, 'owner', { block: 'human', action: 'set', content: 'x'.repeat(300) }), true);
  const value = JSON.parse(db.writes[0].value as string);
  assert.equal(value.text.length, 220);
  assert.equal(value.text, 'x'.repeat(220));
  assert.equal(new Date(value.expires_at).getTime() - new Date(value.updated_at).getTime(), 60 * 86400000);
  const unacknowledged = database({ acknowledged: false });
  assert.equal(await applyCoreMemoryMutation(unacknowledged.client, 'owner', { block: 'focus', action: 'set', content: 'text' }), false);
  const failed = database({ writeError: { message: 'write failed' } });
  assert.equal(await applyCoreMemoryMutation(failed.client, 'owner', { block: 'focus', action: 'set', content: 'text' }), false);
});

Deno.test('append preserves active text and compares the old owner-scoped value when updating', async () => {
  const current = futureEnvelope('Current');
  const db = database({ rows: [row(current)] });
  assert.equal(await applyCoreMemoryMutation(db.client, 'owner', { block: 'focus', action: 'append', content: 'New\ntext' }), true);
  assert.equal(JSON.parse(db.writes[0].value as string).text, 'Current New text');
  assert.ok(db.filters.some(([key, value]) => key === 'value' && value === current));
  assert.ok(db.filters.some(([key, value]) => key === 'id' && value === 'owned-row'));
  assert.ok(db.filters.some(([key, value]) => key === 'user_id' && value === 'owner'));
  assert.ok(db.filters.some(([key, value]) => key === 'is_active' && value === true));
});

Deno.test('append refuses overflow and failed reads, and a stale update cannot claim success', async () => {
  const full = database({ rows: [row(futureEnvelope('x'.repeat(220)))] });
  assert.equal(await applyCoreMemoryMutation(full.client, 'owner', { block: 'focus', action: 'append', content: 'new' }), false);
  assert.equal(full.writes.length, 0);
  const failed = database({ readError: { message: 'read failed' } });
  assert.equal(await applyCoreMemoryMutation(failed.client, 'owner', { block: 'focus', action: 'append', content: 'new' }), false);
  assert.equal(failed.writes.length, 0);
  const stale = database({ rows: [row(futureEnvelope('Current'))], acknowledged: false });
  assert.equal(await applyCoreMemoryMutation(stale.client, 'owner', { block: 'focus', action: 'append', content: 'new' }), false);
});

Deno.test('append never revives expired text and can start an empty block', async () => {
  for (const rows of [[], [row('{"text":"Expired","expires_at":"2000-01-01T00:00:00Z"}')]]) {
    const db = database({ rows });
    assert.equal(await applyCoreMemoryMutation(db.client, 'owner', { block: 'focus', action: 'append', content: 'Current' }), true);
    assert.equal(JSON.parse(db.writes[0].value as string).text, 'Current');
  }
});

Deno.test('Oracle response acknowledges persistence only after a confirmed memory write', async () => {
  const response = { answer: 'Zapisałem tę zmianę.', core_memory_mutation: { block: 'focus', action: 'set', content: 'Current goal' } };
  const failed = database({ acknowledged: false });
  const failure = await persistCoreMemoryResponse(failed.client, 'owner', response, 'auto');
  assert.equal(failure.core_memory_saved, false);
  assert.equal(failure.answer.includes('Zapisałem'), false);
  assert.equal(failure.answer, failure.text);
  assert.equal(failure.core_memory_mutation, undefined);
  const saved = await persistCoreMemoryResponse(database().client, 'owner', response, 'auto');
  assert.equal(saved.core_memory_saved, true);
  assert.equal(saved.answer, response.answer);
});

Deno.test('read-only Oracle response cannot claim a core memory change was saved', async () => {
  const db = database();
  const result = await persistCoreMemoryResponse(db.client, 'owner', {
    answer: 'Zapisałem.', core_memory_mutation: { block: 'focus', action: 'set', content: 'Goal' },
  }, 'readOnly');
  assert.equal(db.requests(), 0);
  assert.equal(result.core_memory_saved, false);
  assert.equal(result.answer.includes('Zapisałem'), false);
});
