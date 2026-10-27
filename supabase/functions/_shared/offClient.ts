/**
 * @module offClient
 * @role Jeden klient Open Food Facts dla parsera posiłków i wyszukiwarki: identyfikujący User-Agent
 *       (wymóg dokumentacji OFF), nowy serwer wyszukiwania z awaryjnym CGI, ponowienie po 5xx i
 *       mapowanie wartości na 100 g bez zamieniania braków na zero.
 */

const OFF_USER_AGENT = 'VanguardOS/1.0 (jakub@vanguard.os - personal nutrition log)'

const SEARCH_FIELDS = 'code,product_name,product_name_pl,product_name_en,brands,nutriments,serving_size,quantity,product_quantity,serving_quantity'

export type OffProduct = Record<string, unknown> & { code?: string; nutriments?: Record<string, number> }

/** Wartości na 100 g; null = OFF nie podaje, a nie zero. */
export interface OffPer100 {
  calories: number | null
  protein: number | null
  carbs: number | null
  fat: number | null
  fiber: number | null
  sugar: number | null
  saturatedFat: number | null
  salt: number | null
}

const num = (value: unknown): number | null => (typeof value === 'number' && Number.isFinite(value) ? value : null)

export function offNutrimentsPer100(n: Record<string, number> | undefined): OffPer100 {
  const fat = num(n?.['fat_100g'])
  const saturated = num(n?.['saturated-fat_100g'])
  const salt = num(n?.['salt_100g'])
  const sodium = num(n?.['sodium_100g'])
  const kcal = num(n?.['energy-kcal_100g'])
  return {
    calories: kcal == null ? null : Math.round(kcal),
    protein: num(n?.['proteins_100g']),
    carbs: num(n?.['carbohydrates_100g']),
    fat,
    fiber: num(n?.['fiber_100g']),
    sugar: num(n?.['sugars_100g']),
    // Nasycone większe niż całkowity tłuszcz to błąd w bazie OFF → traktujemy jak brak danych.
    saturatedFat: saturated != null && fat != null && saturated <= fat + 0.05 ? saturated : null,
    salt: salt ?? (sodium != null ? Math.round(sodium * 2.5 * 100) / 100 : null),
  }
}

// OFF to usługa wolontariuszy i bywa, że chwilowo zwraca 5xx; jedno ponowienie po krótkiej przerwie
// wygładza to bez maskowania prawdziwych awarii.
export async function fetchOffWithRetry(url: string, timeoutMs = 22000): Promise<Response | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, 400))
    try {
      const res = await fetch(url, { headers: { 'User-Agent': OFF_USER_AGENT }, signal: AbortSignal.timeout(timeoutMs) })
      if (res.ok) return res
      console.warn(`[off] attempt ${attempt + 1} -> ${res.status}`)
    } catch (err: unknown) {
      console.warn(`[off] attempt ${attempt + 1} threw:`, err instanceof Error ? err.message : String(err))
    }
  }
  return null
}

export type OffSearchStatus = 'ok' | 'unavailable'

/**
 * Wyszukiwanie po nazwie: najpierw search.openfoodfacts.org (zalecany, osobny klaster), potem CGI z krajem Polska.
 * `unavailable` oznacza awarię usługi, a pusta lista przy `ok` brak trafień.
 */
export async function searchOffProducts(query: string, pageSize = 15): Promise<{ products: OffProduct[]; status: OffSearchStatus }> {
  const modernUrl = `https://search.openfoodfacts.org/search?q=${encodeURIComponent(query)}&page_size=${pageSize}&langs=pl,en&fields=${SEARCH_FIELDS}`
  try {
    const res = await fetch(modernUrl, { headers: { 'User-Agent': OFF_USER_AGENT }, signal: AbortSignal.timeout(7000) })
    if (res.ok) {
      const json = await res.json() as { hits?: OffProduct[] }
      if (json.hits?.length) return { products: json.hits, status: 'ok' }
    } else {
      console.warn(`[off] search.openfoodfacts.org returned ${res.status}`)
    }
  } catch (err: unknown) {
    console.warn('[off] search.openfoodfacts.org fallback:', err instanceof Error ? err.message : String(err))
  }

  // Awaryjnie CGI z krajem Polska (languages=polish jest przestarzałe i zwraca 503).
  const legacyUrl = `https://pl.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=${Math.min(pageSize, 10)}&tagtype_0=countries&tag_contains_0=contains&tag_0=poland`
  const res = await fetchOffWithRetry(legacyUrl)
  if (!res) return { products: [], status: 'unavailable' }
  try {
    const json = await res.json() as { products?: OffProduct[] }
    return { products: json.products ?? [], status: 'ok' }
  } catch {
    return { products: [], status: 'unavailable' }
  }
}
