import { strict as assert } from 'node:assert';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { CommandRouterInterceptor } from './_router/interceptors/commands.ts';
import { PhotoInterceptor } from './_router/interceptors/media.ts';
import { buildInitialContext } from './_router/interceptors.ts';
import { handleForceReplyReply } from './_router/messageHelpers.ts';
import { handleCallbackQuery } from './_router/callbacks.ts';
import type { TelegramRouterContext } from './_router/config.ts';

async function withTelegramIo(run: (ctx: TelegramRouterContext) => Promise<void>) {
  const settings = { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'test-key', SB_SECRET_KEY: '' };
  const previous = new Map(Object.keys(settings).map(key => [key, Deno.env.get(key)]));
  const originalFetch = globalThis.fetch;
  const calls: Array<{ path: string; body: Record<string, unknown> }> = [];
  for (const [key, value] of Object.entries(settings)) Deno.env.set(key, value);
  globalThis.fetch = async (input, init) => {
    const request = input instanceof Request ? input : new Request(input, init);
    const url = new URL(request.url);
    const body = request.method === 'POST' ? await request.json() : {};
    calls.push({ path: url.pathname, body });
    if (url.hostname === 'example.supabase.co' && url.pathname === '/rest/v1/outbound_messages') {
      return new Response(null, { status: 201 });
    }
    if (url.hostname === 'api.telegram.org' && url.pathname.endsWith('/answerCallbackQuery')) {
      return Response.json({ ok: true });
    }
    throw new Error('Unexpected nutrition database or AI request: ' + url.pathname);
  };
  try {
    const ctx: TelegramRouterContext = {
      supabase: createClient(settings.SUPABASE_URL, 'test-key', { auth: { persistSession: false, autoRefreshToken: false } }),
      telegramToken: 'test-token', openAiKey: 'test-gemini', deepseekApiKey: 'test-deepseek',
      vanguardUserId: '11111111-1111-4111-8111-111111111111', authorizedChatId: 123,
      supabaseUrl: settings.SUPABASE_URL, supabaseServiceRoleKey: 'test-key',
    };
    await run(ctx);
    assert.ok(calls.length > 0, 'the user receives a response');
    assert.ok(calls.every(call => call.path === '/rest/v1/outbound_messages' || call.path.endsWith('/answerCallbackQuery')),
      'retired inputs must never query nutrition tables, download photos, or invoke AI');
    const texts = calls.flatMap(call => {
      const payload = call.body.payload as { body?: { text?: string } } | undefined;
      return [payload?.body?.text ?? call.body.text].filter((text): text is string => typeof text === 'string');
    });
    assert.ok(texts.some(text => /aplikacj.*Sparky/u.test(text)), 'the response directs the user to the app');
    for (const call of calls) {
      const payload = call.body.payload as { body?: { reply_markup?: { keyboard?: Array<Array<{ text: string }>> } } } | undefined;
      const keys = payload?.body?.reply_markup?.keyboard?.flat() ?? [];
      assert.ok(keys.every(key => !/posi[łl]ek/iu.test(key.text)), 'responses refresh the keyboard without food logging');
    }
  } finally {
    globalThis.fetch = originalFetch;
    for (const [key, value] of previous) {
      if (value === undefined) Deno.env.delete(key); else Deno.env.set(key, value);
    }
  }
}

for (const text of ['/posilek 2 jajka', '/posiłek 2 jajka', '🍽 Posiłek']) {
  Deno.test('retired meal input redirects without nutrition I/O: ' + text, () => withTelegramIo(async ctx => {
    const message = { message_id: 1, chat: { id: 123 }, text };
    assert.equal(await new CommandRouterInterceptor().handle(buildInitialContext(message, ctx)), true);
  }));
}

Deno.test('photos redirect without OCR, downloads or library writes', () => withTelegramIo(async ctx => {
  const message = { message_id: 1, chat: { id: 123 }, photo: [{ file_id: 'photo-id' }] };
  assert.equal(await new PhotoInterceptor().handle(buildInitialContext(message, ctx)), true);
}));

for (const prompt of ['Co zjadłeś?', 'Zapisano (2 produkty)']) {
  Deno.test('reply to retired food prompt redirects: ' + prompt, () => withTelegramIo(async ctx => {
    assert.equal(await handleForceReplyReply(prompt, '200 g', 123, ctx), true);
  }));
}

for (const action of ['food_save', 'food_cancel']) {
  Deno.test('stale meal callback cannot save a pending meal: ' + action, () => withTelegramIo(async ctx => {
    await handleCallbackQuery({
      id: 'callback', data: action + ':11111111-1111-4111-8111-111111111111',
      message: { message_id: 1, chat: { id: 123 } },
    }, ctx);
  }));
}

