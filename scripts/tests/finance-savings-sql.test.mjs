import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';

test('savings migration preserves bank accounts and validates the new explicit account type', async () => {
  const db = new PGlite();
  try {
    await db.exec(`create table finance_accounts(id integer primary key, account_type text not null,
      constraint finance_accounts_account_type_check check(account_type in('bank','cash')));
      insert into finance_accounts values(1,'bank');`);
    await db.exec(readFileSync(new URL('../../supabase/migrations/20261108083235_finance_savings_accounts.sql', import.meta.url), 'utf8'));
    await db.exec("insert into finance_accounts values(2,'savings');");
    assert.deepEqual((await db.query('select account_type from finance_accounts order by id')).rows, [{account_type:'bank'},{account_type:'savings'}]);
    await assert.rejects(db.exec("insert into finance_accounts values(3,'unsupported');"));
  } finally { await db.close(); }
});
