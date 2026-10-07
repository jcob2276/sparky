import { assertEquals, assertThrows } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { parseUsCatalogue } from './usCatalogueData.ts';

const input = { fields: ['cik', 'name', 'ticker', 'exchange'], data: [
  [1045810, 'NVIDIA CORP', 'NVDA', 'Nasdaq'], [1067983, 'BERKSHIRE HATHAWAY INC', 'BRK-B', 'NYSE'],
  [123, 'Registrant', 'ABCD', null],
] };
Deno.test('SEC catalogue preserves identifiers and missing exchange without inventing listing status', () => {
  assertEquals(parseUsCatalogue(input), [
    { cik: '0001045810', name: 'NVIDIA CORP', ticker: 'NVDA', exchange: 'Nasdaq' },
    { cik: '0001067983', name: 'BERKSHIRE HATHAWAY INC', ticker: 'BRK-B', exchange: 'NYSE' },
    { cik: '0000000123', name: 'Registrant', ticker: 'ABCD', exchange: null },
  ]);
});
Deno.test('SEC catalogue fails closed on malformed or duplicate identifiers', () => {
  assertThrows(() => parseUsCatalogue({ ...input, fields: ['name', 'cik', 'ticker', 'exchange'] }));
  assertThrows(() => parseUsCatalogue({ ...input, data: [...input.data, input.data[0]] }));
  assertThrows(() => parseUsCatalogue({ ...input, data: [[0, 'Invalid', 'NVDA', 'Nasdaq']] }));
  assertThrows(() => parseUsCatalogue({ ...input, data: [[123, 'Invalid', 'ABC?', 'NYSE']] }));
  assertThrows(() => parseUsCatalogue({ ...input, data: [] }));
});
