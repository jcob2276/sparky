import { offNutrimentsPer100, searchOffProducts } from '../offClient.ts';
import { pickUsdaMatch } from "@vanguard/domain";
import { assessEnergyConsistency, mergeMicronutrients, type MicronutrientSources } from "@vanguard/domain";
import { deepseekChat, parseJsonFromContent } from "../deepseek.ts";
import { openaiChat } from "../openai.ts";
import { LLM_TASKS } from "../llm/tasks.ts";
import { lookupGenericFood, scoreFoodNameMatch } from "../foodGeneric.ts";
import { lookupReferencePl } from "../foodReferencePl.ts";
import type { ParsedFoodItem, UserParseContext, FoodCorrection } from "../foodParseCore.ts";
import { normalizePl, scaleParsedItem } from "./matching.ts";
import { isUnmatchedForMacros, normalizeRawItems, PARSER_VERSION } from "./normalize.ts";
import { buildSystemPrompt } from "./prompts.ts";

const MIN_RECONCILE_SCORE = 0.52;

interface Per100gFood { name: string; calories: number | null; protein: number | null; carbs: number | null; fat: number | null; fiber?: number | null; sugar?: number | null; saturatedFat?: number | null; salt?: number | null; source?: string; nutrient_sources?: MicronutrientSources; }
export type ReconcileOpts = { supabaseUrl: string; serviceKey: string; userId?: string; db?: unknown; apiKey?: string; originalText?: string };

export function isPlausibleFoodCandidate(query: string, candidate: Per100gFood): boolean {
  const calories = Number(candidate.calories ?? 0);
  if (!Number.isFinite(calories) || calories <= 0 || calories > 1000) return false;
  const normalized = normalizePl(`${query} ${candidate.name}`);
  if (/\b(bulka|chleb|bagietka|kajzerka)\b/.test(normalized) && calories < 180) {
    return false;
  }
  if (/\b(kebab|burger|pizza|zapiekanka|hot dog)\b/.test(normalized) && calories < 120) {
    return false;
  }
  // Rekord, którego kcal przeczą własnym makro (np. 100 kcal/100 g w ulubionych), nie może wejść jako „high”.
  return assessEnergyConsistency({ ...candidate, name: candidate.name }).status !== 'mismatch';
}

function pickBestMatchScored(query: string, results: Per100gFood[]): { match: Per100gFood; score: number } | null {
  if (!results.length) return null;
  let best: Per100gFood | null = null, bestScore = MIN_RECONCILE_SCORE;
  for (const r of results) { if (r.calories == null || !r.name || !isPlausibleFoodCandidate(query, r)) continue; const score = scoreFoodNameMatch(query, r.name); if (score > bestScore) { bestScore = score; best = r; } }
  return best ? { match: best, score: bestScore } : null;
}

function findCorrectionForItem(item: ParsedFoodItem, corrections: FoodCorrection[], originalText: string, itemCount: number): FoodCorrection | null {
  const itemNorm = normalizePl(item.name);
  for (const c of corrections) { const q = normalizePl(c.query_name); if (!q) continue; if (itemNorm.includes(q) || q.includes(itemNorm)) return c; }
  if (itemCount === 1) { const textNorm = normalizePl(originalText); for (const c of corrections) { const q = normalizePl(c.query_name); if (q && textNorm.includes(q)) return c; } }
  return null;
}

export function applyUserCorrections(items: ParsedFoodItem[], corrections: FoodCorrection[] | undefined, originalText: string): ParsedFoodItem[] {
  if (!corrections?.length) return items;
  return items.map((item) => {
    const c = findCorrectionForItem(item, corrections, originalText, items.length);
    if (!c) return item;
    const newGrams = Math.max(1, c.corrected_grams);
    const scaled = newGrams !== item.grams ? scaleParsedItem(item, newGrams / item.grams) : item;
    return { ...scaled, name: c.corrected_name?.trim() || item.name, grams: newGrams, confidence: 'high', source: 'library', parseMeta: { ...item.parseMeta, macroSource: 'user_correction', matchedName: c.corrected_name?.trim() || item.name, dataSource: 'user_correction', parserVersion: PARSER_VERSION }, assumptions: [...(item.assumptions ?? []), `poprawka użytkownika: ${newGrams}g`] };
  });
}

function splitCompoundName(name: string): [string, string] | null {
  const parts = normalizePl(name).split(/\s+(?:z|ze)\s+/);
  if (parts.length !== 2) return null;
  const [a, b] = parts.map((p) => p.trim());
  if (a.length < 3 || b.length < 3) return null;
  return [a, b];
}

function titleCasePl(fragment: string): string { const t = fragment.trim(); return t ? t.charAt(0).toUpperCase() + t.slice(1) : fragment; }

export function shouldExpandCompoundDish(originalText: string): boolean {
  return /[,;+]/.test(originalText);
}

export async function tryExpandCompoundItems(items: ParsedFoodItem[], opts: ReconcileOpts): Promise<ParsedFoodItem[]> {
  if (items.length !== 1 || !isUnmatchedForMacros(items[0])) return items;
  if (!shouldExpandCompoundDish(opts.originalText ?? '')) return items;
  const split = splitCompoundName(items[0].name);
  if (!split) return items;
  const [mainRaw, secRaw] = split;
  const totalGrams = items[0].grams;
  const mainGrams = Math.max(1, Math.round(totalGrams * 0.82));
  const secGrams = Math.max(1, totalGrams - mainGrams);
  const base = items[0];
  const [rMain, rSec] = await Promise.all([reconcileOne({ ...base, name: titleCasePl(mainRaw), grams: mainGrams }, opts), reconcileOne({ ...base, name: titleCasePl(secRaw), grams: secGrams }, opts)]);
  if (rMain.source === 'llm' && isUnmatchedForMacros(rMain) && rSec.source === 'llm' && isUnmatchedForMacros(rSec)) return items;
  const assumption = `rozbite na składniki (${mainGrams}g + ${secGrams}g)`;
  return [{ ...rMain, assumptions: [...(rMain.assumptions ?? []), assumption] }, { ...rSec, assumptions: [...(rSec.assumptions ?? []), assumption] }];
}

function recalcFromPer100g(grams: number, per100: Per100gFood) {
  if (grams <= 0) {
    // Defensywny guard — grams=0 byłby dzieleniem przez 0 i zerował wszystkie makra w ciszy.
    return { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: undefined, sugar: undefined, saturatedFat: undefined, salt: undefined };
  }
  const f = grams / 100, r = (n: number) => Math.round(n * 10) / 10;
  return { calories: Math.round(Number(per100.calories) * f), protein: r(Number(per100.protein ?? 0) * f), carbs: r(Number(per100.carbs ?? 0) * f), fat: r(Number(per100.fat ?? 0) * f), fiber: per100.fiber != null ? r(Number(per100.fiber) * f) : undefined, sugar: per100.sugar != null ? r(Number(per100.sugar) * f) : undefined, saturatedFat: per100.saturatedFat != null ? r(Number(per100.saturatedFat) * f) : undefined, salt: per100.salt != null ? Math.round(Number(per100.salt) * f * 100) / 100 : undefined };
}

async function lookupOffFast(name: string): Promise<{ match: Per100gFood; score: number; macroSource: 'off' } | null> {
  const { products } = await searchOffProducts(name, 5);
  // Bez kcal nie ma co mapować; pozostałe braki zostają null (nieznane to nie zero).
  const results: Per100gFood[] = products.flatMap((product): Per100gFood[] => {
    const productName = [product.product_name, product.product_name_pl].find((value): value is string => typeof value === 'string' && value.trim() !== '');
    const per100 = offNutrimentsPer100(product.nutriments);
    return productName && per100.calories != null ? [{ name: productName, ...per100, source: 'off' as const }] : [];
  });
  const picked = pickBestMatchScored(name, results);
  return picked ? { match: picked.match, score: picked.score, macroSource: 'off' } : null;
}

type UsdaRow = { fdc_id: number; data_type: 'foundation_food' | 'sr_legacy_food'; description: string; kcal: number; protein: number; fat: number; carbs: number; fiber: number | null; sugar: number | null; saturated_fat: number | null; salt: number | null };

/** Referencja USDA po angielskiej nazwie z parsera; zwraca null, gdy rodzaj lub stan produktu nie zgadzają się pewnie. */
async function lookupUsda(nameEn: string, db: unknown): Promise<{ match: Per100gFood; score: number } | null> {
  try {
    const { data, error } = await (db as { rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: UsdaRow[] | null; error: unknown }> })
      .rpc('search_food_reference_usda', { query_text: nameEn, match_count: 30 });
    if (error) { console.warn('[usda] rpc failed', error); return null; }
    if (!data?.length) return null;
    const picked = pickUsdaMatch(nameEn, data.map((row) => ({ ...row, fdcId: row.fdc_id, dataType: row.data_type })));
    if (!picked) { console.info('[usda] no confident match', nameEn, data.length); return null; }
    const row = picked.candidate;
    return {
      score: picked.score,
      match: { name: row.description, calories: row.kcal, protein: row.protein, carbs: row.carbs, fat: row.fat, fiber: row.fiber, sugar: row.sugar, saturatedFat: row.saturated_fat, salt: row.salt, source: `usda_fdc:${row.fdc_id}` },
    };
  } catch (err) { console.warn('[usda] lookup threw', err instanceof Error ? err.message : err); return null; }
}

async function verifyMatchWithLLM(query: string, candidate: string, apiKey: string): Promise<boolean> {
  try {
    const res = await deepseekChat({
      apiKey,
      ...LLM_TASKS.structured,
      responseFormat: undefined,
      temperature: 0,
      maxTokens: 5,
      timeoutMs: 5000,
      messages: [{ role: 'user', content: `Czy "${query}" odpowiada "${candidate}"? TAK lub NIE.` }]
    });
    return res.content.trim().toUpperCase().includes('TAK');
  } catch { return true; }
}

export function mergeUserFoodCandidates(
  favorites: Per100gFood[],
  library: Per100gFood[],
): Per100gFood[] {
  return [
    ...favorites.map((item) => ({ ...item, source: 'favorite' })),
    ...library,
  ];
}

async function lookupViaLibraryRaw(name: string, userId: string, db: any): Promise<Per100gFood[] | null> {
  const [favoritesResult, libraryResult] = await Promise.all([
    db.from('food_favorites')
      .select('name, calories, protein, carbs, fat, fiber, sugar, saturated_fat, salt, nutrient_sources')
      .eq('user_id', userId)
      .neq('validation_status', 'quarantined')
      .ilike('name', `%${name}%`)
      .order('use_count', { ascending: false })
      .limit(5),
    db.from('food_library')
      .select('name, calories, protein, carbs, fat, fiber, sugar, saturated_fat, salt, nutrient_sources, source, validation_status')
      .eq('user_id', userId)
      .neq('validation_status', 'quarantined')
      .ilike('name', `%${name}%`)
      .limit(10),
  ]);

  const favorites = favoritesResult.error
    ? []
    : (favoritesResult.data ?? []) as Per100gFood[];
  const library = libraryResult.error
    ? []
    : (libraryResult.data ?? []) as Per100gFood[];
  const adapt = (row: Per100gFood) => ({ ...row, saturatedFat: (row as Per100gFood & { saturated_fat?: number }).saturated_fat, nutrient_sources: row.nutrient_sources ?? {} });
  const merged = mergeUserFoodCandidates(favorites.map(adapt), library.map(adapt));
  return merged.length ? merged : null;
}

/**
 * Potrawy złożone — ich makra już zawierają tłuszcz ze smażenia.
 * Nie mapujemy ich na surowe składniki z generic/reference (np. jajecznica → jajko ugotowane).
 */
const COMPOSED_DISHES_RE = /\b(jajecznica|omlet|nalesnik|racuch|placek ziemniaczan|kotlet|schabowy|gulasz|bigos|gołąbk|pierogi|lazani|spaghetti (bolognese|carbonara|z )|pizza|kebab|tortilla wrap|burrito|taco)\b/i;

type Resolved = { match: Per100gFood; source: ParsedFoodItem['source']; macroSource: NonNullable<ParsedFoodItem['parseMeta']>['macroSource']; score?: number };

/** Dopasowanie w uchwytnej kolejności zaufania; odrzucone przez weryfikację (niska zgodność nazwy) przechodzi do kolejnego źródła, a nie od razu do szacunku LLM. */
async function resolveFromSources(item: ParsedFoodItem, opts: ReconcileOpts): Promise<Resolved | null> {
  // Potrawy złożone: nie dopasowujemy do surowych składników — zostaje LLM-estimate lub reference_pl.
  const isComposedDish = COMPOSED_DISHES_RE.test(normalizePl(item.name));
  const nameEn = item.parseMeta?.nameEn;
  const resolvers: Array<() => Promise<Resolved | null>> = [
    // 1. Osobista biblioteka/ulubione — własne wpisy mają priorytet.
    async () => {
      if (!opts.userId || !opts.db) return null;
      const lib = pickBestMatchScored(item.name, (await lookupViaLibraryRaw(item.name, opts.userId, opts.db)) ?? []);
      return lib ? { match: lib.match, source: 'library', macroSource: 'library', score: lib.score } : null;
    },
    // 2. Polska baza referencyjna (złożone potrawy).
    async () => {
      const ref = lookupReferencePl(item.name);
      return ref ? { match: ref, source: 'database', macroSource: 'reference_pl', score: scoreFoodNameMatch(item.name, ref.name) } : null;
    },
    // 3. Generic staples — tylko proste produkty.
    async () => {
      const local = isComposedDish ? null : lookupGenericFood(item.name);
      return local ? { match: local, source: 'database', macroSource: 'generic', score: scoreFoodNameMatch(item.name, local.name) } : null;
    },
    // 4. USDA po angielskiej nazwie z parsera — proste produkty, nie potrawy złożone.
    async () => {
      if (isComposedDish || !nameEn || !opts.db) return null;
      const usda = await lookupUsda(nameEn, opts.db);
      return usda ? { match: usda.match, source: 'database', macroSource: 'usda', score: usda.score } : null;
    },
    // 5. Open Food Facts — proste produkty.
    async () => {
      if (isComposedDish) return null;
      const remote = await lookupOffFast(item.name);
      return remote?.match.calories != null ? { match: remote.match, source: 'database', macroSource: remote.macroSource, score: remote.score } : null;
    },
  ];
  for (const resolve of resolvers) {
    const found = await resolve();
    if (!found?.match.calories) continue;
    const uncertain = found.score != null && found.score >= 0.50 && found.score <= 0.72;
    if (uncertain && opts.apiKey && !(await verifyMatchWithLLM(item.name, found.match.name, opts.apiKey))) continue;
    return found;
  }
  return null;
}

async function reconcileOne(item: ParsedFoodItem, opts: ReconcileOpts): Promise<ParsedFoodItem> {
  const found = await resolveFromSources(item, opts);
  if (!found) return item;
  const { match, source, macroSource, score: matchScore } = found;
  const recalculated = recalcFromPer100g(item.grams, match);
  const micro = mergeMicronutrients(recalculated, item, { fatG: recalculated.fat, grams: item.grams }, match.nutrient_sources);
  return {
    ...item, ...recalculated, ...micro.values,
    name: macroSource === 'usda' ? item.name : (match.name || item.name),
    confidence: 'high', source, assumptions: item.assumptions,
    parseMeta: { ...item.parseMeta, macroSource, matchScore, matchedName: match.name, dataSource: match.source ?? macroSource, parserVersion: PARSER_VERSION, micronutrientSources: micro.sources },
  };
}

export async function reconcileItems(items: ParsedFoodItem[], opts: ReconcileOpts): Promise<ParsedFoodItem[]> { return Promise.all(items.map((item) => reconcileOne(item, opts))); }

export async function callParseLLM(apiKey: string, system: string, userText: string, maxTokens?: number): Promise<unknown> {
  try {
    const result = await deepseekChat({
      apiKey,
      ...LLM_TASKS.structured,
      maxTokens: maxTokens ?? 1200,
      timeoutMs: 32000,
      messages: [{ role: 'system', content: system }, { role: 'user', content: userText }]
    });
    return parseJsonFromContent(result.content);
  } catch (err) {
    console.warn('[callParseLLM] DeepSeek failed, trying Gemini fallback:', err);
    const openAiKey = Deno.env.get('GEMINI_API_KEY');
    if (openAiKey) {
      const { content } = await openaiChat({
        apiKey: openAiKey,
        temperature: 0.1,
        maxTokens: maxTokens ?? 1200,
        responseFormat: { type: 'json_object' },
        messages: [{ role: 'system', content: system }, { role: 'user', content: userText }]
      });
      return parseJsonFromContent(content);
    }
    throw err;
  }
}

export async function fillMacrosLlmFallback(items: ParsedFoodItem[], apiKey: string, ctx: UserParseContext, originalText: string): Promise<ParsedFoodItem[]> {
  const indices = items.map((item, i) => (isUnmatchedForMacros(item) ? i : -1)).filter((i) => i >= 0);
  if (!indices.length) return items;
  const payload = indices.map((i) => ({ name: items[i].name, grams: items[i].grams }));
  const macrosRaw = await callParseLLM(apiKey, buildSystemPrompt(ctx, 'macros_only'), `Oblicz makro dla produktów:\n${JSON.stringify(payload, null, 2)}\n\nOryginalny opis: "${originalText}"`, 1200);
  const macroItems = normalizeRawItems(macrosRaw);
  const out = [...items];
  for (let j = 0; j < indices.length; j++) {
    const idx = indices[j];
    const macro = macroItems[j] ?? macroItems.find((m) => normalizePl(m.name).includes(normalizePl(out[idx].name)));
    if (!macro) continue;
    out[idx] = { ...out[idx], calories: macro.calories, protein: macro.protein, carbs: macro.carbs, fat: macro.fat, fiber: macro.fiber, sugar: macro.sugar, saturatedFat: macro.saturatedFat, confidence: macro.confidence === 'high' ? 'medium' : macro.confidence, source: 'llm', assumptions: [...(out[idx].assumptions ?? []), ...(macro.assumptions ?? []), 'makro szacowane — brak w bazie'], parseMeta: { ...out[idx].parseMeta, macroSource: 'llm_estimate', dataSource: 'llm_estimate', parserVersion: PARSER_VERSION } };
  }
  return out;
}
