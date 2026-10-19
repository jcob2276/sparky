import { deepStrictEqual as assertEquals } from 'node:assert';

let webhook: (req: Request) => Promise<Response>;
const serveDescriptor = Object.getOwnPropertyDescriptor(Deno, 'serve')!;
Object.defineProperty(Deno, 'serve', { configurable: true, writable: true, value: (handler: typeof webhook) => { webhook = handler; } });
try {
  await import('./index.ts');
} finally {
  Object.defineProperty(Deno, 'serve', serveDescriptor);
}

async function requestWebhook(kind: 'message' | 'callback_query', failure: boolean, secret = 'test-secret') {
  const settings = {
    SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'test-service-key', SB_SECRET_KEY: '',
    VANGUARD_USER_ID: '11111111-1111-4111-8111-111111111111', TELEGRAM_CHAT_ID: '123', TELEGRAM_WEBHOOK_SECRET: 'test-secret',
  };
  const prior = new Map(Object.keys(settings).map(key => [key, Deno.env.get(key)]));
  const originalFetch = globalThis.fetch;
  const payload = kind === 'message'
    ? { update_id: 1, message: { message_id: 2, chat: { id: 123 }, text: 'Notatka' } }
    : { update_id: 1, callback_query: { id: 'callback', data: 'test', message: { message_id: 2, chat: { id: 123 } } } };
  const writes: unknown[] = [];
  for (const [key, value] of Object.entries(settings)) Deno.env.set(key, value);
  globalThis.fetch = async (input, init) => {
    const req = input instanceof Request ? input : new Request(input, init);
    const url = new URL(req.url);
    assertEquals(url.hostname, 'example.supabase.co');
    if (url.pathname === '/rest/v1/vanguard_telegram_inbox') {
      writes.push(await req.json());
      if (failure) return Response.json({ message: 'inbox unavailable' }, { status: 503 });
    }
    return new Response(null, { status: 201 });
  };
  try {
    const response = await webhook(new Request('https://example.supabase.co/functions/v1/vanguard-telegram', {
      method: 'POST', headers: { 'X-Telegram-Bot-Api-Secret-Token': secret }, body: JSON.stringify(payload),
    }));
    assertEquals(writes, secret === 'test-secret' ? [{ payload }] : []);
    return response;
  } finally {
    globalThis.fetch = originalFetch;
    for (const [key, value] of prior) {
      if (value === undefined) Deno.env.delete(key); else Deno.env.set(key, value);
    }
  }
}

for (const kind of ['message', 'callback_query'] as const) {
  Deno.test(`webhook rejects ${kind} with an invalid secret before any inbox write`, async () => {
    const response = await requestWebhook(kind, false, 'wrong-secret');
    assertEquals(response.status, 403);
  });
  Deno.test(`webhook only acknowledges ${kind} after its inbox write succeeds`, async () => {
    const response = await requestWebhook(kind, false);
    assertEquals(response.status, 200);
    assertEquals(await response.text(), 'OK');
  });
  Deno.test(`webhook leaves ${kind} retryable when its inbox write fails`, async () => {
    const response = await requestWebhook(kind, true);
    assertEquals(response.status, 503);
  });
}
