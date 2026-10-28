import { assertEquals, assertStringIncludes } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { getWarsawDateString } from '../_shared/time.ts';
import { runDailyReconciliation } from './daily.ts';
import { runWeeklySynthesis } from './weekly-synthesis.ts';

for (const mode of ['daily', 'weekly'] as const) {
  Deno.test(`${mode} recap passes nested tasks to its existing prompts`, async () => {
    const settings = {
      SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'test-key', SB_SECRET_KEY: '',
      VANGUARD_USER_ID: '11111111-1111-4111-8111-111111111111', DEEPSEEK_API_KEY: 'test',
      TELEGRAM_BOT_TOKEN: 'test-bot', TELEGRAM_CHAT_ID: '123', OPENROUTER_API_KEY: '', TYPESAFE_API_KEY: '',
    };
    const prior = new Map(Object.keys(settings).map(key => [key, Deno.env.get(key)]));
    for (const [key, value] of Object.entries(settings)) Deno.env.set(key, value);
    const oldFetch = globalThis.fetch;
    const prompts: string[] = [], selects: string[] = [];
    let savedNarrative: unknown;
    const task = { completed_at: null, todo_id: null, checkpoint_id: null, pin_id: null, project_id: null, target_value: null, time_slot: null };
    const win = { date: getWarsawDateString(), day_note: 'Day note', journal_entry: 'Journal', result: 'Z', daily_win_tasks: [
      { ...task, slot: 5, title: 'Calls', done: false, category: 'konto' },
      { ...task, slot: 2, title: 'Run', done: true, category: 'cialo' },
    ] };
    globalThis.fetch = async (input, init) => {
      const url = new URL(input instanceof Request ? input.url : String(input));
      if (url.hostname === 'api.deepseek.com') {
        prompts.push(JSON.parse(String(init?.body)).messages[1].content);
        return Response.json({ choices: [{ message: { content: mode === 'daily' && prompts.length === 2 ? 'Narrative' : 'Reflection' } }] });
      }
      if (url.hostname === 'api.telegram.org') return Response.json({ ok: true, result: { message_id: 1 } });
      if (url.pathname.endsWith('/daily_wins')) {
        selects.push(url.searchParams.get('select') ?? '');
        return Response.json(mode === 'daily' ? win : [win, { date: '2026-10-20', day_note: null, journal_entry: null, result: null, daily_win_tasks: [] }]);
      }
      if (url.pathname.endsWith('/daily_reconciliations') && init?.method === 'POST') {
        savedNarrative = JSON.parse(String(init.body)).evening_extraction;
        return Response.json({ id: 'r1' });
      }
      return Response.json([]);
    };
    try {
      const request = new Request('https://example.supabase.co/functions/v1/recap?force=true', {
        method: 'POST', headers: { Authorization: 'Bearer test-key' },
      });
      const result = await (mode === 'daily' ? runDailyReconciliation : runWeeklySynthesis)(request);
      assertEquals(result != null, true);
      if (mode === 'daily') {
        assertEquals(prompts.length, 2);
        assertStringIncludes(prompts[0], '2. Run: ✓ ZROBIONE');
        assertStringIncludes(prompts[0], '5. Calls: ✗ NIEZROBIONE');
        assertStringIncludes(prompts[0], 'Day note');
        assertStringIncludes(prompts[1], '2. Run (V)');
        assertEquals(savedNarrative, 'Narrative');
      } else {
        assertEquals(prompts.length, 1);
        assertStringIncludes(prompts[0], '- Run -> [WYKONANE]');
        assertStringIncludes(prompts[0], '- Calls -> [NIEWYKONANE]');
        assertStringIncludes(prompts[0], 'SESJE PLANOWANIA / POWER LISTA: 1 z 7 dni');
        assertStringIncludes(prompts[0], 'Day note');
        assertStringIncludes(prompts[0], 'Journal');
      }
      assertEquals(selects.length, 1);
      assertStringIncludes(selects[0], 'daily_win_tasks(');
      assertEquals(/\b(task_[1-5]|done_[1-5]|category_[1-5])\b/.test(selects[0]), false);
    } finally {
      globalThis.fetch = oldFetch;
      for (const [key, value] of prior) if (value == null) Deno.env.delete(key); else Deno.env.set(key, value);
    }
  });
}
