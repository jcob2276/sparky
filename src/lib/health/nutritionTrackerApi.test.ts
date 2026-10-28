// @vitest-environment node
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildCaptureItems, confirmMealCapture } from './nutritionTrackerApi';
import { removeFoodEntry, updateFoodEntry } from './foodLogging';

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('../supabase', () => ({ supabase: { rpc } }));
vi.mock('./nutritionSideEffects', () => ({ scheduleNutritionRefresh: vi.fn() }));

const base = { id: 'x', name: 'Pierogi z serem', grams: 350, calories: 756, protein: 31.5, carbs: 98, fat: 24 };

describe('buildCaptureItems', () => {
  it('converts whole-portion macros to the add_food_entry per-100g contract', () => {
    const [item] = buildCaptureItems([{
      id: 'rice', name: 'Ryż', grams: 200, calories: 260,
      protein: 5.4, carbs: 56, fat: 0.6, confidence: 'medium', source: 'llm',
    }]);

    expect(item.per100).toEqual(expect.objectContaining({
      calories: 130, protein: 2.7, carbs: 28, fat: 0.3,
    }));
    expect(item.parseMeta).toEqual(expect.objectContaining({
      user_confirmed: true, trust_level: 'estimated',
    }));
    expect(item.requestId).toEqual(expect.any(String));
  });

  it('marks Open Food Facts and reference data as reference, not confirmed', () => {
    const [off, ref] = buildCaptureItems(['off', 'reference_pl'].map((macroSource) => ({
      ...base, confidence: 'high' as const, source: 'database' as const,
      parseMeta: { macroSource: macroSource as 'off' | 'reference_pl', parserVersion: 't', explicitGrams: true },
    })));
    expect(off.parseMeta.trust_level).toBe('reference');
    expect(ref.parseMeta.trust_level).toBe('reference');
  });

  it('keeps a copied LLM estimate an estimate even though it comes from the library path', () => {
    const [item] = buildCaptureItems([{
      ...base, confidence: 'medium', source: 'library',
      parseMeta: { macroSource: 'llm_estimate', parserVersion: 'repeat-v2', priorUncertaintyPct: 25 },
    }], 'repeat');
    expect(item.parseMeta.trust_level).toBe('estimated');
    expect(item.parseMeta.uncertainty_pct).toBeGreaterThanOrEqual(25);
  });

  it('gives a photo estimate a realistic range instead of 8%', () => {
    const [item] = buildCaptureItems([{
      ...base, confidence: 'high', source: 'llm',
      parseMeta: { macroSource: 'llm_estimate', parserVersion: 'meal-photo-v1', explicitGrams: false },
    }], 'photo');
    expect(item.parseMeta.uncertainty_pct).toBeGreaterThanOrEqual(20);
  });

  it('sends salt per 100 g and keeps unknown salt as null', () => {
    const [withSalt, without] = buildCaptureItems([
      { ...base, confidence: 'high', source: 'library', salt: 3.5, saturatedFat: 10, parseMeta: { macroSource: 'library', parserVersion: 't' } },
      { ...base, confidence: 'high', source: 'library' },
    ]);
    expect(withSalt.per100).toEqual(expect.objectContaining({ salt: 1, saturated_fat: 2.9 }));
    expect(without.per100.salt).toBeNull();
  });
});

it.each([0, -1, NaN, Infinity])('rejects invalid mass %s instead of quietly writing 1 g', (grams) => {
  expect(() => buildCaptureItems([{ ...base, grams, confidence: 'high', source: 'library' }])).toThrow(/mas/i);
});

async function prepareDiaryDb(db: PGlite, owner: string, other: string) {
    // Minimal schema follows scripts/tests/food-nutrient-provenance.test.mjs.
    // RPCs and aggregate triggers below come from production SQL, not a mock rollup.
    await db.exec(`
      CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
      CREATE SCHEMA auth;
      CREATE TABLE auth.users(id uuid PRIMARY KEY);
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS
        $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      CREATE TABLE daily_food_entries (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, date date, name text, brand text,
        calories integer, protein numeric, carbs numeric, fat numeric, fiber numeric, sugar numeric,
        saturated_fat numeric, salt numeric, insulin_load numeric, meal_type text, amount text,
        logged_at timestamptz, created_at timestamptz DEFAULT now(), meal_group_id uuid,
        parse_meta jsonb, request_id uuid
      );
      CREATE TABLE daily_nutrition (
        user_id uuid, date date, calories integer, protein numeric, carbs numeric, fat numeric,
        fiber numeric, sugar numeric, insulin_load numeric, UNIQUE(user_id,date)
      );
      CREATE TABLE food_favorites (
        id uuid DEFAULT gen_random_uuid(), user_id uuid, name text, brand text, barcode text,
        calories integer, protein numeric, carbs numeric, fat numeric, fiber numeric, sugar numeric,
        saturated_fat numeric, default_grams integer, is_pinned boolean,
        use_count integer DEFAULT 1, last_used timestamptz DEFAULT now()
      );
      CREATE UNIQUE INDEX food_favorites_user_name_brand_key ON food_favorites(user_id,name,coalesce(brand,''));
      CREATE TABLE food_library (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),created_at timestamptz DEFAULT now(),
        validation_status text DEFAULT 'unreviewed',validation_reason text,validated_at timestamptz,
        user_id uuid, name text, brand text, barcode text, calories numeric, protein numeric,
        carbs numeric, fat numeric, fiber numeric, sugar numeric, saturated_fat numeric,
        default_grams integer, source text
      );
      CREATE TABLE food_reference_pl(id integer PRIMARY KEY);
      CREATE UNIQUE INDEX food_library_user_name_brand_key ON food_library(user_id,name,coalesce(brand,''));
      ALTER TABLE food_favorites ADD COLUMN library_id uuid REFERENCES food_library(id);
      CREATE FUNCTION public.cache_food_to_library(uuid,text,text,text,numeric,numeric,numeric,
        numeric,numeric,numeric,integer,numeric) RETURNS void LANGUAGE sql AS $$ SELECT $$;
    `);
    await db.query('INSERT INTO auth.users VALUES ($1),($2)', [owner, other]);
    const baseline = await readFile('supabase/migrations/20260504000000_baseline.sql', 'utf8');
    const start = baseline.indexOf('CREATE OR REPLACE FUNCTION "public"."remove_food_entry"');
    const end = baseline.indexOf('ALTER FUNCTION "public"."remove_food_entry"', start);
    await db.exec(baseline.slice(start, end));
    for (const migration of [
      '20260809145537_nutrition_adaptive_tracker.sql',
      '20261014115624_health_nutrition_totals_integrity.sql',
      '20261021210000_saturated_fat_pipeline.sql',
      '20261027160425_food_nutrient_provenance.sql',
      '20261027222927_food_entry_portion_micronutrients.sql',
    ]) await db.exec(await readFile(`supabase/migrations/${migration}`, 'utf8'));
    await db.exec(await readFile('scripts/ops/food-favorites-library-cutover.sql', 'utf8'));
    await db.exec(`ALTER TABLE food_favorites DROP COLUMN name,DROP COLUMN brand,DROP COLUMN barcode,
      DROP COLUMN calories,DROP COLUMN protein,DROP COLUMN carbs,DROP COLUMN fat,DROP COLUMN fiber,
      DROP COLUMN sugar,DROP COLUMN saturated_fat,DROP COLUMN salt,DROP COLUMN nutrient_sources`);
}

describe('nutrition diary aggregate regression', () => {
  const db = new PGlite();
  const owner = '11111111-1111-4111-8111-111111111111';
  const other = '22222222-2222-4222-8222-222222222222';
  const firstDay = '2026-10-27';
  const secondDay = '2026-10-28';

  beforeAll(() => prepareDiaryDb(db, owner, other), 30000);

  afterAll(async () => { await db.close(); });

  beforeEach(async () => {
    await db.exec('TRUNCATE daily_food_entries,daily_nutrition,nutrition_meal_captures,nutrition_meal_memories,food_favorites');
    await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [owner]);
    rpc.mockReset();
    // Replace only the network transport; execute the real RPC bodies in PostgreSQL.
    rpc.mockImplementation(async (name: string, args: Record<string, unknown>) => {
      if (name === 'confirm_nutrition_meal_capture') {
        const result = await db.query(`SELECT * FROM confirm_nutrition_meal_capture(
          $1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8::jsonb)`, [
          args.p_user_id, args.p_capture_id, args.p_date, args.p_meal_type, args.p_source,
          JSON.stringify(args.p_items), JSON.stringify(args.p_parse_summary), JSON.stringify(args.p_memory ?? null),
        ]);
        return { data: result.rows, error: null };
      }
      if (name === 'update_food_entry' || name === 'remove_food_entry') {
        const sql = name === 'update_food_entry'
          ? 'SELECT update_food_entry($1,$2,$3::jsonb)' : 'SELECT remove_food_entry($1,$2)';
        const params = [args.p_user_id, args.p_entry_id];
        if (name === 'update_food_entry') params.push(JSON.stringify(args.p_entry));
        await db.query(sql, params);
        return { data: null, error: null };
      }
      throw new Error(`Unexpected RPC: ${name}`);
    });
  });

  async function saveMeal(date: string, calories: number) {
    await confirmMealCapture({ userId: owner, date, mealType: 'lunch', source: 'text', items: [{
      ...base, id: `meal-${calories}`, name: `Posiłek ${calories}`, grams: 100,
      calories, protein: 10, carbs: 20, fat: 5, confidence: 'high', source: 'library',
    }] });
  }

  async function totals() {
    return (await db.query<{ user_id: string; date: string; calories: number }>(
      'SELECT user_id,date::text,calories FROM daily_nutrition ORDER BY user_id,date',
    )).rows;
  }

  async function entryId(date: string) {
    return (await db.query<{ id: string }>(
      'SELECT id FROM daily_food_entries WHERE user_id=$1 AND date=$2 ORDER BY calories LIMIT 1',
      [owner, date],
    )).rows[0].id;
  }

  it('editing a meal refreshes its day without changing the other day', async () => {
    await saveMeal(firstDay, 400);
    await saveMeal(firstDay, 600);
    await saveMeal(secondDay, 300);
    await updateFoodEntry(owner, await entryId(firstDay), {
      calories: 250, protein: 12, carbs: 25, fat: 6, meal_type: 'lunch', amount: '100 g',
    });
    expect(await totals()).toEqual([
      { user_id: owner, date: firstDay, calories: 850 },
      { user_id: owner, date: secondDay, calories: 300 },
    ]);
  });

  it('deleting meals refreshes the day including zero after the last entry', async () => {
    await saveMeal(firstDay, 400);
    await saveMeal(firstDay, 600);
    await saveMeal(secondDay, 300);
    await removeFoodEntry(owner, await entryId(firstDay));
    expect(await totals()).toEqual([
      { user_id: owner, date: firstDay, calories: 600 },
      { user_id: owner, date: secondDay, calories: 300 },
    ]);
    await removeFoodEntry(owner, await entryId(firstDay));
    expect(await totals()).toEqual([
      { user_id: owner, date: firstDay, calories: 0 },
      { user_id: owner, date: secondDay, calories: 300 },
    ]);
  });

  it.each([false, true])('moving a meal recomputes both days (last source entry: %s)', async (lastEntry) => {
    await saveMeal(firstDay, 400);
    if (!lastEntry) await saveMeal(firstDay, 600);
    await saveMeal(secondDay, 300);
    await db.query('UPDATE daily_food_entries SET date=$1 WHERE id=$2 AND user_id=$3',
      [secondDay, await entryId(firstDay), owner]);
    expect(await totals()).toEqual([
      { user_id: owner, date: firstDay, calories: lastEntry ? 0 : 600 },
      { user_id: owner, date: secondDay, calories: 700 },
    ]);
  });

  it('parallel meal captures retain every entry and calorie', async () => {
    await saveMeal(firstDay, 100);
    // PGlite queues one connection: exercises overlapping API calls, not inter-session lock contention.
    await Promise.all([saveMeal(firstDay, 400), saveMeal(firstDay, 600), saveMeal(secondDay, 300)]);
    expect(await totals()).toEqual([
      { user_id: owner, date: firstDay, calories: 1100 },
      { user_id: owner, date: secondDay, calories: 300 },
    ]);
    expect((await db.query<{ n: number }>('SELECT count(*)::int AS n FROM daily_food_entries')).rows[0].n).toBe(4);
  });

  it('day aggregates equal entry sums for the same day and user after mutations', async () => {
    await saveMeal(firstDay, 400);
    await saveMeal(firstDay, 600);
    await saveMeal(secondDay, 300);
    await db.query(`INSERT INTO daily_food_entries(user_id,date,calories,protein,carbs,fat)
      VALUES ($1,$2,900,90,80,70),($1,$3,800,80,70,60)`, [other, firstDay, secondDay]);
    await db.query('UPDATE daily_food_entries SET date=$1,calories=250 WHERE id=$2',
      [secondDay, await entryId(firstDay)]);
    await removeFoodEntry(owner, await entryId(firstDay));
    expect(await totals()).toEqual([
      { user_id: owner, date: firstDay, calories: 0 },
      { user_id: owner, date: secondDay, calories: 550 },
      { user_id: other, date: firstDay, calories: 900 },
      { user_id: other, date: secondDay, calories: 800 },
    ]);
    const mismatches = await db.query(`
      WITH entry_sums AS (
        SELECT user_id,date,sum(calories) AS calories,sum(protein) AS protein,
          sum(carbs) AS carbs,sum(fat) AS fat FROM daily_food_entries GROUP BY user_id,date
      )
      SELECT * FROM daily_nutrition d FULL JOIN entry_sums e USING(user_id,date)
      WHERE d.calories IS DISTINCT FROM coalesce(e.calories,0)
        OR d.protein IS DISTINCT FROM e.protein OR d.carbs IS DISTINCT FROM e.carbs
        OR d.fat IS DISTINCT FROM e.fat
    `);
    expect(mismatches.rows).toEqual([]);
  });
});
