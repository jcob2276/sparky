import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { describeSec13fError } from './sec13fErrors.ts';

Deno.test('SEC import preserves Postgres error message and code without unrelated properties', () => {
  assertEquals(describeSec13fError({ code: '57014', message: 'canceling statement due to statement timeout', details: null, hint: '', credential: 'never expose' }),
    '57014: canceling statement due to statement timeout');
  assertEquals(describeSec13fError(new Error('SEC HTTP 429')), 'SEC HTTP 429');
  assertEquals(describeSec13fError({ message: 'Invalid summary', details: 'Row total differs', hint: 'Check units' }),
    'Invalid summary — Row total differs — Check units');
});
