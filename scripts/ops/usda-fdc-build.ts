#!/usr/bin/env -S deno run --allow-read --allow-write
/**
 * Buduje plik SQL z referencją USDA (Foundation Foods + SR Legacy) z rozpakowanych plików CSV FoodData Central.
 * Dane: domena publiczna (CC0), https://fdc.nal.usda.gov/download-datasets/.
 *
 * Użycie:
 *   deno run --allow-read --allow-write scripts/ops/usda-fdc-build.ts <katalog-foundation> <katalog-sr> <wyjście.sql>
 * Potem: npx supabase db query --linked -f <wyjście.sql>
 */
import { mapFdcFood, type FdcFoodInput, type FdcPortion, type UsdaReferenceRow } from '../../packages/domain/src/health/usdaFdc.ts';

type Row = Record<string, string>;

function parseCsv(text: string): Row[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; } else quoted = false;
      } else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (c !== '\r') cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const [header, ...body] = rows;
  return body.filter((r) => r.length === header.length).map((r) => Object.fromEntries(header.map((key, i) => [key, r[i]])));
}

const load = async (dir: string, file: string) => parseCsv(await Deno.readTextFile(`${dir}/${file}`));

async function readDataset(dir: string, dataType: FdcFoodInput['dataType']): Promise<UsdaReferenceRow[]> {
  const [foods, categories, units, foodNutrients, portionRows] = await Promise.all([
    load(dir, 'food.csv'), load(dir, 'food_category.csv'), load(dir, 'measure_unit.csv'),
    load(dir, 'food_nutrient.csv'), load(dir, 'food_portion.csv'),
  ]);
  const categoryById = new Map(categories.map((c) => [c.id, c.description]));
  const unitById = new Map(units.map((u) => [u.id, u.name]));
  const main = foods.filter((f) => f.data_type === dataType);
  const ids = new Set(main.map((f) => f.fdc_id));

  const nutrientsByFood = new Map<string, Map<number, number>>();
  for (const n of foodNutrients) {
    if (!ids.has(n.fdc_id)) continue;
    const amount = parseFloat(n.amount);
    if (!Number.isFinite(amount)) continue;
    let map = nutrientsByFood.get(n.fdc_id);
    if (!map) nutrientsByFood.set(n.fdc_id, map = new Map());
    map.set(Number(n.nutrient_id), amount);
  }

  const portionsByFood = new Map<string, FdcPortion[]>();
  for (const p of portionRows) {
    if (!ids.has(p.fdc_id)) continue;
    const grams = parseFloat(p.gram_weight);
    const amount = parseFloat(p.amount);
    if (!Number.isFinite(grams) || grams <= 0) continue;
    const unit = p.measure_unit_id === '9999' ? '' : unitById.get(p.measure_unit_id) ?? '';
    const label = [Number.isFinite(amount) ? String(amount) : '', unit, p.modifier, p.portion_description]
      .map((part) => part.trim()).filter(Boolean).join(' ');
    if (!label) continue;
    const list = portionsByFood.get(p.fdc_id) ?? [];
    list.push({ label, grams: Math.round(grams * 10) / 10 });
    portionsByFood.set(p.fdc_id, list);
  }

  const mapped: UsdaReferenceRow[] = [];
  for (const food of main) {
    const row = mapFdcFood({
      fdcId: Number(food.fdc_id),
      dataType,
      description: food.description,
      category: categoryById.get(food.food_category_id) ?? null,
      publicationDate: food.publication_date || null,
      nutrients: nutrientsByFood.get(food.fdc_id) ?? new Map(),
      portions: portionsByFood.get(food.fdc_id) ?? [],
    });
    if (row) mapped.push(row);
  }
  return mapped;
}

const sql = (value: string | null) => (value == null ? 'NULL' : `'${value.replaceAll("'", "''")}'`);
const num = (value: number | null) => (value == null ? 'NULL' : String(value));

function insertStatement(rows: UsdaReferenceRow[]): string {
  const values = rows.map((r) => `(${[
    r.fdcId, sql(r.dataType), sql(r.description), sql(r.category), r.publicationDate ? `'${r.publicationDate}'::date` : 'NULL',
    r.kcal, sql(r.energySource), r.protein, r.fat, r.carbs, num(r.carbsByDifference), num(r.fiber), num(r.sugar),
    num(r.saturatedFat), num(r.salt), `${sql(JSON.stringify(r.portions))}::jsonb`,
  ].join(', ')})`).join(',\n');
  return `INSERT INTO public.food_reference_usda (fdc_id, data_type, description, category, publication_date, kcal, energy_source, protein, fat, carbs, carbs_by_difference, fiber, sugar, saturated_fat, salt, portions) VALUES\n${values}\nON CONFLICT (fdc_id) DO UPDATE SET data_type = EXCLUDED.data_type, description = EXCLUDED.description, category = EXCLUDED.category, publication_date = EXCLUDED.publication_date, kcal = EXCLUDED.kcal, energy_source = EXCLUDED.energy_source, protein = EXCLUDED.protein, fat = EXCLUDED.fat, carbs = EXCLUDED.carbs, carbs_by_difference = EXCLUDED.carbs_by_difference, fiber = EXCLUDED.fiber, sugar = EXCLUDED.sugar, saturated_fat = EXCLUDED.saturated_fat, salt = EXCLUDED.salt, portions = EXCLUDED.portions;\n`;
}

const [foundationDir, srDir, outFile] = Deno.args;
if (!foundationDir || !srDir || !outFile) {
  console.error('Użycie: usda-fdc-build.ts <katalog-foundation> <katalog-sr> <wyjście.sql>');
  Deno.exit(1);
}

const foundation = await readDataset(foundationDir, 'foundation_food');
const sr = await readDataset(srDir, 'sr_legacy_food');
const all = [...foundation, ...sr];
const batches: string[] = [];
for (let i = 0; i < all.length; i += 250) batches.push(insertStatement(all.slice(i, i + 250)));
await Deno.writeTextFile(outFile, batches.join('\n'));
console.log(JSON.stringify({
  foundation: foundation.length,
  srLegacy: sr.length,
  energySources: all.reduce<Record<string, number>>((acc, r) => ({ ...acc, [r.energySource]: (acc[r.energySource] ?? 0) + 1 }), {}),
  withPortions: all.filter((r) => r.portions.length).length,
  out: outFile,
}, null, 2));
