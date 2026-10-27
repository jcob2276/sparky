/**
 * @function food-micronutrient-backfill
 * @trigger ręcznie (service role lub zalogowany użytkownik), porcjami do skutku
 * @role Uzupełnia w historii brakujący błonnik, cukier, nasycone i sól szacunkiem modelu (tylko puste pola, oznaczone estimate)
 * @reads daily_food_entries
 * @writes daily_food_entries
 * @consumer karta „Jakość danych” i paski pokrycia składników (przez daily_food_entries)
 * @status active
 */
import { serveJson } from '../_shared/http.ts';
import { createServiceClient } from '../_shared/supabase.ts';
import { requestMicronutrientEstimates, type MicronutrientEstimateRequestItem } from '../_shared/foodParse/micronutrientEstimate.ts';
import { applyMicronutrientEstimates, parseAmountGrams, type EstimableItem } from '@vanguard/domain';

const DEFAULT_GROUP_LIMIT = 40;
const MAX_GROUP_LIMIT = 80;
const MARKER = 'micronutrientBackfillAt';
const COLUMNS = ['fiber', 'sugar', 'saturated_fat', 'salt'] as const;
const FIELD_OF: Record<(typeof COLUMNS)[number], 'fiber' | 'sugar' | 'saturatedFat' | 'salt'> = {
  fiber: 'fiber', sugar: 'sugar', saturated_fat: 'saturatedFat', salt: 'salt',
};

type Db = ReturnType<typeof createServiceClient>;
interface Row {
  id: string; user_id: string; name: string; amount: string | null;
  calories: number | null; protein: number | null; carbs: number | null; fat: number | null;
  fiber: number | null; sugar: number | null; saturated_fat: number | null; salt: number | null;
  parse_meta: Record<string, unknown> | null;
}

const asNumber = (value: number | string | null): number | undefined => (value == null ? undefined : Number(value));

function groupKey(row: Row): string {
  return `${row.name.trim().toLowerCase()}|${(row.amount ?? '').trim().toLowerCase()}`;
}

async function pendingRows(db: Db, userId: string): Promise<Row[]> {
  const { data, error } = await db.from('daily_food_entries')
    .select('id,user_id,name,amount,calories,protein,carbs,fat,fiber,sugar,saturated_fat,salt,parse_meta')
    .eq('user_id', userId)
    .or('fiber.is.null,sugar.is.null,saturated_fat.is.null,salt.is.null')
    .filter(`parse_meta->>${MARKER}`, 'is', 'null')
    .order('date', { ascending: false })
    .limit(1000);
  if (error) throw new Error(`food-micronutrient-backfill select: ${error.message}`);
  return (data ?? []) as Row[];
}

async function stampOnly(db: Db, row: Row, extra: Record<string, unknown>) {
  const { error } = await db.from('daily_food_entries')
    .update({ parse_meta: { ...(row.parse_meta ?? {}), [MARKER]: new Date().toISOString(), ...extra } }).eq('id', row.id);
  if (error) throw new Error(`food-micronutrient-backfill stamp: ${error.message}`);
}

/** Wpis dostaje tylko wartości do pustych kolumn; kalorie i makro nigdy nie są ruszane. */
async function applyToRow(db: Db, row: Row, estimate: Record<string, unknown>): Promise<boolean> {
  const grams = parseAmountGrams(row.amount) ?? 100;
  const item: EstimableItem = {
    grams, fat: asNumber(row.fat) ?? 0,
    fiber: asNumber(row.fiber), sugar: asNumber(row.sugar),
    saturatedFat: asNumber(row.saturated_fat), salt: asNumber(row.salt),
    parseMeta: (row.parse_meta ?? undefined) as EstimableItem['parseMeta'],
  };
  const [merged] = applyMicronutrientEstimates([item], { items: [{ ...estimate, index: 0 }] });
  const patch: Record<string, number> = {};
  for (const column of COLUMNS) {
    const value = merged[FIELD_OF[column]];
    if (row[column] == null && value != null) patch[column] = value;
  }
  const parseMeta = {
    ...(row.parse_meta ?? {}),
    micronutrientSources: merged.parseMeta?.micronutrientSources ?? {},
    [MARKER]: new Date().toISOString(),
  };
  const { error } = await db.from('daily_food_entries').update({ ...patch, parse_meta: parseMeta }).eq('id', row.id);
  if (error) throw new Error(`food-micronutrient-backfill update: ${error.message}`);
  return Object.keys(patch).length > 0;
}

async function backfillUser(db: Db, userId: string, groupLimit: number, apiKey: string) {
  const rows = await pendingRows(db, userId);
  const withGrams = rows.filter((row) => parseAmountGrams(row.amount) != null);
  for (const row of rows) {
    if (parseAmountGrams(row.amount) == null) await stampOnly(db, row, { micronutrientBackfillSkipped: 'no_grams' });
  }

  const groups = new Map<string, Row[]>();
  for (const row of withGrams) groups.set(groupKey(row), [...(groups.get(groupKey(row)) ?? []), row]);
  const chosen = [...groups.values()].slice(0, groupLimit);
  if (!chosen.length) return { groups: 0, entriesUpdated: 0, remainingGroups: 0 };

  const payload: MicronutrientEstimateRequestItem[] = chosen.map((group, index) => {
    const row = group[0];
    return {
      index, name: row.name, grams: parseAmountGrams(row.amount) ?? 100,
      calories: row.calories ?? 0, protein: asNumber(row.protein) ?? 0, carbs: asNumber(row.carbs) ?? 0, fat: asNumber(row.fat) ?? 0,
    };
  });
  const raw = await requestMicronutrientEstimates(payload, apiKey);
  const byIndex = new Map<number, Record<string, unknown>>();
  const listed = raw && typeof raw === 'object' ? (raw as { items?: unknown }).items : null;
  for (const entry of Array.isArray(listed) ? listed : []) {
    if (entry && typeof entry === 'object' && typeof (entry as { index?: unknown }).index === 'number') {
      byIndex.set((entry as { index: number }).index, entry as Record<string, unknown>);
    }
  }
  let entriesUpdated = 0;
  for (const [index, group] of chosen.entries()) {
    const estimate = byIndex.get(index) ?? {};
    for (const row of group) if (await applyToRow(db, row, estimate)) entriesUpdated += 1;
  }
  return { groups: chosen.length, entriesUpdated, remainingGroups: Math.max(0, groups.size - chosen.length) };
}

Deno.serve(serveJson(async (req, ctx) => {
  const apiKey = Deno.env.get('DEEPSEEK_API_KEY');
  if (!apiKey) throw new Error('DEEPSEEK_API_KEY is not configured');
  const body = await req.json().catch(() => ({})) as { limit?: unknown };
  const requested = typeof body.limit === 'number' ? Math.floor(body.limit) : DEFAULT_GROUP_LIMIT;
  const groupLimit = Math.min(MAX_GROUP_LIMIT, Math.max(1, requested));
  const db = ctx.supabase;
  let users: string[];
  if (ctx.isServiceRole) {
    const { data, error } = await db.from('daily_food_entries').select('user_id').limit(5000);
    if (error) throw new Error(`food-micronutrient-backfill users: ${error.message}`);
    users = [...new Set((data ?? []).map((row: { user_id: string }) => row.user_id))];
  } else {
    users = ctx.userId ? [ctx.userId] : [];
  }
  const results = [];
  for (const userId of users) results.push(await backfillUser(db, userId, groupLimit, apiKey));
  return { users: users.length, results };
}));
