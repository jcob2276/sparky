import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
const user = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
const connection = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const account = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const tx = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
try {
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql as $$select null::uuid$$;
    create table finance_accounts(id uuid primary key default gen_random_uuid(), user_id uuid not null, name text, balance numeric, account_type text, is_liquid boolean);
    create table finance_transactions(id uuid primary key default gen_random_uuid(), user_id uuid not null, account_id uuid);
    insert into auth.users values ('${user}'), ('${other}');`);
  for (const file of ['20261107150000_bank_open_banking.sql', '20261107210000_bank_hidden_note_categories.sql', '20261107220000_bank_category_rules.sql']) {
    await db.exec(await readFile(`supabase/migrations/${file}`, 'utf8'));
  }
  await db.query('insert into bank_connections(id,user_id,aspsp_name,aspsp_country) values($1,$2,$3,$4)', [connection, user, 'Bank', 'PL']);
  await db.query('insert into bank_accounts(id,user_id,connection_id,account_uid,iban) values($1,$2,$3,$4,$5)', [account,user,connection,'uid','PL123']);
  await db.query('insert into bank_transactions(id,user_id,account_id,transaction_id,amount,currency,direction,raw,category,category_source) values($1,$2,$3,$4,-10,$5,$6,$7,$8,$9)',
    [tx,user,account,'changing-id','PLN','debit',{ entry_reference: 'stable', transaction_id: 'changing-id' },'sport','manual']);
  await db.exec(await readFile('supabase/migrations/20261107181828_bank_finance_views.sql','utf8'));
  const first = (await db.query('select id,transaction_id,category,category_source from bank_transactions')).rows[0];
  assert.deepEqual(first,{id:tx,transaction_id:'entry:stable',category:'sport',category_source:'manual'});
  await db.query(`insert into bank_transactions(user_id,account_id,transaction_id,amount,currency,direction,raw)
    values($1,$2,'different-detail',-11,'PLN','debit',$3) on conflict(account_id,transaction_id) do update set amount=excluded.amount`,
    [user,account,{entry_reference:'stable',transaction_id:'different-detail'}]);
  assert.equal((await db.query('select count(*)::int as n from bank_transactions')).rows[0].n,1);
  assert.equal((await db.query('select category from bank_transactions')).rows[0].category,'sport');
  await assert.rejects(db.query('insert into finance_accounts(user_id,name,bank_account_id) values($1,$2,$3)',[other,'Other',account]),/foreign key/);
  await db.query('insert into finance_accounts(user_id,name,bank_account_id) values($1,$2,$3)',[user,'Mine',account]);
  await assert.rejects(db.query('insert into finance_accounts(user_id,name,bank_account_id) values($1,$2,$3)',[user,'Duplicate',account]),/unique/);
  await assert.rejects(db.query('select set_bank_transaction_category($1,$2,$3,$4,true,$5)',[other,tx,'zdrowie','manual','debit:SHOP']),/not found/);
  assert.equal((await db.query('select count(*)::int as n from bank_category_rules')).rows[0].n,0);
  await db.query('select set_bank_transaction_category($1,$2,$3,$4,true,$5)',[user,tx,'zdrowie','manual','debit:SHOP']);
  assert.equal((await db.query('select category from bank_category_rules')).rows[0].category,'zdrowie');
  await db.exec(await readFile('supabase/migrations/20261107183606_bank_finance_setup.sql','utf8'));
  await db.query('select forget_bank_category_rule($1,$2,$3,$4,$5)',[user,'debit:SHOP',tx,'do_sprawdzenia',[tx]]);
  assert.equal((await db.query('select count(*)::int as n from bank_category_rules')).rows[0].n,0);
  assert.deepEqual((await db.query('select category,category_source from bank_transactions')).rows[0], {category:'do_sprawdzenia',category_source:'rule'});
  await db.exec(await readFile('supabase/migrations/20261107184436_bank_manual_reconciliation.sql','utf8'));
  const financeId = (await db.query('select id from finance_accounts where user_id=$1',[user])).rows[0].id;
  await db.query('insert into finance_transactions(user_id,account_id,bank_transaction_id,bank_reconciled) values($1,$2,$3,true)',[user,financeId,tx]);
  await assert.rejects(db.query('insert into finance_transactions(user_id,account_id,bank_transaction_id) values($1,$2,$3)',[other,financeId,tx]),/linked account/);
  await db.exec('set role authenticated');
  await assert.rejects(db.query('select set_bank_transaction_category($1,$2,$3,$4)',[user,tx,'sport','manual']),/permission denied/);
  await db.exec('reset role');
  const fresh = new PGlite();
  try {
    await fresh.exec(`create role anon; create role authenticated; create role service_role;
      create schema auth; create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql as $$select null::uuid$$;
      create table finance_accounts(id uuid primary key default gen_random_uuid(),user_id uuid,name text,balance numeric,account_type text,is_liquid boolean);
      create table finance_transactions(id uuid primary key default gen_random_uuid(),user_id uuid,account_id uuid);`);
    for (const file of ['20261107150000_bank_open_banking.sql','20261107181827_bank_visibility_prerequisite.sql',
      '20261107181828_bank_finance_views.sql','20261107183606_bank_finance_setup.sql',
      '20261107184436_bank_manual_reconciliation.sql',
      '20261107200000_bank_rls_initplan.sql','20261107210000_bank_hidden_note_categories.sql','20261107220000_bank_category_rules.sql']) {
      await fresh.exec(await readFile(`supabase/migrations/${file}`,'utf8'));
    }
    assert.equal((await fresh.query("select count(*)::int as n from information_schema.columns where table_name='bank_accounts' and column_name='hidden'")).rows[0].n,1);
  } finally { await fresh.close(); }
  console.log('Bank SQL: stable identity, preserved correction, ownership, duplicate links and atomic category/rule PASS');
} finally { await db.close(); }
