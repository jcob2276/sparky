import { createServiceClient } from '../_shared/supabase.ts'
import { deepseekChat, parseJsonFromContent } from '../_shared/deepseek.ts'
import { LLM_TASKS } from '../_shared/llm/tasks.ts'
import { sendMessage } from '../_shared/telegram.ts'
import { getVanguardUserId } from '../_shared/constants.ts'
// Force upload of domain package for shared dependencies
import type {} from "@vanguard/domain";

export async function runLibrarian(options: {
  db?: ReturnType<typeof createServiceClient>; userId?: string; apiKey?: string; tgToken?: string; tgChatId?: string;
  propose?: typeof deepseekChat; send?: typeof sendMessage;
} = {}) {
  const db = options.db ?? createServiceClient()
  const apiKey = options.apiKey ?? Deno.env.get('DEEPSEEK_API_KEY') ?? ''
  const tgToken = options.tgToken ?? Deno.env.get('TELEGRAM_BOT_TOKEN') ?? ''
  const tgChatId = options.tgChatId ?? Deno.env.get('TELEGRAM_CHAT_ID') ?? ''
  const userId = options.userId ?? getVanguardUserId()

  if (!apiKey || !tgToken || !tgChatId) {
    throw new Error('Missing config: DEEPSEEK_API_KEY, TELEGRAM_BOT_TOKEN, or TELEGRAM_CHAT_ID')
  }

  // 1. Fetch distinct llm_estimate entries from the last 7 days
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 7)
  const cutoffStr = cutoff.toISOString().slice(0, 10)

  const { data: rawEntries, error } = await db
    .from('daily_food_entries')
    .select('name, user_id')
    .eq('user_id', userId)
    .gte('date', cutoffStr)
    .filter('parse_meta->>macroSource', 'eq', 'llm_estimate')

  const entries = rawEntries as { name: string; user_id: string }[] | null
  if (error) throw error
  if (!entries || entries.length === 0) {
    return { count: 0, items: [] }
  }

  // Deduplicate by name
  const names = [...new Map(entries.map(e => [e.name.trim().toLowerCase(), e.name.trim()])).values()].filter(Boolean)
  if (names.length === 0) return { count: 0, items: [] }

  const results: { name: string; macro: { calories: number; protein: number; carbs: number; fat: number } }[] = []
  const resolved = new Set<string>()
  for (const table of ['food_library', 'food_corrections'] as const) {
    const column = table === 'food_library' ? 'name' : 'query_name'
    for (let from = 0; ; from += 500) {
      const { data, error } = await db.from(table).select(column).eq('user_id', userId).order('id').range(from, from + 499)
      if (error) throw error
      const rows = (data ?? []) as unknown as Record<string, string>[]
      rows.forEach(row => resolved.add(row[column].trim().toLowerCase()))
      if (rows.length < 500) break
    }
  }

  // 2. Evaluate each with deepseek
  for (const name of names) {
    // Check if it's already in food_library or food_corrections
    if (resolved.has(name.toLowerCase())) {
      continue // Already resolved
    }

    const systemPrompt = `Jesteś zaawansowanym asystentem dietetycznym. 
Znajdź jak najdokładniejsze makroskładniki na 100g dla podanego produktu/potrawy (Polska kuchnia i produkty).
Zwróć poprawny JSON:
{"calories": 150, "protein": 5.5, "carbs": 20.0, "fat": 5.0, "fiber": 1.5, "sugar": 2.0}
Jeśli potrawa jest wysoce niestandardowa, spróbuj oszacować makro bazując na uśrednionym standardowym przepisie.`

    try {
      const response = await (options.propose ?? deepseekChat)({
        apiKey,
        ...LLM_TASKS.structured,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Podaj makro na 100g dla: "${name}"` }
        ],
      })

      const macro = parseJsonFromContent(response.content) as Record<string, unknown> | null
      if (macro && typeof macro.calories === 'number') {
        const insertData = {
          user_id: userId,
          barcode: null,
          name: name,
          brand: '[AI Librarian]',
          calories: Math.round(macro.calories),
          protein: Number(macro.protein || 0),
          carbs: Number(macro.carbs || 0),
          fat: Number(macro.fat || 0),
          fiber: macro.fiber ? Number(macro.fiber) : null,
          sugar: macro.sugar ? Number(macro.sugar) : null,
          source: 'llm_estimate',
          validation_status: 'unreviewed',
        }
        const { error: insertError } = await db.rpc('ensure_food_library', { p_user_id: userId, p_food: insertData, p_default_grams: 100 })
        if (insertError) throw insertError
        resolved.add(name.toLowerCase())
        results.push({ name, macro: insertData })
      }
    } catch (e: unknown) {
      console.error(`[librarian] Error resolving macro for ${name}:`, e);
      // Log and continue to process other items in the loop
    }
  }

  if (results.length === 0) return { count: 0, items: [] }

  // 4. Send Telegram message
  const tgLines = results.map(r => `- ${r.name}: ${r.macro.calories} kcal/100g (B:${r.macro.protein} W:${r.macro.carbs} T:${r.macro.fat})`)
  const tgMsg = `📚 *Bibliotekarz Sparky*\n\nRozwiązałem ${results.length} wpisów \`llm_estimate\` z ostatniego tygodnia i dodałem je do Twojej bazy:\n\n${tgLines.join('\n')}`
  
  const chatId = parseInt(tgChatId, 10);
  await (options.send ?? sendMessage)(tgToken, chatId, tgMsg, { parseMode: 'Markdown' });

  return { count: results.length, items: results }
}

