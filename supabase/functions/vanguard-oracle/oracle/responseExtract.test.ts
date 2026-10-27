import { assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { salvageJsonAnswer } from './responseExtract.ts';

Deno.test('salvageJsonAnswer pulls the answer out of near-JSON with unescaped quotes', () => {
  const bad = '{\n  "answer": "Zero "daj znać" tutaj.\n\n[SPLIT]\n\nDrugie.",\n  "confidence": "high",\n  "claims": []\n}';
  assertEquals(salvageJsonAnswer(bad), 'Zero "daj znać" tutaj.\n\n[SPLIT]\n\nDrugie.');
});

Deno.test('salvageJsonAnswer returns null when there is no answer field', () => {
  assertEquals(salvageJsonAnswer('{nic}'), null);
});
