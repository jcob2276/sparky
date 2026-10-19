/**
 * @function widget-food
 * @trigger HTTP POST / Android home-screen widget (native) + app (register)
 * @role Backend widgetów jedzenia: rejestracja tokenu, stan dnia, parsowanie (tekst/zdjęcie/kod) i zapis posiłku bez otwierania aplikacji.
 * @reads daily_food_entries, nutrition_targets, widget_tokens
 * @writes widget_tokens, daily_food_entries (przez add_food_entry)
 * @calls parse-food-nl, lookup-food
 * @consumer Widgety Android (VanguardFoodWidgetProvider, QuickFoodActivity)
 * @status active
 */
import { createServiceClient, getServiceRoleKey, resolveUserScope } from '../_shared/supabase.ts'
import { serveJson } from '../_shared/http.ts'
import { getWarsawDateString } from '../_shared/time.ts'

class HttpError extends Error {
  constructor(readonly status: number, message: string) { super(message) }
}

interface PortionItem {
  name: string
  grams: number
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber?: number | null
  sugar?: number | null
  barcode?: string | null
  brand?: string | null
  parseMeta?: unknown
}

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack']

async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

function defaultMealType(): string {
  const hour = Number(new Date().toLocaleString('en-US', { timeZone: 'Europe/Warsaw', hour: '2-digit', hour12: false }))
  if (hour < 11) return 'breakfast'
  if (hour < 16) return 'lunch'
  if (hour < 21) return 'dinner'
  return 'snack'
}

const round1 = (n: number) => Math.round(n * 10) / 10

async function callFunction(path: string, init: RequestInit): Promise<Response> {
  const key = getServiceRoleKey()
  const base = Deno.env.get('SUPABASE_URL') || ''
  return await fetch(`${base}/functions/v1/${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${key}`, apikey: key, 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(45000),
  })
}

async function parseItems(userId: string, body: Record<string, unknown>): Promise<PortionItem[]> {
  if (typeof body.barcode === 'string' && body.barcode.trim()) {
    const res = await callFunction(`lookup-food?barcode=${encodeURIComponent(body.barcode.trim())}`, { method: 'GET' })
    const json = await res.json().catch(() => ({}))
    const hit = Array.isArray(json.results) ? json.results[0] : null
    if (!hit || hit.calories == null) throw new HttpError(404, 'Nie znaleziono produktu o tym kodzie. Spróbuj zdjęcia albo wpisz opis.')
    const grams = Math.round(Number(hit.defaultGrams) || 100)
    const f = grams / 100
    return [{
      name: String(hit.name), grams, brand: hit.brand ?? null, barcode: hit.barcode ?? body.barcode,
      calories: Math.round(Number(hit.calories) * f), protein: round1(Number(hit.protein ?? 0) * f),
      carbs: round1(Number(hit.carbs ?? 0) * f), fat: round1(Number(hit.fat ?? 0) * f),
      fiber: hit.fiber == null ? null : round1(Number(hit.fiber) * f), sugar: hit.sugar == null ? null : round1(Number(hit.sugar) * f),
      parseMeta: { source: 'widget_barcode', trust_level: 'confirmed', parserVersion: 'food-trust-v2' },
    }]
  }
  const payload: Record<string, unknown> = { userId, clientTime: new Date().toISOString() }
  if (typeof body.imageBase64 === 'string' && body.imageBase64) {
    payload.mode = 'meal_photo'
    payload.imageBase64 = body.imageBase64
    payload.mimeType = typeof body.mimeType === 'string' ? body.mimeType : 'image/jpeg'
  } else if (typeof body.text === 'string' && body.text.trim()) {
    payload.text = body.text.trim().slice(0, 600)
  } else {
    throw new HttpError(400, 'Dodaj zdjęcie, kod albo opis posiłku.')
  }
  const res = await callFunction('parse-food-nl', { method: 'POST', body: JSON.stringify(payload) })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new HttpError(502, String(json.error || 'Nie udało się rozpoznać posiłku.'))
  const raw = (Array.isArray(json.items) ? json.items : json.meal?.items) as PortionItem[] | undefined
  const items = (raw ?? []).filter((i) => i && i.name && Number(i.calories) >= 0)
  if (!items.length) throw new HttpError(422, 'Nie rozpoznano posiłku. Spróbuj opisać go inaczej.')
  return items
}

async function saveItems(db: ReturnType<typeof createServiceClient>, userId: string, mealType: string, items: PortionItem[]) {
  const date = getWarsawDateString()
  const groupId = items.length > 1 ? crypto.randomUUID() : null
  let saved = 0
  for (const item of items) {
    const grams = Math.max(1, Math.round(Number(item.grams) || 100))
    const per100 = 100 / grams
    const { error } = await db.rpc('add_food_entry', {
      p_user_id: userId,
      p_date: date,
      p_grams: grams,
      p_entry: {
        name: item.name, brand: item.brand ?? null, barcode: item.barcode ?? null,
        calories: Math.round(Number(item.calories) * per100),
        protein: round1(Number(item.protein) * per100),
        carbs: round1(Number(item.carbs ?? 0) * per100),
        fat: round1(Number(item.fat ?? 0) * per100),
        fiber: item.fiber == null ? null : round1(Number(item.fiber) * per100),
        sugar: item.sugar == null ? null : round1(Number(item.sugar) * per100),
        meal_type: mealType, meal_group_id: groupId, request_id: crypto.randomUUID(),
        parse_meta: item.parseMeta ?? { source: 'widget', trust_level: 'confirmed', parserVersion: 'food-trust-v2' },
      },
    })
    if (error) console.error('[widget-food] add_food_entry failed', item.name, error)
    else saved += 1
  }
  if (!saved) throw new HttpError(500, 'Nie udało się zapisać posiłku.')
  return saved
}

async function dayState(db: ReturnType<typeof createServiceClient>, userId: string) {
  const today = getWarsawDateString()
  const [entries, target] = await Promise.all([
    db.from('daily_food_entries').select('calories,protein,carbs,fat').eq('user_id', userId).eq('date', today),
    db.from('nutrition_targets').select('target_kcal,protein_floor_g').eq('user_id', userId).lte('date', today)
      .not('target_kcal', 'is', null).order('date', { ascending: false }).limit(1).maybeSingle(),
  ])
  const sum = (key: 'calories' | 'protein' | 'carbs' | 'fat') =>
    (entries.data ?? []).reduce((acc, row) => acc + Number(row[key] ?? 0), 0)
  return {
    kcal: Math.round(sum('calories')), protein: Math.round(sum('protein')), carbs: Math.round(sum('carbs')), fat: Math.round(sum('fat')),
    kcalTarget: target.data?.target_kcal ?? null, proteinTarget: target.data?.protein_floor_g ?? null,
    mealType: defaultMealType(),
  }
}

async function handle(req: Request, db: ReturnType<typeof createServiceClient>) {
  const body = await req.clone().json().catch(() => ({})) as Record<string, unknown>

  if (body.action === 'register') {
    const scope = await resolveUserScope(req, null)
    if (!scope.userId || scope.isServiceRole) throw new HttpError(401, 'Zaloguj się, aby włączyć widget.')
    const token = Array.from(crypto.getRandomValues(new Uint8Array(32))).map((b) => b.toString(16).padStart(2, '0')).join('')
    const { error } = await db.from('widget_tokens').upsert({ user_id: scope.userId, token_hash: await sha256(token), created_at: new Date().toISOString() })
    if (error) throw error
    return { token, userId: scope.userId }
  }

  const userId = typeof body.userId === 'string' ? body.userId : ''
  const token = req.headers.get('x-widget-token') || ''
  if (!userId || !token) throw new HttpError(401, 'Brak dostępu do widgetu.')
  const { data: row } = await db.from('widget_tokens').select('token_hash').eq('user_id', userId).maybeSingle()
  if (!row || row.token_hash !== await sha256(token)) throw new HttpError(401, 'Widget wymaga ponownego połączenia — otwórz aplikację.')

  switch (body.action) {
    case 'state':
      return await dayState(db, userId)
    case 'parse':
      return { items: await parseItems(userId, body) }
    case 'save': {
      const items = Array.isArray(body.items) ? body.items as PortionItem[] : []
      const mealType = MEAL_TYPES.includes(String(body.mealType)) ? String(body.mealType) : defaultMealType()
      if (!items.length) throw new HttpError(400, 'Brak pozycji do zapisu.')
      await saveItems(db, userId, mealType, items)
      return { saved: true, state: await dayState(db, userId) }
    }
    default:
      throw new HttpError(400, 'Nieznana akcja.')
  }
}

Deno.serve(serveJson(async (req, { supabase: db }) => {
  try {
    return await handle(req, db)
  } catch (err) {
    if (err instanceof HttpError) return Response.json({ error: err.message }, { status: err.status })
    throw err
  }
}, { auth: 'none' }))
