import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { deepseekChat } from './deepseek.ts';

Deno.test('DeepSeek thinking is opt-in configurable without changing other callers', async () => {
  const originalFetch = globalThis.fetch;
  const requests: Record<string, unknown>[] = [];
  globalThis.fetch = (_input, init) => {
    requests.push(JSON.parse(String(init?.body)));
    return Promise.resolve(new Response(JSON.stringify({ choices: [{ finish_reason: 'stop', message: { content: 'Sourced analysis' } }] }),
      { headers: { 'Content-Type': 'application/json' } }));
  };
  try {
    const input = { apiKey: 'fixture', model: 'deepseek-v4-flash' as const,
      messages: [{ role: 'user' as const, content: 'Summarize the supplied evidence' }] };
    const result = await deepseekChat({ ...input, thinking: 'disabled' });
    assertEquals(result.content, 'Sourced analysis');
    assertEquals(result.finishReason, 'stop');
    assertEquals(requests[0].thinking, { type: 'disabled' });
    await deepseekChat(input);
    assertEquals(Object.hasOwn(requests[1], 'thinking'), false);
  } finally { globalThis.fetch = originalFetch; }
});
