import { callVisionLlm } from './mealVision.ts';
import { parseJsonFromContent } from '../_shared/deepseek.ts';
import type { UserParseContext } from '../_shared/foodParseCore.ts';

interface RestaurantDishRecommendation {
  id: string;
  name: string;
  estimatedKcal: number;
  estimatedProtein: number;
  estimatedCarbs: number;
  estimatedFat: number;
  whyRecommended: string;
  waiterTip?: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface RestaurantMenuAnalysis {
  summary: string;
  dishes: RestaurantDishRecommendation[];
  userNotice: string;
}

interface FridgeMealSuggestion {
  id: string;
  name: string;
  prepMinutes: number;
  ingredientsUsed: string[];
  missingIngredients: string[];
  estimatedKcal: number;
  protein: number;
  carbs: number;
  fat: number;
  instructions: string;
}

export interface FridgeIngredientsAnalysis {
  detectedIngredients: Array<{ name: string; estimatedGrams?: number | null; confidence: 'high' | 'medium' | 'low' }>;
  suggestions: FridgeMealSuggestion[];
  uncertaintyNotice: string;
}

function parseJsonSafe<T>(content: string, fallback: T): T {
  const parsed = parseJsonFromContent(content);
  if (parsed && typeof parsed === 'object') return parsed as T;
  try {
    return JSON.parse(content || '{}');
  } catch {
    return fallback;
  }
}

export async function parseRestaurantMenu(params: {
  imageBase64?: string;
  mimeType?: string;
  text?: string;
  ctx: UserParseContext;
  userId?: string;
}): Promise<RestaurantMenuAnalysis> {
  const { imageBase64, mimeType, text, ctx, userId } = params;

  const prompt = `Jesteś doradcą żywieniowym Sparky. Przeanalizuj menu restauracji (ze zdjęcia lub tekstu) i zaproponuj 3 do 5 najlepszych dań dopasowanych do celów użytkownika.
Kontekst użytkownika: ${ctx.profileLine}. Cel energii: ${ctx.targetKcal ?? 'nieustalony'} kcal, cel białka: ${ctx.targetProtein ?? 'nieustalony'} g.
ZASADY:
1. Rekomenduj pozycje z wysoką gęstością białka, pełnowartościowymi źródłami i minimalną ilością ukrytych tłuszczów trans/cukru.
2. Podaj konkretne wskazówki do kelnera (np. "sos w osobnym sosjerku", "podwójna porcja surówki zamiast frytek").
3. Szacowane makra dotyczą całej typowej porcji restauracyjnej.
4. Zwróć wyłącznie JSON w formacie:
{
  "summary": "krótkie podsumowanie oferty menu pod Twoje cele",
  "dishes": [
    {
      "id": "dish_1",
      "name": "Dokładna nazwa dania z menu",
      "estimatedKcal": 650,
      "estimatedProtein": 45,
      "estimatedCarbs": 40,
      "estimatedFat": 22,
      "whyRecommended": "dlaczego to danie najlepiej wpisuje się w cele",
      "waiterTip": "jak poprosić kelnera o modyfikację",
      "confidence": "high"
    }
  ]
}
${text ? `TREŚĆ MENU:\n${text}` : ''}`;

  let content = '';
  if (imageBase64 && mimeType) {
    content = await callVisionLlm({
      prompt,
      imageBase64,
      mimeType,
      userId,
      feature: 'nutrition-menu-analysis',
      maxTokens: 1800,
    });
  } else {
    // If text only, call Gemini vision text mode or throw if neither
    content = await callVisionLlm({
      prompt,
      imageBase64: '',
      mimeType: '',
      userId,
      feature: 'nutrition-menu-text',
      maxTokens: 1800,
    });
  }

  const raw = parseJsonSafe<any>(content, { summary: 'Menu przeanalizowane.', dishes: [] });
  const dishes: RestaurantDishRecommendation[] = Array.isArray(raw.dishes)
    ? raw.dishes.map((d: any, idx: number) => ({
        id: String(d.id || `dish_${idx}`),
        name: String(d.name || 'Danie z menu'),
        estimatedKcal: Number(d.estimatedKcal) || 0,
        estimatedProtein: Number(d.estimatedProtein) || 0,
        estimatedCarbs: Number(d.estimatedCarbs) || 0,
        estimatedFat: Number(d.estimatedFat) || 0,
        whyRecommended: String(d.whyRecommended || ''),
        waiterTip: d.waiterTip ? String(d.waiterTip) : undefined,
        confidence: (['high', 'medium', 'low'].includes(d.confidence) ? d.confidence : 'medium') as any,
      }))
    : [];

  return {
    summary: String(raw.summary || 'Propozycje dań z karty restauracji.'),
    dishes,
    userNotice: 'Wybór pozycji z menu jest rekomendacją doradczą — nie zapisuje automatycznie posiłku w Twoim dzienniku spożycia.',
  };
}

export async function parseFridgeIngredients(params: {
  imageBase64?: string;
  mimeType?: string;
  text?: string;
  ctx: UserParseContext;
  userId?: string;
}): Promise<FridgeIngredientsAnalysis> {
  const { imageBase64, mimeType, text, ctx, userId } = params;

  const prompt = `Jesteś doradcą żywieniowym Sparky. Przeanalizuj składniki w lodówce / spiżarni (ze zdjęcia lub opisu tekstowego).
Zidentyfikuj dostępne produkty i zaproponuj 2-4 wykonalne, proste posiłki, które można z nich ugotować w domowych warunkach.
Kontekst użytkownika: ${ctx.profileLine}. Cel energii: ${ctx.targetKcal ?? 'nieustalony'} kcal, cel białka: ${ctx.targetProtein ?? 'nieustalony'} g.
ZASADY:
1. Wskaż użyte składniki z lodówki oraz ewentualne brakujące drobiazgi (np. przyprawy, oliwa, ząbek czosnku).
2. Szacuj makra z wyraźną rezerwą na niepewność ilości w lodówce.
3. Zwróć wyłącznie JSON w formacie:
{
  "detectedIngredients": [
    { "name": "Nazwa składnika", "estimatedGrams": 200, "confidence": "high" }
  ],
  "suggestions": [
    {
      "id": "sug_1",
      "name": "Nazwa proponowanego dania",
      "prepMinutes": 20,
      "ingredientsUsed": ["jajka", "szpinak", "pomidory"],
      "missingIngredients": ["oliwa z oliwek", "sól"],
      "estimatedKcal": 420,
      "protein": 28,
      "carbs": 12,
      "fat": 24,
      "instructions": "Krótki opis przygotowania krok po kroku."
    }
  ]
}
${text ? `OPIS SKŁADNIKÓW:\n${text}` : ''}`;

  let content = '';
  if (imageBase64 && mimeType) {
    content = await callVisionLlm({
      prompt,
      imageBase64,
      mimeType,
      userId,
      feature: 'nutrition-fridge-analysis',
      maxTokens: 1800,
    });
  } else {
    content = await callVisionLlm({
      prompt,
      imageBase64: '',
      mimeType: '',
      userId,
      feature: 'nutrition-fridge-text',
      maxTokens: 1800,
    });
  }

  const raw = parseJsonSafe<any>(content, { detectedIngredients: [], suggestions: [] });
  const detected = Array.isArray(raw.detectedIngredients)
    ? raw.detectedIngredients.map((ing: any) => ({
        name: String(ing.name || 'Składnik'),
        estimatedGrams: Number(ing.estimatedGrams) || null,
        confidence: (['high', 'medium', 'low'].includes(ing.confidence) ? ing.confidence : 'medium') as any,
      }))
    : [];

  const suggestions: FridgeMealSuggestion[] = Array.isArray(raw.suggestions)
    ? raw.suggestions.map((s: any, idx: number) => ({
        id: String(s.id || `sug_${idx}`),
        name: String(s.name || 'Posiłek z lodówki'),
        prepMinutes: Number(s.prepMinutes) || 15,
        ingredientsUsed: Array.isArray(s.ingredientsUsed) ? s.ingredientsUsed.map(String) : [],
        missingIngredients: Array.isArray(s.missingIngredients) ? s.missingIngredients.map(String) : [],
        estimatedKcal: Number(s.estimatedKcal) || 0,
        protein: Number(s.protein) || 0,
        carbs: Number(s.carbs) || 0,
        fat: Number(s.fat) || 0,
        instructions: String(s.instructions || ''),
      }))
    : [];

  return {
    detectedIngredients: detected,
    suggestions,
    uncertaintyNotice: 'Gramatura składników w lodówce jest szacunkowa. Przed przygotowaniem zważ kluczowe produkty białkowe i źródła tłuszczu.',
  };
}
