import { assertEquals, assertStringIncludes } from 'https://deno.land/std@0.208.0/assert/mod.ts'
import { stub } from 'https://deno.land/std@0.208.0/testing/mock.ts'

Deno.test('week insight reads nested tasks into the prompt and counts days with tasks', async () => {
  const settings = { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'test-key', SB_SECRET_KEY: '', DEEPSEEK_API_KEY: 'test' }
  const prior = new Map(Object.keys(settings).map(key => [key, Deno.env.get(key)]))
  for (const [key, value] of Object.entries(settings)) Deno.env.set(key, value)
  const oldFetch = globalThis.fetch
  const serving = stub(Deno, 'serve', () => ({} as Deno.HttpServer<Deno.NetAddr>))
  const selects: string[] = []
  let prompt = ''
  const task = { completed_at: null, todo_id: null, checkpoint_id: null, pin_id: null, project_id: null, target_value: null, time_slot: null }
  globalThis.fetch = async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input))
    if (url.hostname === 'api.deepseek.com') {
      const body = JSON.parse(String(init?.body))
      prompt = body.messages[1].content
      return Response.json({ choices: [{ message: { content: JSON.stringify({ summary: 'Test', changes: [], patterns: [] }) } }] })
    }
    if (url.pathname.endsWith('/daily_wins')) {
      selects.push(url.searchParams.get('select') ?? '')
      return Response.json([
        { date: '2026-10-28', day_note: 'Note', daily_win_tasks: [
          { ...task, slot: 5, title: 'Calls', done: false, category: 'konto' },
          { ...task, slot: 2, title: 'Run', done: true, category: 'cialo' },
        ] },
        { date: '2026-10-27', day_note: null, daily_win_tasks: [] },
        { date: '2026-10-26', day_note: null, daily_win_tasks: null },
      ])
    }
    return Response.json([])
  }
  try {
    await import('./index.ts')
    const handler = serving.calls[0].args[0] as unknown as (req: Request) => Promise<Response>
    serving.restore()
    const response = await handler(new Request('https://example.supabase.co/functions/v1/week-insight', {
      method: 'POST', headers: { Authorization: 'Bearer test-key', 'Content-Type': 'application/json' },
      body: JSON.stringify({ today: '2026-10-28', userId: 'u1' }),
    }))
    assertEquals(response.status, 200)
    assertEquals((await response.json()).basedOn.days, 1)
    assertStringIncludes(prompt, '✓ Run [cialo]; ✗ Calls [konto]')
    assertStringIncludes(prompt, 'opinia: "Note"')
    assertStringIncludes(prompt, '2026-10-27 (wtorek) bez oceny; zadania: brak planu')
    assertEquals(selects.length, 1)
    assertStringIncludes(selects[0], 'daily_win_tasks(')
    assertEquals(/\b(task_[1-5]|done_[1-5]|category_[1-5])\b/.test(selects[0]), false)
  } finally {
    if (!serving.restored) serving.restore()
    globalThis.fetch = oldFetch
    for (const [key, value] of prior) if (value == null) Deno.env.delete(key); else Deno.env.set(key, value)
  }
})
