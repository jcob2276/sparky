import { assertEquals, assertRejects } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { createServiceClient } from '../supabase.ts';
import { getRecentFeedback } from './feedbackRepo.ts';

async function withFeedbackDb(
  response: (url: URL) => Response,
  run: (db: ReturnType<typeof createServiceClient>) => Promise<void>,
) {
  const originalFetch = globalThis.fetch;
  const env = ['SUPABASE_URL', 'SB_SECRET_KEY'] as const;
  const previous = env.map((key) => Deno.env.get(key));
  Deno.env.set('SUPABASE_URL', 'https://feedback.invalid');
  Deno.env.set('SB_SECRET_KEY', 'test-service-key');
  globalThis.fetch = (input) => Promise.resolve(response(new URL(input instanceof Request ? input.url : String(input))));
  try {
    await run(createServiceClient());
  } finally {
    globalThis.fetch = originalFetch;
    env.forEach((key, i) => previous[i] === undefined ? Deno.env.delete(key) : Deno.env.set(key, previous[i]!));
  }
}

Deno.test('feedback reads scope both score groups to the user and rolling 30 days with independent limits', async () => {
  const urls: URL[] = [];
  await withFeedbackDb((url) => {
    urls.push(url);
    const score = url.searchParams.get('score') === 'eq.-1' ? -1 : 1;
    return Response.json([{ score, query: 'q', reply: score === -1 ? 'bad' : 'good' }]);
  }, async (db) => {
    const rows = await getRecentFeedback(db, 'user-42', new Date('2026-10-28T12:00:00Z'));
    assertEquals(rows.map((row) => row.reply), ['bad', 'good']);
  });
  assertEquals(urls.length, 2);
  for (const url of urls) {
    assertEquals(url.pathname, '/rest/v1/vanguard_feedback');
    assertEquals(url.searchParams.get('select'), 'score,query,reply');
    assertEquals(url.searchParams.get('user_id'), 'eq.user-42');
    assertEquals(url.searchParams.getAll('created_at'), ['gte.2026-09-28T12:00:00.000Z', 'lte.2026-10-28T12:00:00.000Z']);
    assertEquals(url.searchParams.get('order'), 'created_at.desc');
    assertEquals(url.searchParams.get('limit'), url.searchParams.get('score') === 'eq.-1' ? '5' : '3');
  }
});

Deno.test('feedback repository reports database errors instead of treating them as no feedback', async () => {
  await withFeedbackDb(() => Response.json({ message: 'feedback unavailable' }, { status: 400 }), async (db) => {
    await assertRejects(() => getRecentFeedback(db, 'user-42'));
  });
});
