import { assertEquals, assertStringIncludes } from 'https://deno.land/std@0.208.0/assert/mod.ts'
import { LAB_PARSE_PROMPT, normalizeLabParse } from './labParseCore.ts'

Deno.test('keeps readable rows, converts decimal commas and drops rows without a name or number', () => {
  const doc = normalizeLabParse({
    resultDate: '2026-10-20',
    provider: ' Diagnostyka ',
    results: [
      { marker_name: 'Ferrytyna', value: '45,5', unit: 'ng/ml', ref_low: '30', ref_high: 400, category: null },
      { marker_name: 'HBsAg', value: 'ujemny', unit: '' },
      { marker_name: '', value: 3 },
      { marker_name: 'CRP', value: 1.2, unit: 'mg/l', ref_low: null, ref_high: 5 },
    ],
  })
  assertEquals(doc?.provider, 'Diagnostyka')
  assertEquals(doc?.results.map((r) => [r.marker_name, r.value, r.ref_low, r.ref_high]), [['Ferrytyna', 45.5, 30, 400], ['CRP', 1.2, null, 5]])
})

Deno.test('an invalid date becomes null and a non-object reply is rejected', () => {
  assertEquals(normalizeLabParse({ resultDate: '20.10.2026', results: [] })?.resultDate, null)
  assertEquals(normalizeLabParse(null), null)
  assertEquals(normalizeLabParse('x'), null)
})

Deno.test('the prompt forbids guessing and diagnosis', () => {
  assertStringIncludes(LAB_PARSE_PROMPT, 'Niczego nie zgaduj')
  assertStringIncludes(LAB_PARSE_PROMPT, 'Nie dodawaj interpretacji ani diagnoz')
})
