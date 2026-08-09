import {
  applyDeclaredPieceCount,
  applyHomemadeAdjustment,
  isComplexMeal,
  normalizePl,
  parseDeclaredPieceCount,
  pieceGramsForName,
  recoverUnitCountFromText,
} from "./foodParse/matching.ts";
import {
  applyPhysiologicalGuardrails,
  enforceMacroMath,
  normalizeGramOnlyItems,
  PARSER_VERSION,
} from "./foodParse/normalize.ts";
import {
  applyUserCorrections,
  callParseLLM,
  fillMacrosLlmFallback,
  reconcileItems,
  tryExpandCompoundItems,
} from "./foodParse/reconcile.ts";
import { buildSystemPrompt } from "./foodParse/prompts.ts";
import { validateParsedItems } from "./foodParse/semanticValidation.ts";
import { lookupGenericFood, scoreFoodNameMatch } from "./foodGeneric.ts";

export {
  applyDeclaredPieceCount,
  applyHomemadeAdjustment,
  parseDeclaredPieceCount,
  pieceGramsForName,
} from "./foodParse/matching.ts";
export {
  needsFoodReview,
  caloriesFromMacros,
  enforceMacroMath,
} from "./foodParse/normalize.ts";
export { applyUserCorrections } from "./foodParse/reconcile.ts";

export interface FoodParseMeta {
  macroSource: 'library' | 'generic' | 'reference_pl' | 'off' | 'llm_estimate' | 'user_correction'
  matchScore?: number
  matchedName?: string
  dataSource?: string
  parserVersion: string
  quantity?: number
  unit?: string
  explicitGrams?: boolean
  warnings?: string[]
  validationStatus?: 'accepted' | 'review'
}

export interface ParsedFoodItem {
  name: string
  grams: number
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber?: number
  sugar?: number
  confidence: 'high' | 'medium' | 'low'
  source: 'llm' | 'database' | 'library'
  assumptions?: string[]
  parseMeta?: FoodParseMeta
}

export interface UserParseContext {
  profileLine: string
  targetKcal: number | null
  targetProtein: number | null
  favoritesBlock: string
  correctionsBlock: string
  historyBlock: string
  portionsBlock: string
}

export interface FoodCorrection {
  query_name: string
  corrected_name: string | null
  corrected_grams: number
}

export interface FinalizeFoodParseOpts {
  originalText: string
  corrections?: FoodCorrection[]
  supabaseUrl: string
  serviceKey: string
  userId?: string
  db?: unknown
  apiKey?: string
  parseContext?: UserParseContext
}

const SIMPLE_PORTION_GRAMS: Record<string, number> = {
  banan: 120,
  jablko: 180,
  awokado: 150,
};

/** Fast, deterministic path for one unambiguous staple; complex descriptions still go to the model. */
export function tryParseSimpleStaple(text: string): ParsedFoodItem[] | null {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length > 100 || /[,;+]|\s+(?:z|ze)\s+/i.test(trimmed)) return null;

  const gramsMatch = trimmed.match(/\b(\d+(?:[.,]\d+)?)\s*(kg|g|ml)\b/i);
  const explicitGrams = gramsMatch
    ? Math.max(1, Math.round(Number(gramsMatch[1].replace(',', '.')) * (gramsMatch[2].toLowerCase() === 'kg' ? 1000 : 1)))
    : null;
  const count = parseDeclaredPieceCount(trimmed);
  let query = trimmed
    .replace(/\b\d+(?:[.,]\d+)?\s*(?:kg|g|ml|szt\.?|x)?\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const normalizedQuery = normalizePl(query);
  if (/^jaj\w*$/.test(normalizedQuery)) query = 'jajko';

  const match = lookupGenericFood(query);
  if (!match || scoreFoodNameMatch(query, match.name) < 0.78) return null;
  const perPiece = count ? pieceGramsForName(match.name) : null;
  const defaultGrams = SIMPLE_PORTION_GRAMS[normalizePl(match.name)];
  const grams = explicitGrams ?? (count && perPiece ? count * perPiece : defaultGrams);
  if (!grams) return null;

  return normalizeGramOnlyItems({ items: [{
    name: match.name,
    grams,
    confidence: explicitGrams || count ? 'high' : 'medium',
    explicitGrams: explicitGrams != null,
    assumptions: explicitGrams || count ? [] : [`standardowa porcja ~${grams}g`],
  }] });
}

export async function parseMealText(
  apiKey: string,
  text: string,
  ctx: UserParseContext,
): Promise<ParsedFoodItem[]> {
  const trimmed = text.trim()
  if (!trimmed) return []
  const simpleStaple = tryParseSimpleStaple(trimmed)
  if (simpleStaple) return simpleStaple

  // LLM: name + grams only. Makro liczy kod z bazy (RAG), nie model.
  const gramsRaw = await callParseLLM(
    apiKey,
    buildSystemPrompt(ctx, 'grams_only'),
    `Parsuj: "${trimmed}"`,
    isComplexMeal(trimmed) ? 1200 : 800,
  )
  let items = normalizeGramOnlyItems(gramsRaw)
  items = applyDeclaredPieceCount(trimmed, items)
  items = recoverUnitCountFromText(trimmed, items)
  return items
}

/**
 * Canonical post-LLM pipeline — single entry point for parse-food-nl.
 * Order: corrections → reconcile → compound split → homemade → macro math.
 */
export async function finalizeParsedItems(
  items: ParsedFoodItem[],
  opts: FinalizeFoodParseOpts,
): Promise<ParsedFoodItem[]> {
  const reconcileOpts = {
    supabaseUrl: opts.supabaseUrl,
    serviceKey: opts.serviceKey,
    userId: opts.userId,
    db: opts.db,
    apiKey: opts.apiKey,
    originalText: opts.originalText,
  }

  let out = applyUserCorrections(items, opts.corrections, opts.originalText)
  out = await reconcileItems(out, reconcileOpts)
  out = await tryExpandCompoundItems(out, reconcileOpts)

  if (opts.apiKey && opts.parseContext) {
    out = await fillMacrosLlmFallback(out, opts.apiKey, opts.parseContext, opts.originalText)
  }

  out = applyHomemadeAdjustment(opts.originalText, out)
  out = applyPhysiologicalGuardrails(out, opts.originalText)
  out = enforceMacroMath(out)
  out = validateParsedItems(out, opts.originalText)
  return out
}
