import { assertEquals, assertStringIncludes } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { formatEchoes, pickEchoes } from './echoes.ts';

const long = 'To jest wystarczająco długi wpis, w którym Jakub opisuje swoje myśli o sprzedaży i zaufaniu do samego siebie.';
const row = (d: string, sim: number, table = 'vanguard_stream', content = long) => ({ table_name: table, content, source_date: d, similarity: sim });

Deno.test('pickEchoes skips recent days, short texts, other tables and duplicates per day', () => {
  const picked = pickEchoes([
    row('2026-10-26', 0.9),
    row('2026-09-01', 0.8, 'vanguard_stream', 'krótkie'),
    row('2026-09-02', 0.7, 'user_fundament'),
    row('2026-08-01', 0.6),
    row('2026-08-01', 0.65),
  ], '2026-10-27');
  assertEquals(picked.map((p) => p.source_date), ['2026-08-01']);
  assertEquals(picked[0].similarity, 0.65);
});

Deno.test('formatEchoes quotes with date and age, empty when nothing', () => {
  assertEquals(formatEchoes([], '2026-10-27'), '');
  const text = formatEchoes([row('2026-08-01', 0.7)], '2026-10-27');
  assertStringIncludes(text, '2026-08-01');
  assertStringIncludes(text, '3 mies. temu');
});
