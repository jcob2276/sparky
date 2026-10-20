import { assertEquals, assertRejects } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { geminiTranscribe } from './gemini.ts';
import { transcribeBlob } from './openai.ts';

Deno.test('transcription skips unavailable Gemini models and uses a supported audio model', async () => {
  const originalFetch = globalThis.fetch;
  const models: string[] = [];
  globalThis.fetch = (input) => {
    const model = String(input).match(/models\/([^:]+):/)?.[1] ?? '';
    models.push(model);
    // Simulate an account where the primary model is unavailable as well.
    return Promise.resolve(model === 'gemini-3.5-flash-lite'
      ? Response.json({ candidates: [{ content: { parts: [{ text: 'Planuję blok pracy.' }] } }] })
      : Response.json({ error: { code: 404, message: 'Model not found' } }, { status: 404 }));
  };
  try {
    assertEquals(await geminiTranscribe(new Blob(['audio'], { type: 'audio/ogg' }), 'gemini-fixture'), 'Planuję blok pracy.');
    assertEquals(models, ['gemini-3.8-flash', 'gemini-3.5-flash-lite']);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

for (const failure of [500, 503, 429, 'network', 'timeout', 'body-500'] as const) {
  Deno.test(`transcription uses the next Gemini model after ${failure}`, async () => {
    const originalFetch = globalThis.fetch;
    const models: string[] = [];
    globalThis.fetch = (input) => {
      const model = String(input).match(/models\/([^:]+):/)?.[1] ?? '';
      models.push(model);
      if (model === 'gemini-3.5-flash-lite') {
        return Promise.resolve(Response.json({ candidates: [{ content: { parts: [{ text: 'Odzyskana głosówka.' }] } }] }));
      }
      if (failure === 'network') return Promise.reject(new TypeError('fetch failed'));
      if (failure === 'timeout') return Promise.reject(new DOMException('Timed out', 'AbortError'));
      const status = failure === 'body-500' ? 500 : failure;
      return Promise.resolve(Response.json({ error: { code: status, message: 'Service unavailable' } }, {
        status: failure === 'body-500' ? 200 : status,
      }));
    };
    try {
      assertEquals(await geminiTranscribe(new Blob(['audio'], { type: 'audio/ogg' }), 'gemini-fixture'), 'Odzyskana głosówka.');
      assertEquals(models.at(-1), 'gemini-3.5-flash-lite');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
}

Deno.test('transcription fails immediately on invalid Gemini credentials', async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = () => {
    calls++;
    return Promise.resolve(Response.json({ error: { code: 401, message: 'Invalid API key' } }, { status: 401 }));
  };
  try {
    await assertRejects(() => geminiTranscribe(new Blob(['audio']), 'invalid-fixture'), Error, '(401)');
    assertEquals(calls, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test('Whisper fallback resolves its own OpenAI key when the caller passes a Gemini key', async () => {
  const originalFetch = globalThis.fetch;
  const oldGemini = Deno.env.get('GEMINI_API_KEY');
  const oldOpenai = Deno.env.get('OPENAI_API_KEY');
  Deno.env.set('GEMINI_API_KEY', 'gemini-fixture');
  Deno.env.set('OPENAI_API_KEY', 'sk-openai-fixture');
  let whisperCalls = 0;
  globalThis.fetch = (input, init) => {
    if (String(input).includes('api.openai.com')) {
      whisperCalls++;
      assertEquals(new Headers(init?.headers).get('Authorization'), 'Bearer sk-openai-fixture');
      const form = init?.body as FormData;
      assertEquals(form.get('model'), 'whisper-1');
      assertEquals(form.get('language'), 'pl');
      assertEquals((form.get('file') as File).name, 'voice.ogg');
      return Promise.resolve(Response.json({ text: 'Odpowiedź z głosówki.' }));
    }
    return Promise.resolve(Response.json({ error: { code: 404, message: 'Model not found' } }, { status: 404 }));
  };
  try {
    assertEquals(await transcribeBlob(new Blob(['audio']), 'gemini-fixture', { filename: 'voice.ogg' }), 'Odpowiedź z głosówki.');
    assertEquals(whisperCalls, 1);
  } finally {
    globalThis.fetch = originalFetch;
    if (oldGemini === undefined) Deno.env.delete('GEMINI_API_KEY'); else Deno.env.set('GEMINI_API_KEY', oldGemini);
    if (oldOpenai === undefined) Deno.env.delete('OPENAI_API_KEY'); else Deno.env.set('OPENAI_API_KEY', oldOpenai);
  }
});
