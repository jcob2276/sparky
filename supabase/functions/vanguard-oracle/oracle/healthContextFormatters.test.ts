import { assertEquals, assertStringIncludes } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { computeHealthSummary, formatStrainContext } from './healthContextFormatters.ts';

Deno.test('historical strain keeps its date and is never presented as today', () => {
  const text = formatStrainContext([{ date: '2026-10-13', strain_score: 8 }], false, '2026-10-14');
  assertEquals(text.includes('DZIŚ:'), false);
  assertStringIncludes(text, '2026-10-13');
});

Deno.test('physiological averages exclude missing values rather than converting null to zero', () => {
  const { healthSummary14d } = computeHealthSummary([
    { date: '2026-10-14', hrv_avg: null },
    { date: '2026-10-13', hrv_avg: 60 },
  ], [], [], '2026-10-01', '2026-10-14', true);
  assertEquals(healthSummary14d.avg_hrv, 60);
  assertEquals(healthSummary14d.avg_sleep_hours, null);
});

Deno.test('provisional food data cannot become an unconditional permission to train hard', () => {
  const text = formatStrainContext([{
    date: '2026-10-14', daily_status: 'green', fueling_provisional: true,
  }], false, '2026-10-14');
  assertEquals(text.includes('Green=można obciążać'), false);
  assertStringIncludes(text, 'niekompletn');
});
