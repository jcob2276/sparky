import { deepStrictEqual as eq } from 'node:assert';
import { deterministicTriads } from './rules.ts';

Deno.test('family fallback requires both a grandmother and her named place', () => {
  for (const text of ['Odwiedziłem Krosno', 'Mój kuzyn mieszka w Zeglicach', 'Rozmawiałem z babcią']) {
    eq(deterministicTriads(text), []);
  }
  eq(deterministicTriads('Moja babcia mieszka w Krośnie').map(t => [t.source, t.relation, t.target]), [
    ['Jakub', 'ma_relacje_z', 'Babcia z Krosna'], ['Babcia z Krosna', 'mieszka_w', 'Krosno'],
  ]);
});
