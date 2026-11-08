import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { setCategory } from './categories.ts';

const iban = 'PL61109010140000071219812874';
const ownKey = `own-iban:${iban}`;
const id = '00000000-0000-0000-0000-000000000001';
const selected = { id, counterparty_name: 'Jan Kowalski', counterparty_iban: ` pl61 1090 1014 0000 0712 1981 2874 `,
  direction: 'debit', remittance: 'Oszczędności' };

function setup(rules: Array<{ counterparty_key: string; category: string }> = [],
  tx = selected, accounts: Array<{ iban: string | null; name: string | null }> = []) {
  const calls: Array<{ url: URL; method: string; body: Record<string, unknown> }> = [];
  const related = [tx, { ...selected, id: 'incoming', direction: 'credit' },
    { ...selected, id: 'other-account', counterparty_iban: 'PL62109010140000071219812874' },
    { ...selected, id: 'manual-correction', direction: 'credit', category_source: 'manual' }];
  const db = createClient('https://bank.example.test', 'test-service-key', {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: async (input, init) => {
      const req = new Request(input, init);
      const url = new URL(req.url);
      const body = req.method === 'GET' ? {} : await req.json();
      calls.push({ url, method: req.method, body });
      if (url.pathname.includes('/rpc/')) return Response.json(null);
      assertEquals(url.searchParams.get('user_id'), 'eq.owner');
      if (url.pathname.endsWith('/bank_accounts')) return Response.json(accounts);
      if (url.pathname.endsWith('/bank_category_rules')) return Response.json(rules);
      if (url.searchParams.has('id') && req.method === 'GET') return Response.json(tx);
      // A reset recategorizes only rows marked for automatic classification.
      if (url.searchParams.has('category') || url.searchParams.has('category_source')) {
        assertEquals(url.searchParams.get('category_source'), 'neq.manual');
        return Response.json([]);
      }
      const direction = url.searchParams.get('direction');
      return Response.json(related.filter(row => !direction || `eq.${row.direction}` === direction));
    } },
  });
  const rpc = (name: string) => calls.filter(c => c.url.pathname.endsWith(`/rpc/${name}`)).map(c => c.body);
  return { db, rpc };
}

Deno.test('remembering an own transfer persists a normalized IBAN key without a counterparty name', async () => {
  const { db, rpc } = setup([], { ...selected, counterparty_name: '' });
  assertEquals(await setCategory(db, 'owner', { transactionId: id, category: 'przelewy_wlasne', remember: true }), { remembered: true });
  assertEquals(rpc('set_bank_transaction_category'), [{ p_user_id: 'owner', p_transaction_id: id,
    p_category: 'przelewy_wlasne', p_source: 'manual', p_remember: true, p_counterparty_key: ownKey }]);
});

Deno.test('ordinary remembered categories retain directional counterparty keys', async () => {
  const { db, rpc } = setup();
  await setCategory(db, 'owner', { transactionId: id, category: 'zakupy', remember: true });
  assertEquals(rpc('set_bank_transaction_category')[0].p_counterparty_key, 'debit:JAN KOWALSKI');
});

Deno.test('automatic reset retains a confirmed own IBAN rule over a conflicting name rule', async () => {
  const { db, rpc } = setup([{ counterparty_key: ownKey, category: 'przelewy_wlasne' },
    { counterparty_key: 'debit:JAN KOWALSKI', category: 'zakupy' }]);
  await setCategory(db, 'owner', { transactionId: id, category: null });
  assertEquals(rpc('set_bank_transaction_category')[0].p_category, 'przelewy_wlasne');
});

Deno.test('automatic reset never infers account ownership from a matching account name', async () => {
  const { db, rpc } = setup([], selected, [{ iban: null, name: 'Jan Kowalski' }]);
  await setCategory(db, 'owner', { transactionId: id, category: null });
  assertEquals(rpc('set_bank_transaction_category')[0].p_category, 'do_sprawdzenia');
});

Deno.test('automatic reset never infers account ownership from fuzzy name tokens without an IBAN', async () => {
  const { db, rpc } = setup([], { ...selected, counterparty_name: 'Jan Adam Kowalski', counterparty_iban: '' },
    [{ iban: null, name: 'Jan Kowalski' }]);
  await setCategory(db, 'owner', { transactionId: id, category: null });
  assertEquals(rpc('set_bank_transaction_category')[0].p_category, 'do_sprawdzenia');
});

Deno.test('forgetting an own IBAN rule resets both directions and retains name rules for fallback', async () => {
  const { db, rpc } = setup([{ counterparty_key: ownKey, category: 'przelewy_wlasne' },
    { counterparty_key: 'debit:JAN KOWALSKI', category: 'zakupy' },
    { counterparty_key: 'JAN KOWALSKI', category: 'zdrowie' }]);
  await setCategory(db, 'owner', { transactionId: id, category: null, forgetRule: true });
  assertEquals(rpc('forget_bank_category_rule'), [{ p_user_id: 'owner', p_key: ownKey, p_transaction_id: id,
    p_category: 'zakupy', p_related_ids: [id, 'incoming', 'manual-correction'] }]);
  // The existing atomic RPC preserves other manual rows; never replace it with direct bulk writes.
  assertEquals(rpc('set_bank_transaction_category'), []);
});

Deno.test('forgetting a legacy name rule chooses its actual key and leaves another own IBAN rule intact', async () => {
  const { db, rpc } = setup([{ counterparty_key: 'JAN KOWALSKI', category: 'zakupy' },
    { counterparty_key: 'own-iban:PL62109010140000071219812874', category: 'przelewy_wlasne' }]);
  await setCategory(db, 'owner', { transactionId: id, category: null, forgetRule: true });
  assertEquals(rpc('forget_bank_category_rule')[0].p_key, 'JAN KOWALSKI');
  assertEquals(rpc('forget_bank_category_rule')[0].p_category, 'do_sprawdzenia');
  assertEquals(rpc('forget_bank_category_rule')[0].p_related_ids, [id, 'other-account']);
});
