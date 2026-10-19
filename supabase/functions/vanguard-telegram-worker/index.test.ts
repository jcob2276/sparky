import { deepStrictEqual as assertEquals } from 'node:assert';
import { PhotoInterceptor } from '../vanguard-telegram/_router/interceptors.ts';

let worker: (req: Request) => Promise<Response>;
const serveDescriptor = Object.getOwnPropertyDescriptor(Deno, 'serve')!;
Object.defineProperty(Deno, 'serve', { configurable: true, writable: true, value: (handler: typeof worker) => { worker = handler; } });
try {
  await import('./index.ts');
} finally {
  Object.defineProperty(Deno, 'serve', serveDescriptor);
}

for (const scenario of ['completed', 'pipeline-error', 'voice-error', 'stream-error']) {
  const fails = scenario !== 'completed';
  const voice = scenario === 'voice-error';
  const stream = scenario === 'stream-error';
  Deno.test(`worker records ${fails ? 'failed' : 'completed'} for ${scenario}`, async () => {
    const settings = {
      SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'test-service-key', SB_SECRET_KEY: '',
      VANGUARD_USER_ID: '11111111-1111-4111-8111-111111111111', TELEGRAM_CHAT_ID: '123',
      TELEGRAM_BOT_TOKEN: 'test-token',
    };
    const prior = new Map(Object.keys(settings).map(key => [key, Deno.env.get(key)]));
    const originalFetch = globalThis.fetch;
    const originalPhoto = PhotoInterceptor.prototype.handle;
    const states: string[] = [];
    let oracleCalls = 0;
    for (const [key, value] of Object.entries(settings)) Deno.env.set(key, value);
    PhotoInterceptor.prototype.handle = async () => {
      if (voice || stream) return false;
      if (fails) throw new Error('pipeline unavailable');
      return true;
    };
    globalThis.fetch = async (input, init) => {
      const req = input instanceof Request ? input : new Request(input, init);
      const url = new URL(req.url);
      if (url.hostname === 'api.telegram.org') {
        return Response.json({ ok: !url.pathname.endsWith('/getFile'), description: 'voice file unavailable' });
      }
      assertEquals(url.hostname, 'example.supabase.co');
      if (url.pathname.endsWith('/vanguard-oracle')) oracleCalls++;
      if (req.method === 'GET') return Response.json(null);
      if (stream && url.pathname === '/rest/v1/vanguard_stream') {
        return Response.json({ message: 'stream unavailable' }, { status: 503 });
      }
      if (url.pathname === '/rest/v1/vanguard_telegram_inbox') {
        const patch = await req.json();
        states.push(patch.status);
        if (patch.status === 'failed') assertEquals(patch.error_log.includes(voice ? 'ścieżki pliku' : stream ? 'strumieniu' : 'pipeline unavailable'), true);
      }
      return new Response(null, { status: 204 });
    };
    try {
      const response = await worker(new Request('https://example.supabase.co/functions/v1/vanguard-telegram-worker', {
        method: 'POST', headers: { Authorization: 'Bearer test-service-key', 'Content-Type': 'application/json' },
        body: JSON.stringify({ record: { id: 'inbox-1', payload: { message: {
          message_id: 2, chat: { id: 123 }, ...(voice ? { voice: { file_id: 'voice-1', duration: 10 } } : { text: 'Notatka' }),
        } } } }),
      }));
      assertEquals(response.status, 200);
      assertEquals(states, ['processing', fails ? 'failed' : 'completed']);
      if (stream) assertEquals(oracleCalls, 0);
    } finally {
      globalThis.fetch = originalFetch;
      PhotoInterceptor.prototype.handle = originalPhoto;
      for (const [key, value] of prior) {
        if (value === undefined) Deno.env.delete(key); else Deno.env.set(key, value);
      }
    }
  });
}
