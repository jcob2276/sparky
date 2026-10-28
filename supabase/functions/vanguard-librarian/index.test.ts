import { assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { runLibrarian } from './librarian.ts'

Deno.test('librarian scopes all reads, skips normalized catalog names and only ensures missing products', async () => {
  const owner = '11111111-1111-4111-8111-111111111111'
  const writes: Record<string, unknown>[] = [], prompts: string[] = []
  const db = createClient('https://example.supabase.co', 'test', { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input)), table = url.pathname.split('/').at(-1)
    if (table === 'ensure_food_library') {
      const body = JSON.parse(String(init?.body)); writes.push(body)
      assertEquals(body.p_user_id, owner)
      assertEquals(body.p_food.source, 'llm_estimate')
      assertEquals('source_type' in body.p_food, false); assertEquals('is_public' in body.p_food, false)
      return Response.json('new-id')
    }
    assertEquals(init?.method ?? 'GET', 'GET')
    assertEquals(url.searchParams.get('user_id'), `eq.${owner}`)
    if (table === 'daily_food_entries') return Response.json([
      { name: '  Existing FOOD ', user_id: owner }, { name: 'New food', user_id: owner }, { name: ' new FOOD ', user_id: owner },
    ])
    if (table === 'food_library') return Response.json([{ name: 'existing food' }])
    assertEquals(table, 'food_corrections'); return Response.json([])
  } } })
  let messages = 0
  const result = await runLibrarian({ db, userId: owner, apiKey: 'test', tgToken: 'test', tgChatId: '123',
    propose: async (request) => { prompts.push(request.messages.at(-1)?.content ?? ''); return { content: JSON.stringify({ calories: 150, protein: 5, carbs: 20, fat: 5 }), raw: {} } },
    send: async () => { messages++; return Response.json({ ok: true }) },
  })
  assertEquals(result.count, 1); assertEquals(writes.length, 1); assertEquals(messages, 1)
  assertEquals(prompts.length, 1); assertEquals(writes[0].p_default_grams, 100)
})
