import { assertEquals, assertStringIncludes } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { formatGraphMemory } from './graphEvidence.ts';

Deno.test('formatGraphMemory splits strong and weak and drops case/space duplicates', () => {
  const text = formatGraphMemory([
    { fact_text: 'Jakub trenuje rano', evidence_count: 4 },
    { fact_text: 'Jakub  lubi kebab', evidence_count: 1 },
    { fact_text: 'jakub lubi kebab', evidence_count: 2 },
  ]);
  assertStringIncludes(text, 'POWTARZALNE');
  assertEquals(text.match(/kebab/gi)?.length, 1);
});

Deno.test('formatGraphMemory labels weak signals as hypotheses', () => {
  const text = formatGraphMemory([{ fact_text: 'X', evidence_count: 1, learned_at: '2026-09-01T10:00:00Z' }]);
  assertStringIncludes(text, 'POJEDYNCZE SYGNAŁY');
  assertStringIncludes(text, '(obserwacji: 1, zapisane 2026-09-01)');
});

Deno.test('formatGraphMemory extracts multi-hop chains when relational entities link together', () => {
  const text = formatGraphMemory([
    { source_entity: 'Jakub', relation: 'planuje', target_entity: 'Sprzedaż B2B', evidence_count: 3 },
    { source_entity: 'Sprzedaż B2B', relation: 'wymaga', target_entity: 'Zimne telefony', evidence_count: 3 },
  ]);
  assertStringIncludes(text, 'ŚCIEŻKI POWIĄZAŃ WIELOETAPOWYCH (MULTI-HOP GRAPH)');
  assertStringIncludes(text, 'Jakub ──[planuje]──> Sprzedaż B2B ──[wymaga]──> Zimne telefony');
});
