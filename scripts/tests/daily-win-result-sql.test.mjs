import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
const user = '11111111-1111-4111-8111-111111111111';
const closed = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const open = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const empty = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

const result = async (id) => (await db.query('select result from daily_wins where id=$1', [id])).rows[0].result;

try {
  await db.exec(`create table daily_wins(id uuid primary key, user_id uuid not null, date date, result text);
    create table daily_win_tasks(id uuid primary key default gen_random_uuid(), day_win_id uuid references daily_wins(id) on delete cascade, user_id uuid, slot int, title text, done boolean default false);`);
  const migration = await readFile('supabase/migrations/20261108140000_daily_win_result_from_tasks.sql', 'utf8');
  await db.exec(migration);

  await db.query(`insert into daily_wins values ($1,$4,'2026-11-02','P'), ($2,$4,'2026-11-03',null), ($3,$4,'2026-11-04','P')`, [closed, open, empty, user]);
  await db.query(`insert into daily_win_tasks(day_win_id,user_id,slot,title,done) select $1,$2,s,'t'||s,false from generate_series(1,5) s`, [closed, user]);
  await db.query(`insert into daily_win_tasks(day_win_id,user_id,slot,title,done) select $1,$2,s,'t'||s,true from generate_series(1,3) s`, [open, user]);

  // zamknięty dzień: późniejsze odhaczenia zmieniają P na Z dopiero po ostatnim slocie
  await db.query(`update daily_win_tasks set done=true where day_win_id=$1 and slot<5`, [closed]);
  assert.equal(await result(closed), 'P');
  await db.query(`update daily_win_tasks set done=true where day_win_id=$1 and slot=5`, [closed]);
  assert.equal(await result(closed), 'Z');

  // cofnięcie slotu wraca do P
  await db.query(`update daily_win_tasks set done=false where day_win_id=$1 and slot=3`, [closed]);
  assert.equal(await result(closed), 'P');

  // dzień niezamknięty zostaje bez wyniku, nawet gdy wszystko jest zrobione
  assert.equal(await result(open), null);

  // formularz domknięcia wpisujący P przy wykonanych slotach zostaje uzgodniony z zadaniami
  await db.query(`update daily_win_tasks set done=true where day_win_id=$1`, [closed]);
  await db.query(`update daily_wins set result='P' where id=$1`, [closed]);
  assert.equal(await result(closed), 'Z');

  // dzień bez slotów zostaje P
  await db.query(`update daily_wins set result='Z' where id=$1`, [empty]);
  assert.equal(await result(empty), 'P');
  console.log('daily-win-result SQL: ok');
} finally {
  await db.close();
}
