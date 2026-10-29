import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
const owner = '11111111-1111-4111-8111-111111111111', other = '22222222-2222-4222-8222-222222222222';
const project = '33333333-3333-4333-8333-333333333333';
const day = '2026-10-29';

try {
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated;
    CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    CREATE TABLE public.daily_wins(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, date date NOT NULL, result text, UNIQUE(user_id,date));
    CREATE TABLE public.todo_items(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, title text, status text DEFAULT 'open',
      completed_at timestamptz, scheduled_time timestamptz, duration_minutes integer, due_date date);
    CREATE TABLE public.goal_kpis(id uuid PRIMARY KEY DEFAULT gen_random_uuid());
    CREATE TABLE public.daily_win_tasks(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), day_win_id uuid NOT NULL REFERENCES public.daily_wins(id) ON DELETE CASCADE,
      slot integer NOT NULL, user_id uuid NOT NULL, title text NOT NULL, done boolean DEFAULT false, category text, completed_at timestamptz,
      todo_id uuid, checkpoint_id uuid, pin_id uuid, project_id uuid, target_value text, time_slot text);
    CREATE TABLE public.supplement_logs(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, date date NOT NULL, logged_at timestamptz NOT NULL DEFAULT now());
    -- Produkcyjne funkcje synchronizacji (odczytane z bazy 2026-10-29)
    CREATE FUNCTION public.sync_daily_win_tasks_to_todo() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $f$
    BEGIN
      IF pg_trigger_depth() > 1 OR NEW.todo_id IS NULL THEN RETURN NEW; END IF;
      IF NEW.done IS NOT DISTINCT FROM OLD.done AND NEW.completed_at IS NOT DISTINCT FROM OLD.completed_at THEN RETURN NEW; END IF;
      UPDATE public.todo_items
      SET status = CASE WHEN NEW.done THEN 'done' ELSE 'open' END,
          completed_at = CASE WHEN NEW.done THEN COALESCE(NEW.completed_at, now()) ELSE NULL END
      WHERE id = NEW.todo_id AND user_id = NEW.user_id
        AND (status IS DISTINCT FROM (CASE WHEN NEW.done THEN 'done' ELSE 'open' END)
          OR completed_at IS DISTINCT FROM (CASE WHEN NEW.done THEN COALESCE(NEW.completed_at, now()) ELSE NULL END));
      RETURN NEW;
    END; $f$;
    CREATE TRIGGER trg_sync_daily_win_tasks_to_todo AFTER UPDATE OF done, completed_at ON public.daily_win_tasks
      FOR EACH ROW EXECUTE FUNCTION public.sync_daily_win_tasks_to_todo();
    GRANT USAGE ON SCHEMA auth, public TO authenticated; GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
    GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;
  `);
  await db.query('INSERT INTO auth.users VALUES($1),($2)', [owner, other]);
  await db.exec(await readFile('supabase/migrations/20261029120000_dc_consistency_morning_supplements.sql', 'utf8'));
  await db.exec(`SET ROLE authenticated; SET request.jwt.claim.sub = '${owner}'`);

  const todo = async (title, status = 'open', user = owner) => (await db.query(
    `INSERT INTO public.todo_items(user_id,title,status,completed_at) VALUES($1,$2,$3,CASE WHEN $3='done' THEN '2026-10-29T06:00:00Z'::timestamptz END) RETURNING id`,
    [user, title, status])).rows[0].id;
  const submit = (slots) => db.query('SELECT public.submit_morning_plan($1,$2,$3::jsonb,$4::jsonb) AS id', [owner, day, JSON.stringify(slots), '[]']);
  const tasks = async () => (await db.query(`SELECT t.slot,t.title,t.done,t.completed_at,t.todo_id,t.project_id,t.target_value,t.kpi_id FROM public.daily_win_tasks t ORDER BY slot`)).rows;
  const todoRow = async (id) => (await db.query('SELECT status,completed_at FROM public.todo_items WHERE id=$1', [id])).rows[0];
  const reset = async () => { await db.exec('DELETE FROM public.daily_win_tasks; DELETE FROM public.todo_items; DELETE FROM public.daily_wins'); };
  const slot = (n, title, todo_id = '') => ({ slot: n, title, todo_id, category: 'general' });

  // 1. Podmiana ukończonego A na ukończone B nie cofa ukończenia B.
  let a = await todo('A', 'done'), b = await todo('B', 'done');
  await submit([slot(1, 'A', a)]);
  await submit([slot(1, 'B', b)]);
  assert.deepEqual(await todoRow(b), { status: 'done', completed_at: new Date('2026-10-29T06:00:00Z') }, 'zastapione zadanie B zachowuje ukonczenie w Todo');
  assert.equal((await tasks())[0].done, true, 'slot pokazuje B jako ukonczone');
  await reset();

  // 2. Nowe zadanie nie dziedziczy metadanych poprzedniego.
  a = await todo('A'); b = await todo('B');
  await submit([slot(1, 'A', a)]);
  const kpi = (await db.query('INSERT INTO public.goal_kpis DEFAULT VALUES RETURNING id')).rows[0].id;
  await db.query(`UPDATE public.daily_win_tasks SET project_id=$1, target_value='10', kpi_id=$2 WHERE slot=1`, [project, kpi]);
  await submit([slot(1, 'B', b)]);
  let row = (await tasks())[0];
  assert.equal(row.project_id, null, 'projekt A nie przechodzi na B');
  assert.equal(row.target_value, null, 'target A nie przechodzi na B');
  assert.equal(row.kpi_id, null, 'KPI A nie przechodzi na B');
  await reset();

  // 3. To samo zadanie zachowuje metadane przy ponownym zapisie i po przeniesieniu do innego slotu.
  a = await todo('A', 'done');
  await submit([slot(1, 'A', a)]);
  const keptKpi = (await db.query('INSERT INTO public.goal_kpis DEFAULT VALUES RETURNING id')).rows[0].id;
  await db.query(`UPDATE public.daily_win_tasks SET project_id=$1, target_value='10', kpi_id=$2 WHERE slot=1`, [project, keptKpi]);
  await submit([slot(1, 'A', a)]);
  assert.equal((await tasks())[0].target_value, '10', 'ponowny zapis zachowuje metadane');
  assert.equal((await tasks())[0].kpi_id, keptKpi, 'ponowny zapis zachowuje wybrany KPI');
  await submit([slot(2, 'A', a)]);
  const moved = await tasks();
  assert.equal(moved.length, 1);
  assert.equal(moved[0].slot, 2);
  assert.equal(moved[0].done, true, 'przeniesione ukonczone zadanie pozostaje ukonczone');
  assert.equal(moved[0].target_value, '10', 'metadane przechodza ze slotem tego samego zadania');
  assert.equal(moved[0].kpi_id, keptKpi, 'KPI przechodzi ze slotem tego samego zadania');
  await reset();

  // 4. Wolne zadanie (bez Todo) zachowuje ukończenie przy przeniesieniu.
  await submit([slot(1, 'Spacer')]);
  await db.query(`UPDATE public.daily_win_tasks SET done=true, completed_at='2026-10-29T07:00:00Z' WHERE slot=1`);
  await submit([slot(3, 'Spacer')]);
  const free = await tasks();
  assert.equal(free[0].slot, 3);
  assert.equal(free[0].done, true);
  await reset();

  // 5. Zamiana miejscami dwóch zadań nie zmienia statusów Todo.
  a = await todo('A', 'done'); b = await todo('B', 'open');
  await submit([slot(1, 'A', a), slot(2, 'B', b)]);
  await submit([slot(1, 'B', b), slot(2, 'A', a)]);
  const swapped = await tasks();
  assert.deepEqual(swapped.map(t => [t.title, t.done]), [['B', false], ['A', true]]);
  assert.equal((await todoRow(a)).status, 'done');
  assert.equal((await todoRow(b)).status, 'open');
  await reset();

  // 6. Cudze Todo jest odrzucone, a obcy userId nie przechodzi.
  const foreign = await todo('Obce', 'open', other);
  await assert.rejects(submit([slot(1, 'Obce', foreign)]), /todo not found/);
  await assert.rejects(db.query('SELECT public.submit_morning_plan($1,$2,$3::jsonb,$4::jsonb)', [other, day, '[]', '[]']), /forbidden/);
  await reset();

  // 7. Suplement z nieznaną godziną (null) jest dozwolony; istniejące znaczniki czasu zostają.
  await db.query(`INSERT INTO public.supplement_logs(user_id,date,logged_at) VALUES($1,'2026-10-20','2026-10-20T08:00:00Z')`, [owner]);
  await db.query(`INSERT INTO public.supplement_logs(user_id,date,logged_at) VALUES($1,'2026-10-21',NULL)`, [owner]);
  const logs = (await db.query('SELECT date::text AS d, logged_at FROM public.supplement_logs ORDER BY date')).rows;
  assert.equal(logs[0].logged_at.toISOString(), '2026-10-20T08:00:00.000Z');
  assert.equal(logs[1].logged_at, null);

  console.log('morning-plan-sql: ok');
} finally {
  await db.close();
}
