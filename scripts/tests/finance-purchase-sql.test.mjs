import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const db=new PGlite();
const user='11111111-1111-4111-8111-111111111111';
const other='22222222-2222-4222-8222-222222222222';
const holding='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const funding='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
try {
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.user',true),'')::uuid$$;
    create table finance_holdings(id uuid primary key,user_id uuid,quantity numeric,avg_cost_pln numeric,updated_at timestamptz);
    create table finance_accounts(id uuid primary key,user_id uuid,balance numeric,bank_account_id uuid,is_liquid boolean,
      account_type text constraint finance_accounts_account_type_check check(account_type in ('cash','bank','etf','stocks','btc','bonds','other')));`);
  for(const file of ['20261107185834_finance_original_cost.sql','20261107190615_finance_broker_cash.sql','20261107191334_finance_holding_purchase.sql']) {
    await db.exec(await readFile(`supabase/migrations/${file}`,'utf8'));
  }
  await db.query("select set_config('test.user',$1,false)",[user]);
  await db.query('insert into finance_holdings(id,user_id,quantity,avg_cost_pln,avg_cost_original) values($1,$2,10,100,100)',[holding,user]);
  await db.query("insert into finance_accounts(id,user_id,balance,account_type) values($1,$2,3000,'broker_cash')",[funding,user]);
  await db.query('select record_finance_holding_purchase($1,10,200,$2)',[holding,funding]);
  assert.deepEqual((await db.query('select quantity,avg_cost_pln,avg_cost_original from finance_holdings')).rows[0],{quantity:'20',avg_cost_pln:'150.0000000000000000',avg_cost_original:'150.0000000000000000'});
  assert.equal(Number((await db.query('select balance from finance_accounts')).rows[0].balance),1000);
  await assert.rejects(db.query('select record_finance_holding_purchase($1,100,200,$2)',[holding,funding]),/insufficient balance/);
  assert.equal(Number((await db.query('select quantity from finance_holdings')).rows[0].quantity),20);
  await db.query("select set_config('test.user',$1,false)",[other]);
  await assert.rejects(db.query('select record_finance_holding_purchase($1,1,200,$2)',[holding,funding]),/Holding not found/);
  await db.query("select set_config('test.user',$1,false)",[user]);
  await db.exec("update finance_holdings set avg_cost_currency='USD'");
  await assert.rejects(db.query('select record_finance_holding_purchase($1,1,200,$2)',[holding,funding]),/Historical PLN/);
  await db.exec('set role anon');
  await assert.rejects(db.query('select record_finance_holding_purchase($1,1,200,$2)',[holding,funding]),/permission denied/);
  console.log('Purchase SQL: atomic funding debit, both cost averages, insufficient balance, owner and currency guards PASS');
} finally { await db.close(); }
