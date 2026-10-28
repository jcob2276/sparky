import { NETWORK_TIMEOUT_MS } from '../constants';
import { invokeEdge } from '../supabase';
import type { FoodBase } from './foodTypes';
export { searchPrivateFoodLibrary } from './foodLibraryApi';

export interface ExternalFoodSearchResult {
  results: FoodBase[];
  status: 'ok' | 'unavailable' | 'rate_limited';
  incompleteCount: number;
}

const normalize = (value: string) => value
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ł/g, 'l').replace(/Ł/g, 'L').toLocaleLowerCase('pl');

export function rankFoodResult(food: Pick<FoodBase, 'name' | 'brand'> & { useCount?: number }, query: string) {
  const needle = normalize(query.trim());
  const name = normalize(food.name);
  const brand = normalize(food.brand ?? '');
  const match = name === needle ? 100 : name.startsWith(needle) ? 70 : name.includes(needle) ? 45 : brand.includes(needle) ? 25 : 0;
  return match + Math.min(20, food.useCount ?? 0);
}

export async function searchExternalFoods(query: string): Promise<ExternalFoodSearchResult> {
  return invokeEdge('lookup-food', {
    method: 'GET', query: { q: query.trim() }, signal: AbortSignal.timeout(NETWORK_TIMEOUT_MS),
  });
}

export async function lookupFoodBarcode(code: string): Promise<FoodBase | null> {
  const cleanCode = code.replace(/[\s-]+/g, '').trim();
  const response = await invokeEdge('lookup-food', {
    method: 'GET', query: { barcode: cleanCode }, signal: AbortSignal.timeout(NETWORK_TIMEOUT_MS),
  });
  return response.results[0] ?? null;
}
