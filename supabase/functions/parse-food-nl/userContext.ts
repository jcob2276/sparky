import {createServiceClient} from '../_shared/supabase.ts';
import type {UserParseContext,FoodCorrection} from '../_shared/foodParseCore.ts';
import {formatWarsawDate,shiftDateStr,warsawTimeOfDay} from '@vanguard/domain';
import {fetchMealPreferences} from '../_shared/mealPreferences.ts';
import {targetForDay} from '../_shared/nutritionTargetForDay.ts';
export async function loadUserContext(
  userId: string,
  db: ReturnType<typeof createServiceClient>,
  timeOfDay?: 'morning' | 'afternoon' | 'evening',
  asOf=new Date(),
): Promise<{ ctx: UserParseContext; corrections: FoodCorrection[] }> {
  const today=formatWarsawDate(asOf),cutoff=shiftDateStr(today,-120);

  const [profileRes, targetRes, weightRes, favRes, corrRes, historyRes, portionsRes, memoriesRes,mealPreferences] = await Promise.all([
    db.from('nutrition_profile').select('height_cm, sex, birth_date').eq('user_id', userId).maybeSingle(),
    targetForDay(db, userId, today, 'target_kcal, protein_floor_g'),
    db.from('body_metrics').select('weight,date').eq('user_id', userId).gte('date',shiftDateStr(today,-30)).lte('date',today).order('date', { ascending: false }).limit(1).maybeSingle(),
    db.from('food_favorites').select('default_grams, use_count, food_library!inner(name)').eq('user_id', userId).eq('food_library.user_id', userId).neq('food_library.validation_status', 'quarantined').order('use_count', { ascending: false }).limit(15),
    db.from('food_corrections').select('query_name, corrected_name, corrected_grams').eq('user_id', userId).order('updated_at', { ascending: false }).limit(10),
    db.from('daily_food_entries').select('name, logged_at').eq('user_id', userId).gte('date', cutoff).lte('date',today).order('logged_at', { ascending: false }).limit(400),
    db.from('user_portions').select('name, grams').eq('user_id', userId),
    db.from('nutrition_meal_memories').select('name, meal_type, items, confirmed_count')
      .eq('user_id', userId).order('last_confirmed_at', { ascending: false }).limit(8),
    fetchMealPreferences(db,userId),
  ])

  const profile = profileRes.data as { height_cm?: number; sex?: string; birth_date?: string } | null
  const target = targetRes.data as { target_kcal?: number; protein_floor_g?: number } | null
  const weight = weightRes.data as { weight?: number } | null
  const favorites = (favRes.error ? [] : (favRes.data ?? [])) as unknown as { food_library: { name: string }; default_grams: number; use_count: number }[]
  const corrections = corrRes.error ? [] : ((corrRes.data ?? []) as { query_name: string; corrected_name: string | null; corrected_grams: number }[])
  const portions = portionsRes.error ? [] : ((portionsRes.data ?? []) as { name: string; grams: number }[])

  const age = profile?.birth_date
    ? Math.floor((asOf.getTime() - new Date(profile.birth_date).getTime()) / (365.25 * 86400000))
    : null
  const sexLabel = profile?.sex === 'female' ? 'Kobieta' : profile?.sex === 'male' ? 'Mężczyzna' : 'Użytkownik'
  const profileLine = [
    sexLabel,
    age ? `${age} lat` : null,
    profile?.height_cm ? `${profile.height_cm} cm` : null,
    weight?.weight ? `waga ~${Math.round(weight.weight)} kg` : null,
    target?.target_kcal ? `cel ${target.target_kcal} kcal` : null,
    target?.protein_floor_g ? `${target.protein_floor_g} g białka/d` : null,
  ].filter(Boolean).join(', ')

  const favoritesBlock = favorites.length
    ? favorites.map((f) => `- ${f.food_library.name}: zwykle ${f.default_grams}g (×${f.use_count})`).join('\n')
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
      if(!Number.isFinite(Date.parse(row.logged_at))) continue;
      const h=Number(warsawTimeOfDay(row.logged_at).slice(0,2));
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
      mealPreferences,
    },
    corrections,
  }
}

