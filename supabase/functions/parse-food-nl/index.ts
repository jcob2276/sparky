/**
 * @function parse-food-nl
 * @trigger HTTP POST / Frontend NL meal parser
 * @role Parser posiłków z języka naturalnego na struktury danych z uwzględnieniem kontekstu użytkownika.
 * @reads daily_food_entries, user_settings, food_library, nutrition_profile, nutrition_targets, body_metrics, food_favorites, food_corrections, user_portions, nutrition_meal_memories, user_preferences
 * @writes —
 * @calls deepseek-chat (text), Gemini (meal/menu/fridge/label vision)
 * @consumer Zapis posiłków w aplikacji frontendowej i Telegramie
 * @status active
 */
import { createServiceClient, getServiceRoleKey } from '../_shared/supabase.ts'
import { serveJson, HttpError } from '../_shared/http.ts'
import {
  parseMealText,
  finalizeParsedItems,
  type UserParseContext,
  type FoodCorrection,
} from '../_shared/foodParseCore.ts'
import { parseNutritionLabel, parseMealPhoto } from './mealVision.ts'
import { parseRestaurantMenu, parseFridgeIngredients } from './foodAssistVision.ts'
import {loadUserContext} from './userContext.ts'
import {warsawTimeOfDay} from '@vanguard/domain';

Deno.serve(serveJson(async (req, auth) => {
  const body = await req.clone().json().catch(() => ({}))
  const text = typeof body.text === 'string' ? body.text.trim() : ''
  if (body.mode === 'restaurant_menu' || body.mode === 'fridge_ingredients') {
    if (!text && !body.imageBase64) throw new HttpError(400,'Dodaj zdjęcie lub opis menu/składników.');
    if (text.length>8000 || (body.imageBase64 && (typeof body.imageBase64 !== 'string' || body.imageBase64.length>10000000))) throw new HttpError(400,'Za duży załącznik lub opis. Wybierz mniejsze zdjęcie albo krótszy tekst.');
    if (body.imageBase64 && !/^image\/(jpeg|png|webp)$/.test(String(body.mimeType))) throw new HttpError(400,'Wybierz zdjęcie JPEG, PNG lub WebP.');
  }
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
    const h=Number(warsawTimeOfDay(clientDate.toISOString()).slice(0,2));
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

  if (body.mode === 'restaurant_menu') {
    const menuAnalysis = await parseRestaurantMenu({
      imageBase64: body.imageBase64 ? String(body.imageBase64) : undefined,
      mimeType: body.mimeType ? String(body.mimeType) : undefined,
      text: body.text ? String(body.text) : undefined,
      ctx,
      userId,
    })
    return { menuAnalysis }
  }

  if (body.mode === 'fridge_ingredients') {
    const fridgeAnalysis = await parseFridgeIngredients({
      imageBase64: body.imageBase64 ? String(body.imageBase64) : undefined,
      mimeType: body.mimeType ? String(body.mimeType) : undefined,
      text: body.text ? String(body.text) : undefined,
      ctx,
      userId,
    })
    return { fridgeAnalysis }
  }

  if (body.mode === 'meal_photo') {
    const hint = typeof body.hint === 'string' ? body.hint.trim() : ''
    const meal = await parseMealPhoto(
      String(body.imageBase64 || ''),
      String(body.mimeType || ''),
      userId,
      ctx,
      corrections,
      db,
      supabaseUrl,
      serviceKey,
      hint || undefined,
    )
    console.log(`[parse-food-nl] photo -> ${meal.items.length} items (user=${userId ?? 'anon'})`)
    // `hintApplied` lets old clients tell a hint-aware answer from one that ignored the hint.
    return { meal: { ...meal, hintApplied: Boolean(hint) } }
  }

  if (!text) throw new Error('Missing text')
  const apiKey = Deno.env.get('DEEPSEEK_API_KEY') || ''
  if (!apiKey) throw new Error('Missing DEEPSEEK_API_KEY')

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
