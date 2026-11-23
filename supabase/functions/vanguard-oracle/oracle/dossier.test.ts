import { assertEquals, assertStringIncludes } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { formatDossierBlock } from './dossier.ts';

const NOW = new Date('2026-11-23T12:00:00Z');

Deno.test('formats a fresh dossier with date header', () => {
  const out = formatDossierBlock('## Rytm\nSen 6h', '2026-11-23T03:00:00Z', NOW);
  assertStringIncludes(out, 'stan na 2026-11-23');
  assertStringIncludes(out, '## Rytm');
});

Deno.test('drops a stale dossier (older than 5 days)', () => {
  assertEquals(formatDossierBlock('treść', '2026-11-10T03:00:00Z', NOW), '');
});

Deno.test('drops empty content and invalid dates', () => {
  assertEquals(formatDossierBlock('   ', '2026-11-23T03:00:00Z', NOW), '');
  assertEquals(formatDossierBlock('treść', 'nie-data', NOW), '');
});

Deno.test('caps very long dossiers', () => {
  const out = formatDossierBlock('x'.repeat(20000), '2026-11-23T03:00:00Z', NOW);
  assertEquals(out.length < 11600, true);
});
