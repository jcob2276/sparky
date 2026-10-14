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

Deno.test('coaching reads Garmin via Intervals provenance and zones from the canonical activity view', async () => {
  const client = createClient('https://example.supabase.co', 'test-key', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: input => {
      const url = new URL(input instanceof Request ? input.url : String(input));
      const columns = (url.searchParams.get('select') ?? '').split(',');
      const rows = url.pathname.endsWith('/strava_activities_clean') && ['source', 'icu_activity_id', 'icu_hr_zone_times', 'trimp'].every(key => columns.includes(key))
        ? [{ strava_id: 12, start_date: '2026-10-13T17:00:00Z', source: 'garmin_intervals', icu_activity_id: 'i12', icu_hr_zone_times: [300, 1200, 100], trimp: 42 }]
        : [];
      return Promise.resolve(Response.json(rows));
    } },
  });
  const context = await fetchHealthCoachContext({ supabase: client, userId: '11111111-1111-4111-8111-111111111111', asOf });
  assertEquals(context.sources.strava_activities_clean.value?.[0].source, 'garmin_intervals');
  assertStringIncludes(formatHealthCoachContext(context), 'Garmin przez Intervals.icu');
});

Deno.test('a review confirmed after asOf cannot close a nutrition day in retrospective context', () => {
  const context = buildHealthCoachContext({ asOf, data: {
    daily_nutrition: [{ date: '2026-10-14', calories: 2200 }],
    nutrition_day_reviews: [{ date: '2026-10-14', completeness: 'complete', confirmed_at: '2026-10-14T20:00:00Z' }],
  } });
  assertEquals(context.sources.daily_nutrition.state, 'provisional');
  assertEquals(context.sources.nutrition_day_reviews.value, null);
});

Deno.test('expired core memory is excluded while confirmed health constraints do not expire', () => {
  const context = buildHealthCoachContext({ asOf, data: { vanguard_preferences: [
    { id: 'expired', key: 'core_memory:focus', value: JSON.stringify({ text: 'old goal', expires_at: '2026-10-01T00:00:00Z' }) },
    { id: 'constraints', key: 'health_coach:constraints', value: JSON.stringify({ equipment: ['barbell'], revision: 1 }) },
  ] } });
  assertEquals(context.sources.vanguard_preferences.value?.map(row => row.id), ['constraints']);
});

Deno.test('nearby planned sessions and calendar events precede distant future declarations', () => {
  const context = buildHealthCoachContext({ asOf, data: {
    training_plan_workouts: [{ id:'later',planned_date:'2026-11-01' },{ id:'today',planned_date:'2026-10-14' }],
    vanguard_calendar: [{ id:'later',start_time:'2026-11-01T10:00:00Z' },{ id:'today',start_time:'2026-10-14T16:00:00Z' }],
  } });
  assertEquals(context.sources.training_plan_workouts.value?.[0].id,'today');
  assertEquals(context.sources.vanguard_calendar.value?.[0].id,'today');
});
