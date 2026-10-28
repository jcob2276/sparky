import { assertEquals, assertStringIncludes } from 'https://deno.land/std@0.208.0/assert/mod.ts'
import { stub } from 'https://deno.land/std@0.208.0/testing/mock.ts'

Deno.test('period comparison uses nested task completion and categories in both periods', async () => {
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
      prompt = JSON.parse(String(init?.body)).messages[1].content
      return Response.json({ choices: [{ message: { content: JSON.stringify({ summary: 'Test', improved: [], worsened: [], changes: [], journal: [] }) } }] })
    }
    if (url.pathname.endsWith('/daily_wins')) {
      selects.push(url.searchParams.get('select') ?? '')
      const isA = url.searchParams.getAll('date').includes('gte.2026-10-28')
      return Response.json(isA ? [
        { date: '2026-10-28', day_note: 'Note A', daily_win_tasks: [
          { ...task, slot: 5, title: 'Calls', done: false, category: 'konto' },
          { ...task, slot: 2, title: 'Run', done: true, category: 'cialo' },
        ] },
      ] : [
        { date: '2026-10-21', day_note: 'Note B', daily_win_tasks: [
          { ...task, slot: 3, title: 'Read', done: true, category: 'duch' },
        ] },
        { date: '2026-10-22', day_note: null, daily_win_tasks: [] },
      ])
    }
    return Response.json([])
  }
  try {
    await import('./index.ts')
    const handler = serving.calls[0].args[0] as unknown as (req: Request) => Promise<Response>
    serving.restore()
    const response = await handler(new Request('https://example.supabase.co/functions/v1/period-compare', {
      method: 'POST', headers: { Authorization: 'Bearer test-key', 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'u1', a: { start: '2026-10-28', end: '2026-10-28' }, b: { start: '2026-10-21', end: '2026-10-22' } }),
    }))
    assertEquals(response.status, 200)
    await response.json()
    assertStringIncludes(prompt, 'Zadania z planu: 1/2 zrobionych (wg obszarów: cialo 1/1, konto 0/1)')
    assertStringIncludes(prompt, 'Zadania z planu: 1/1 zrobionych (wg obszarów: duch 1/1)')
    assertStringIncludes(prompt, 'Note A')
    assertStringIncludes(prompt, 'Note B')
    assertEquals(selects.length, 2)
    for (const select of selects) {
      assertStringIncludes(select, 'daily_win_tasks(')
      assertEquals(/\b(task_[1-5]|done_[1-5]|category_[1-5])\b/.test(select), false)
    }
  } finally {
    if (!serving.restored) serving.restore()
    globalThis.fetch = oldFetch
    for (const [key, value] of prior) if (value == null) Deno.env.delete(key); else Deno.env.set(key, value)
  }
})
