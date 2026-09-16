/**
 * @function parse-food-nl
 * @trigger HTTP POST / Frontend NL meal parser
 * @role Parser posiłków z języka naturalnego na struktury danych z uwzględnieniem kontekstu użytkownika.
 * @reads daily_food_entries, user_settings, food_library, nutrition_profile, nutrition_targets, body_metrics, food_favorites, food_corrections, user_portions, nutrition_meal_memories
 * @writes —
 * @calls deepseek-chat (text, w foodParseCore.ts), OpenAI gpt-4o-mini (meal photo and label vision)
 * @consumer Zapis posiłków w aplikacji frontendowej i Telegramie
 * @status active
 */
import { createServiceClient, getServiceRoleKey } from '../_shared/supabase.ts'
import { serveJson } from '../_shared/http.ts'
import {
  parseMealText,
  finalizeParsedItems,
  type UserParseContext,
  type FoodCorrection,
} from '../_shared/foodParseCore.ts'
import { parseNutritionLabel, parseMealPhoto } from './mealVision.ts'

async function loadUserContext(
  userId: string,
  db: ReturnType<typeof createServiceClient>,
  timeOfDay?: 'morning' | 'afternoon' | 'evening',
): Promise<{ ctx: UserParseContext; corrections: FoodCorrection[] }> {
  const cutoff = new Date()
  cutoff.setUTCDate(cutoff.getUTCDate() - 120)

  const [profileRes, targetRes, weightRes, favRes, corrRes, historyRes, portionsRes, memoriesRes] = await Promise.all([
    db.from('nutrition_profile').select('height_cm, sex, birth_date').eq('user_id', userId).maybeSingle(),
    db.from('nutrition_targets').select('target_kcal, protein_floor_g').eq('user_id', userId).order('date', { ascending: false }).limit(1).maybeSingle(),
    db.from('body_metrics').select('weight_kg').eq('user_id', userId).order('date', { ascending: false }).limit(1).maybeSingle(),
    db.from('food_favorites').select('name, default_grams, use_count').eq('user_id', userId).order('use_count', { ascending: false }).limit(15),
    db.from('food_corrections').select('query_name, corrected_name, corrected_grams').eq('user_id', userId).order('updated_at', { ascending: false }).limit(10),
    db.from('daily_food_entries').select('name, logged_at').eq('user_id', userId).gte('date', cutoff.toISOString().slice(0, 10)).order('logged_at', { ascending: false }).limit(400),
    db.from('user_portions').select('name, grams').eq('user_id', userId),
    db.from('nutrition_meal_memories').select('name, meal_type, items, confirmed_count')
      .eq('user_id', userId).order('last_confirmed_at', { ascending: false }).limit(8),
  ])

  const profile = profileRes.data as { height_cm?: number; sex?: string; birth_date?: string } | null
  const target = targetRes.data as { target_kcal?: number; protein_floor_g?: number } | null
  const weight = weightRes.data as { weight_kg?: number } | null
  const favorites = (favRes.data ?? []) as { name: string; default_grams: number; use_count: number }[]
  const corrections = corrRes.error ? [] : ((corrRes.data ?? []) as { query_name: string; corrected_name: string | null; corrected_grams: number }[])
  const portions = portionsRes.error ? [] : ((portionsRes.data ?? []) as { name: string; grams: number }[])

  const age = profile?.birth_date
    ? Math.floor((Date.now() - new Date(profile.birth_date).getTime()) / (365.25 * 86400000))
    : null
  const sexLabel = profile?.sex === 'female' ? 'Kobieta' : profile?.sex === 'male' ? 'Mężczyzna' : 'Użytkownik'
  const profileLine = [
    sexLabel,
    age ? `${age} lat` : null,
    profile?.height_cm ? `${profile.height_cm} cm` : null,
    weight?.weight_kg ? `waga ~${Math.round(weight.weight_kg)} kg` : null,
    target?.target_kcal ? `cel ${target.target_kcal} kcal` : null,
    target?.protein_floor_g ? `${target.protein_floor_g} g białka/d` : null,
  ].filter(Boolean).join(', ')

  const favoritesBlock = favorites.length
    ? favorites.map((f) => `- ${f.name}: zwykle ${f.default_grams}g (×${f.use_count})`).join('\n')
    : '(brak historii — użyj standardowych porcji)'

  const correctionsBlock = corrections.length
    ? corrections.map((c) => `- "${c.query_name}" → ${c.corrected_grams}g${c.corrected_name ? ` jako "${c.corrected_name}"` : ''}`).join('\n')
    : ''

  const portionsBlock = portions.length
    ? portions.map((p) => `- ${p.name}: ${p.grams}g`).join('\n')
    : ''

  const historyRows = (historyRes.error ? [] : (historyRes.data ?? [])) as { name: string; logged_at?: string }[]
  const nameCounts = new Map<string, number>()
  for (const row of historyRows) {
    const key = row.name?.trim()
    if (!key) continue
    if (timeOfDay && row.logged_at) {
      const h = new Date(row.logged_at).getUTCHours() + 2
      let rowTod = 'evening'
      if (h >= 5 && h < 12) rowTod = 'morning'
      else if (h >= 12 && h < 17) rowTod = 'afternoon'
      if (rowTod !== timeOfDay) continue
    }
    nameCounts.set(key, (nameCounts.get(key) ?? 0) + 1)
  }
  const historyBlock = [...nameCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 18)
    .map(([name, count]) => `- ${name} (×${count})`)
    .join('\n')
  const memories = memoriesRes.error ? [] : (memoriesRes.data ?? []) as Array<{
    name: string | null
    meal_type: string
    items: unknown
    confirmed_count: number
  }>
  const memoryBlock = memories.flatMap((memory) => {
    if (!Array.isArray(memory.items)) return []
    const items = memory.items.flatMap((raw) => {
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return []
      const item = raw as Record<string, unknown>
      const name = typeof item.name === 'string' ? item.name : ''
      const grams = Number(item.grams)
      return name && Number.isFinite(grams) ? [`${name} ${Math.round(grams)}g`] : []
    })
    return items.length
      ? [`- potwierdzone ${memory.confirmed_count}×: ${memory.name ?? memory.meal_type} = ${items.join(', ')}`]
      : []
  }).join('\n')

  return {
    ctx: {
      profileLine: profileLine || 'Profil domyślny dorosłego użytkownika',
      targetKcal: target?.target_kcal ?? null,
      targetProtein: target?.protein_floor_g ?? null,
      favoritesBlock,
      correctionsBlock,
      historyBlock: [memoryBlock, historyBlock].filter(Boolean).join('\n'),
      portionsBlock,
    },
    corrections,
  }
}

Deno.serve(serveJson(async (req, auth) => {
  const body = await req.clone().json().catch(() => ({}))
  const text: string = (body.text || '').trim()
  const clientTime: string | undefined = body.clientTime

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
  const serviceKey = getServiceRoleKey()

  const userId = auth.userId ?? undefined

  if (body.mode === 'label') {
    const label = await parseNutritionLabel(String(body.imageBase64 || ''), String(body.mimeType || ''), userId)
    return { label }
  }

  const db = createServiceClient()
  let ctx: UserParseContext
  let corrections: FoodCorrection[] = []

  if (userId) {
    let timeOfDay: 'morning' | 'afternoon' | 'evening' | undefined
    // BUG 6: new Date("invalid").getUTCHours() = NaN → NaN+2=NaN → zawsze 'evening'
    const parsedClientTime = clientTime ? new Date(clientTime) : new Date()
    const clientDate = isNaN(parsedClientTime.getTime()) ? new Date() : parsedClientTime
    const h = clientDate.getUTCHours() + 2
    if (h >= 5 && h < 12) timeOfDay = 'morning'
    else if (h >= 12 && h < 17) timeOfDay = 'afternoon'
    else timeOfDay = 'evening'

    const loaded = await loadUserContext(userId, db, timeOfDay)
    ctx = loaded.ctx
    corrections = loaded.corrections
  } else {
    ctx = {
      profileLine: 'Profil domyślny dorosłego użytkownika',
      targetKcal: null,
      targetProtein: null,
      favoritesBlock: '',
      correctionsBlock: '',
      historyBlock: '',
      portionsBlock: '',
    }
  }

  if (body.mode === 'meal_photo') {
    const meal = await parseMealPhoto(
      String(body.imageBase64 || ''),
      String(body.mimeType || ''),
      userId,
      ctx,
      corrections,
      db,
      supabaseUrl,
      serviceKey,
    )
    console.log(`[parse-food-nl] photo -> ${meal.items.length} items (user=${userId ?? 'anon'})`)
    return { meal }
  }

  if (!text) throw new Error('Missing text')
  const apiKey = Deno.env.get('DEEPSEEK_API_KEY') || Deno.env.get('OPENAI_API_KEY') || ''
  if (!apiKey) throw new Error('Missing DEEPSEEK_API_KEY / OPENAI_API_KEY')

  let items = await parseMealText(apiKey, text, ctx)

  items = await finalizeParsedItems(items, {
    originalText: text,
    corrections,
    supabaseUrl,
    serviceKey,
    userId,
    db,
    apiKey,
    parseContext: ctx,
  })

  console.log(`[parse-food-nl] "${text.slice(0, 60)}" → ${items.length} items (user=${userId ?? 'anon'})`)

  return { items }
}, { auth: 'user' }))
