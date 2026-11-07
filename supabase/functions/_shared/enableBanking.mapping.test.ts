import { assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { mapTransaction, type EbTransaction } from './enableBanking.ts';

Deno.test('stable entry reference survives changing detail IDs', () => {
  const tx: EbTransaction = { entry_reference: 'stable', transaction_id: 'detail-1', transaction_amount: { amount: '12.30', currency: 'PLN' }, credit_debit_indicator: 'DBIT' };
  assertEquals(mapTransaction(tx)?.transaction_id, 'entry:stable');
  assertEquals(mapTransaction({ ...tx, transaction_id: 'detail-2' })?.transaction_id, 'entry:stable');
  assertEquals(mapTransaction(tx)?.amount, -12.3);
  assertEquals(mapTransaction({ ...tx, entry_reference: undefined }), null);
  assertEquals(mapTransaction({ ...tx, transaction_amount: { amount: 'NaN', currency: 'PLN' } }), null);
});
