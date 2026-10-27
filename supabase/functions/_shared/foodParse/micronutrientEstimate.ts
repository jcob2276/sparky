import { applyMicronutrientEstimates, indexesMissingMicronutrients } from "@vanguard/domain";
import { deepseekChat, parseJsonFromContent } from "../deepseek.ts";
import { LLM_TASKS } from "../llm/tasks.ts";
import type { ParsedFoodItem } from "../foodParseCore.ts";

const SYSTEM_PROMPT = `Jesteś dietetykiem. Dla każdej pozycji oszacuj CAŁĄ porcję (nie 100 g):
- fiber: gramy błonnika,
- sugar: gramy cukrów,
- saturatedFat: gramy tłuszczów nasyconych (nigdy więcej niż fat),
- salt: gramy soli (sól = sód × 2,5; sód w mg / 1000 × 2,5).
Używaj typowych wartości dla tego produktu lub potrawy w Polsce (chleb ok. 1,2 g soli/100 g, wędliny i parówki 2-3 g/100 g, ser żółty ok. 1,5 g/100 g i ok. 17 g nasyconych/100 g, masło ok. 51 g nasyconych/100 g, dania gotowe 0,6-1 g soli/100 g, fast food 2-4 g soli na porcję, świeże owoce i warzywa ok. 0 g soli).
Nie zmieniaj gramatury ani kalorii. Zawsze podaj liczbę dla każdego z czterech pól: dla produktu bez danego składnika wpisz 0 (np. owoce: salt 0 i saturatedFat bliskie 0, woda: wszystko 0), dla czekolady, wędlin, serów, sosów i dań gotowych podaj typową wartość. null wolno wpisać tylko wtedy, gdy nazwy w ogóle nie da się zinterpretować jako jedzenia lub napoju.
Zwróć wyłącznie JSON: {"items":[{"index":0,"fiber":number|null,"sugar":number|null,"saturatedFat":number|null,"salt":number|null}]}`;

export interface MicronutrientEstimateRequestItem {
  index: number
  name: string
  grams: number
  calories: number
  protein: number
  carbs: number
  fat: number
}

/** Jedno wywołanie modelu dla listy pozycji; zwraca surowy JSON dla `applyMicronutrientEstimates`. Rzuca przy błędzie modelu. */
export async function requestMicronutrientEstimates(
  items: MicronutrientEstimateRequestItem[],
  apiKey: string,
): Promise<unknown> {
  const result = await deepseekChat({
    apiKey,
    ...LLM_TASKS.structured,
    maxTokens: Math.min(4000, 300 + items.length * 70),
    timeoutMs: 45000,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: JSON.stringify({ items }) },
    ],
  })
  return parseJsonFromContent(result.content)
}

/**
 * Pozycje dopasowane do biblioteki lub bazy zwykle nie mają nasyconych ani soli (źródło ich nie zna),
 * a główny parser każe modelowi podawać tylko nazwy i gramy. Ten krok dopisuje brakujące pola jako
 * oszacowanie oznaczone `estimate`, żeby suma nigdy nie była cichą dolną granicą. Błąd modelu nie psuje parsowania.
 */
export async function fillMissingMicronutrients(items: ParsedFoodItem[], apiKey: string): Promise<ParsedFoodItem[]> {
  const indexes = indexesMissingMicronutrients(items)
  if (!indexes.length) return items
  const payload = indexes.map((index) => {
    const { name, grams, calories, protein, carbs, fat } = items[index]
    return { index, name, grams, calories, protein, carbs, fat }
  })
  try {
    return applyMicronutrientEstimates(items, await requestMicronutrientEstimates(payload, apiKey))
  } catch (error) {
    console.warn('[fillMissingMicronutrients] estimate failed, keeping items without them:', error)
    return items
  }
}
