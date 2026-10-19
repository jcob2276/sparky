import { deepStrictEqual as eq, ok } from 'node:assert';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { processRecords } from './processor.ts';
import { validateTriad } from './validation.ts';

const valid = { source: 'Jakub', source_type: 'person', relation: 'uczy_sie', target: 'Polski język migowy',
  target_type: 'skill', memory_type: 'fact', confidence_score: 0, evidence_quote: 'Uczę się PJM' };

async function extract(triads: unknown[], finishReason = 'stop', content = 'Uczę się PJM', failWrite = false, activeLinks: Record<string, unknown>[] = []) {
  const original = globalThis.fetch;
  const writes: Record<string, unknown>[] = [];
  globalThis.fetch = async (input, init) => {
    const request = input instanceof Request ? input : new Request(input, init);
    if (request.url.startsWith('https://api.deepseek.com')) return Response.json({ choices: [
      { finish_reason: finishReason, message: { content: JSON.stringify({ triads }) } },
    ] });
    if (request.method === 'GET') return Response.json(request.url.includes('/vanguard_entity_links') ? [] : null);
    if (request.url.includes('/rpc/upsert_vanguard_entity_link')) {
      writes.push(await request.json());
      if (failWrite) return Response.json({ message: 'write unavailable' }, { status: 400 });
    }
    return Response.json(null);
  };
  try {
    const db = createClient('https://example.supabase.co', 'fixture', { auth: { persistSession: false, autoRefreshToken: false } });
    const result = await processRecords(db, [{ id: 'episode-1', created_at: '2026-10-19T10:00:00Z', content }], activeLinks, 'owner', 'fixture', 'stream');
    return { result, writes };
  } finally { globalThis.fetch = original; }
}

Deno.test('architect rejects malformed triads individually without losing valid Polish facts or zero confidence', async () => {
  const malformed = [null, 7, { ...valid, source: [] }, { ...valid, target: ' ' },
    { ...valid, source: 'x'.repeat(301) }, { ...valid, confidence_score: '0.8' },
    { ...valid, confidence_score: 1.1 }, { ...valid, memory_type: 'certain' },
    { ...valid, relation: 'invented' }, { ...valid, source_type: {} },
    { ...valid, target: '<think>Let me reason about the schema</think>' },
    { ...valid, evidence_quote: 'mam dwie babcie' }, { ...valid, target: '...' }];
  const { writes, result } = await extract([...malformed, valid]);
  eq(writes.length, 1);
  eq(writes[0].p_target, 'Polski język migowy');
  eq(writes[0].p_confidence_score, 0);
  eq(writes[0].p_source_episode_id, 'episode-1');
  eq(result.rejectedTriads, malformed.length);
  eq(result.totalTriads, 1);
});

Deno.test('architect refuses token-limited output even when the JSON is complete', async () => {
  const { writes, result } = await extract([valid], 'length');
  eq(writes, []);
  eq(result.failedRecords, 1);
  ok(result.retryableRecordIds.includes('episode-1'));
});

Deno.test('architect accepts paraphrased grounded legacy triads without a quote', async () => {
  const { evidence_quote: _, ...legacy } = valid;
  const { writes, result } = await extract([legacy]);
  eq(writes.length, 1);
  eq(result.failedRecords, 0);
});

Deno.test('architect exposes failed writes as retryable records without claiming accepted triads', async () => {
  const { result } = await extract([valid], 'stop', 'Uczę się PJM', true);
  eq(result.totalTriads, 0);
  eq(result.failedUpserts, 1);
  eq(result.failedRecords, 1);
  eq(result.retryableRecordIds, ['episode-1']);
});

Deno.test('architect rejects nonfinite confidence and prose about extraction while preserving real statements about thought', () => {
  for (const confidence_score of [NaN, Infinity, -Infinity, -0.1]) eq(validateTriad({ ...valid, confidence_score }, 'Uczę się PJM'), null);
  for (const target of ['Let me analyze the user input step by step', 'The source entity represents the subject in the schema', 'target_entity']) {
    eq(validateTriad({ ...valid, target }, 'Uczę się PJM'), null);
  }
  ok(validateTriad({ ...valid, target: 'Analiza danych' }, 'Uczę się PJM'));
  eq(validateTriad({ ...valid, memory_type: 'hypothesis', confidence_score: 0.99 }, 'Uczę się PJM')?.confidence_score, 0.65);
});

Deno.test('merge uses the canonical idempotent RPC with the original episode identity', async () => {
  const conflict = { source: valid.source, relation: valid.relation, target: valid.target };
  const { writes } = await extract([{ ...valid, resolution: { action: 'merge', conflicting_link: conflict } }], 'stop', 'Uczę się PJM', false,
    [{ id: 'old-link', source_entity: valid.source, relation: valid.relation, target_entity: valid.target, evidence_count: 5 }]);
  eq(writes.length, 1);
  eq(writes[0].p_source_episode_id, 'episode-1');
});

Deno.test('supersession delegates old and new fact changes to one transaction', async () => {
  const conflict = { source: valid.source, relation: valid.relation, target: 'Dawny język' };
  const { writes, result } = await extract([{ ...valid, resolution: { action: 'supersede', conflicting_link: conflict } }], 'stop', 'Uczę się PJM', true,
    [{ id: 'old-link', source_entity: valid.source, relation: valid.relation, target_entity: conflict.target }]);
  eq(writes.length, 1);
  eq((writes[0].p_metadata as Record<string, unknown>).supersedes_link_id, 'old-link');
  eq(result.failedUpserts, 1);
});

Deno.test('supersession identifies a predecessor cached earlier in the same batch before its id is known', async () => {
  const conflict = { source: valid.source, relation: valid.relation, target: 'Dawny język' };
  const { writes } = await extract([{ ...valid, resolution: { action: 'supersede', conflicting_link: conflict } }], 'stop', 'Uczę się PJM', false,
    [{ source_entity: valid.source, relation: valid.relation, target_entity: conflict.target }]);
  eq((writes[0].p_metadata as Record<string, unknown>).supersedes_target, 'Dawny język');
});

async function processBatch(mode: 'supersession' | 'backdated' | 'refresh-failure' | 'same-record') {
  const original = globalThis.fetch;
  const previous = { id: 'persisted-old', source_entity: 'Jakub', relation: 'uczy_sie', target_entity: 'Dawny temat', confidence_score: 0.8 };
  const replacement = { id: 'persisted-new', source_entity: 'Jakub', relation: 'uczy_sie', target_entity: 'Nowy temat', confidence_score: 0.9 };
  const prompts: string[] = [], writes: Record<string, unknown>[] = [];
  let snapshots = 0;
  globalThis.fetch = async (input, init) => {
    const request = input instanceof Request ? input : new Request(input, init);
    if (request.url.startsWith('https://api.deepseek.com')) {
      const body = await request.json();
      prompts.push(body.messages[0].content);
      const triads = mode === 'same-record'
        ? prompts.length === 1 ? [{ ...valid, target: previous.target_entity }, { ...valid, target: replacement.target_entity,
          resolution: { action: 'supersede', conflicting_link: { source: 'Jakub', relation: 'uczy_sie', target: previous.target_entity } } }] : []
        : mode === 'backdated'
        ? prompts.length === 1 ? [{ ...valid, target: 'Historyczny temat', resolution: { action: 'supersede', conflicting_link: { source: 'Jakub', relation: 'uczy_sie', target: previous.target_entity } } }] : []
        : prompts.length === 1 ? [{ ...valid, target: previous.target_entity }]
        : prompts.length === 2 ? [{ ...valid, target: replacement.target_entity, resolution: { action: 'supersede', conflicting_link: { source: 'Jakub', relation: 'uczy_sie', target: previous.target_entity } } }] : [];
      return Response.json({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify({ triads }) } }] });
    }
    if (request.url.includes('/rpc/upsert_vanguard_entity_link')) {
      writes.push(await request.json());
      return Response.json(null);
    }
    if (request.url.includes('/vanguard_entity_links')) {
      snapshots++;
      if (mode === 'refresh-failure') return Response.json({ message: 'read unavailable' }, { status: 400 });
      const url = new URL(request.url);
      eq(url.searchParams.get('user_id'), 'eq.owner');
      eq(url.searchParams.get('status'), 'eq.active');
      return Response.json(mode === 'backdated' || snapshots === 1 ? [previous] : [replacement]);
    }
    return Response.json(null);
  };
  try {
    const db = createClient('https://example.supabase.co', 'fixture', { auth: { persistSession: false, autoRefreshToken: false } });
    const records = [1, 2, 3].map(index => ({ id: `episode-${index}`, created_at: `2026-10-19T1${index}:00:00Z`, content: 'Uczę się PJM' }));
    const result = await processRecords(db, records, mode === 'backdated' ? [previous] : [], 'owner', 'fixture', 'stream');
    return { result, writes, prompts, snapshots };
  } finally { globalThis.fetch = original; }
}

Deno.test('later records use persisted IDs and stop seeing predecessors retired earlier in their batch', async () => {
  const { result, writes, prompts } = await processBatch('supersession');
  eq((writes[1].p_metadata as Record<string, unknown>).supersedes_link_id, 'persisted-old');
  const activeFacts = prompts[2].split('EXISTING ACTIVE FACTS:')[1].split('Dla każdej')[0];
  ok(activeFacts.includes('Nowy temat'));
  eq(activeFacts.includes('Dawny temat'), false);
  eq(result.failedRecords, 0);
});

Deno.test('the next triad in one extraction uses the preceding write’s persisted identity', async () => {
  const { result, writes } = await processBatch('same-record');
  eq(writes.length, 2);
  eq((writes[1].p_metadata as Record<string, unknown>).supersedes_link_id, 'persisted-old');
  eq(result.failedRecords, 0);
});

Deno.test('later records retain the real active fact when a backdated upsert did not supersede it', async () => {
  const { result, prompts } = await processBatch('backdated');
  const activeFacts = prompts[1].split('EXISTING ACTIVE FACTS:')[1].split('Dla każdej')[0];
  ok(activeFacts.includes('Dawny temat'));
  eq(activeFacts.includes('Historyczny temat'), false);
  eq(result.failedRecords, 0);
});

Deno.test('a failed context refresh stops the batch and exposes current and unprocessed records for retry', async () => {
  const { result, writes, prompts } = await processBatch('refresh-failure');
  eq(writes.length, 1);
  eq(prompts.length, 1);
  eq(result.totalTriads, 1);
  eq(result.failedRecords, 3);
  eq(result.retryableRecordIds, ['episode-1', 'episode-2', 'episode-3']);
  eq(result.errors.map(error => error.reason), ['context_refresh_failed', 'context_unavailable', 'context_unavailable']);
});
