import { assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { auditUser } from './audit.ts'

Deno.test('audit validates the catalog once and only heals its own library quarantines', async () => {
  const owner = '11111111-1111-4111-8111-111111111111', writes: Array<{ table: string; body: Record<string, unknown>; ids: string | null }> = []
  let libraryReads = 0
  const db = createClient('https://example.supabase.co', 'test', { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input)), table = url.pathname.split('/').at(-1)!
    assertEquals(table === 'food_favorites', false)
    if ((init?.method ?? 'GET') !== 'GET') {
      writes.push({ table, body: JSON.parse(String(init?.body)), ids: url.searchParams.get('id') })
      if (table === 'food_library') assertEquals(url.searchParams.get('user_id'), `eq.${owner}`)
      return Response.json([])
    }
    assertEquals(url.searchParams.get('user_id'), `eq.${owner}`)
    if (table === 'food_library') {
      libraryReads++
      return Response.json([
        { id: 'bad', name: 'YoPRO', calories: 100, protein: 8.3, carbs: 5.4, fat: 0.5, validation_status: 'unreviewed', validation_reason: null },
        { id: 'fixed', name: 'Milk', calories: 64, protein: 3, carbs: 4, fat: 4, validation_status: 'quarantined', validation_reason: 'food-integrity-audit: old finding' },
        { id: 'external', name: 'Milk', calories: 64, protein: 3, carbs: 4, fat: 4, validation_status: 'quarantined', validation_reason: 'other validator' },
      ])
    }
    return Response.json([])
  } } })
  const result = await auditUser(db, owner)
  assertEquals(libraryReads, 1); assertEquals(result.quarantined, 1); assertEquals(result.released, 1)
  const libraryWrites = writes.filter(write => write.table === 'food_library')
  assertEquals(libraryWrites.map(write => write.body.validation_status), ['quarantined', 'unreviewed'])
  assertEquals(libraryWrites[0].ids, 'eq.bad'); assertEquals(libraryWrites[1].ids, 'in.(fixed)')
  assertEquals(writes.some(write => write.table === 'daily_food_entries'), false)
})
