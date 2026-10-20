import { assertEquals, assertRejects } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { getEmbedding, openaiChat } from './openai.ts';

for (const operation of ['chat', 'embedding'] as const) {
  Deno.test(`${operation} uses Gemini credentials and never falls back to OpenAI`, async () => {
    const originalFetch = globalThis.fetch;
    const oldGemini = Deno.env.get('GEMINI_API_KEY');
    const oldOpenai = Deno.env.get('OPENAI_API_KEY');
    Deno.env.set('GEMINI_API_KEY', 'gemini-fixture');
    Deno.env.set('OPENAI_API_KEY', 'sk-legacy-fixture');
    const requests: URL[] = [];
    globalThis.fetch = (input) => {
      requests.push(new URL(String(input)));
      return Promise.resolve(Response.json({ error: { code: 401, message: 'Invalid key' } }, { status: 401 }));
    };
    try {
      if (operation === 'chat') {
        await assertRejects(() => openaiChat({ apiKey: 'sk-legacy-fixture', messages: [{ role: 'user', content: 'Test' }] }));
      } else {
        assertEquals(await getEmbedding('Test', 'sk-legacy-fixture'), null);
      }
      assertEquals(requests.length > 0, true);
      assertEquals(requests.every(url => url.hostname === 'generativelanguage.googleapis.com'), true);
      assertEquals(requests.every(url => url.searchParams.get('key') === 'gemini-fixture'), true);
    } finally {
      globalThis.fetch = originalFetch;
      if (oldGemini === undefined) Deno.env.delete('GEMINI_API_KEY'); else Deno.env.set('GEMINI_API_KEY', oldGemini);
      if (oldOpenai === undefined) Deno.env.delete('OPENAI_API_KEY'); else Deno.env.set('OPENAI_API_KEY', oldOpenai);
    }
  });
}

Deno.test('chat falls back to a supported Gemini model when the primary is unavailable', async () => {
  const originalFetch = globalThis.fetch;
  const models: string[] = [];
  globalThis.fetch = (input) => {
    const model = String(input).match(/models\/([^:]+):/)?.[1] ?? '';
    models.push(model);
    return Promise.resolve(model === 'gemini-3.5-flash-lite'
      ? Response.json({ candidates: [{ content: { parts: [{ text: 'SPARKY TEST 2048' }] } }] })
      : Response.json({ error: { code: 404, message: 'Model not found' } }, { status: 404 }));
  };
  try {
    const result = await openaiChat({ apiKey: 'gemini-fixture', messages: [{ role: 'user', content: 'Read the image' }] });
    assertEquals(result.content, 'SPARKY TEST 2048');
    assertEquals(models, ['gemini-3.8-flash', 'gemini-3.5-flash-lite']);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
