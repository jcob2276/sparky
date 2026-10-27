import { assertEquals, assertStringIncludes } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { formatPillars } from './pillars.ts';

const goals = {
  goal_konto: 'Top Closer.', goal_cialo: 'Sylwetka i sen.', goal_duch: 'Dotrzymuję słowa.',
  date_konto: '2027-07-04', date_cialo: '2026-12-31', date_duch: '2027-01-01',
  anti_goal_konto: null, anti_goal_cialo: null, anti_goal_duch: null,
};

Deno.test('formatPillars lists three pillars with their own words and KPIs', () => {
  const text = formatPillars(goals, [{ name: 'Sales calle', unit: 'calli/tydz', target: 10, pillar: 'konto' }]);
  assertStringIncludes(text, 'Konto (do 2027-07-04): Top Closer. Wskaźniki w systemie: Sales calle 10 calli/tydz.');
  assertStringIncludes(text, 'Duch (do 2027-01-01): Dotrzymuję słowa.');
  assertStringIncludes(text, 'regularność, REM');
});

Deno.test('formatPillars skips empty pillars and handles missing row', () => {
  assertEquals(formatPillars(null, []), '');
  assertEquals(formatPillars({ ...goals, goal_konto: null, goal_cialo: ' ', goal_duch: null }, []), '');
});
