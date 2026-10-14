import { assertEquals, assertStringIncludes } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { buildHealthCoachContext, formatHealthCoachContext } from './healthCoachContext.ts';
import { fetchHealthCoachContext } from './healthCoachContext.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const asOf = '2026-10-14T12:00:00Z';

Deno.test('health context includes strength sets and deduplicated runs without future evidence', () => {
  const context = buildHealthCoachContext({ asOf, data: {
    workout_sessions: [
      { id: 'gym', date: '2026-10-07', exercise_logs: [{ exercise_name: 'Bench', weight: 70, reps: 7 }] },
      { id: 'future', date: '2026-10-15' },
    ],
    strava_activities_clean: [
      { strava_id: 1, start_date: '2026-10-11T18:00:00Z', distance: 5000 },
      { strava_id: 1, start_date: '2026-10-11T18:00:00Z', distance: 5000 },
    ],
  } });
  assertEquals(context.sources.workout_sessions.value?.length, 1);
  assertEquals(context.sources.strava_activities_clean.value?.length, 1);
  assertStringIncludes(formatHealthCoachContext(context), 'Bench');
});

Deno.test('missing, failed, historical and provisional signals remain distinct', () => {
  const context = buildHealthCoachContext({ asOf, data: {
    body_metrics: [{ id: 'body', date: '2026-09-05', weight: 76 }],
    daily_nutrition: [{ date: '2026-10-14', calories: 864 }],
  }, errors: { oura_daily_summary: 'timeout' } });
  assertEquals(context.sources.oura_daily_summary.state, 'failed');
  assertEquals(context.sources.daily_strain.state, 'missing');
  assertEquals(context.sources.body_metrics.state, 'historical');
  assertEquals(context.sources.daily_nutrition.state, 'provisional');
  assertEquals(context.sources.daily_strain.value, null);
});

Deno.test('nutrition is complete only on explicitly closed dates and plans remain future declarations', () => {
  const context = buildHealthCoachContext({ asOf, data: {
    daily_nutrition: [{ date: '2026-10-14', calories: 2200 }],
    nutrition_day_reviews: [{ date: '2026-10-14', completeness: 'complete' }],
    training_plan_workouts: [{ id: 'plan', planned_date: '2026-10-20', workout_name: 'Bieg' }],
  } });
  assertEquals(context.sources.daily_nutrition.state, 'current');
  assertEquals(context.sources.training_plan_workouts.value?.length, 1);
  assertEquals(context.sources.training_plan_workouts.refs[0].kind, 'declared');
});

Deno.test('every fetched health source is restricted to the authenticated owner', async () => {
  const userId = '11111111-1111-4111-8111-111111111111';
  const client = createClient('https://example.supabase.co', 'test-key', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (input) => {
      const url = new URL(input instanceof Request ? input.url : String(input));
      const rows = url.searchParams.get('user_id') === `eq.${userId}` ? []
        : [{ id: 'other-owner', date: '2026-10-14', name: 'PRIVATE' }];
      return Promise.resolve(new Response(JSON.stringify(rows), { headers: { 'content-type': 'application/json' } }));
    } },
  });
  const context = await fetchHealthCoachContext({ supabase: client, userId, asOf });
  assertEquals(Object.values(context.sources).every(source => source.value === null), true);
  assertEquals(context.queryErrors, []);
});

Deno.test('a review confirmed after asOf cannot close a nutrition day in retrospective context', () => {
  const context = buildHealthCoachContext({ asOf, data: {
    daily_nutrition: [{ date: '2026-10-14', calories: 2200 }],
    nutrition_day_reviews: [{ date: '2026-10-14', completeness: 'complete', confirmed_at: '2026-10-14T20:00:00Z' }],
  } });
  assertEquals(context.sources.daily_nutrition.state, 'provisional');
  assertEquals(context.sources.nutrition_day_reviews.value, null);
});
