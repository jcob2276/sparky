/**
 * @function widget-tasks
 * @trigger HTTP POST / Android home-screen widget (Zadania i notatki)
 * @role Backend widgetu zadań i notatek: lista otwartych zadań i ostatnich notatek, dodawanie zadania/notatki i odhaczanie zadania bez otwierania aplikacji.
 * @reads todo_items, vanguard_notes, widget_tokens
 * @writes todo_items, vanguard_notes
 * @calls —
 * @consumer Widget Android TasksWidgetProvider i arkusz szybkiego dodawania
 * @status active
 */
import { createServiceClient } from '../_shared/supabase.ts'
import { serveJson } from '../_shared/http.ts'
import { getWarsawDateString } from '../_shared/time.ts'
import { buildNoteInsertRow, buildTodoInsertRow } from '@vanguard/domain'
import { requireWidgetUser, WidgetHttpError } from '../_shared/widgetAuth.ts'

type Db = ReturnType<typeof createServiceClient>

const TASK_LIMIT = 40
const NOTE_LIMIT = 30

function shiftDay(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

const ENTITIES: Record<string, string> = { '&nbsp;': ' ', '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'" }

/** Plain-text preview of a note body: notes are stored as HTML or markdown, the widget shows neither. */
function snippet(content: string, title: string): string {
  const plain = content
    .replace(/<(br|\/p|\/div|\/h[1-6]|\/li)\s*\/?>/gi, ' ')
    .replace(/<[^>]*>?/g, ' ')
    .replace(/&(nbsp|amp|lt|gt|quot|#39);/g, (m) => ENTITIES[m] ?? ' ')
    .replace(/[#>*_`\[\]]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  const body = plain.startsWith(title) ? plain.slice(title.length).trim() : plain
  return body.slice(0, 160)
}

async function listState(db: Db, userId: string) {
  const today = getWarsawDateString()
  const [tasks, notes] = await Promise.all([
    db.from('todo_items').select('id,title,due_date,priority,is_important,scheduled_time')
      .eq('user_id', userId).eq('status', 'open').is('parent_task_id', null)
      .order('due_date', { ascending: true, nullsFirst: false }).order('sort_order', { ascending: true }).limit(200),
    db.from('vanguard_notes').select('id,title,content,is_pinned,is_locked,updated_at')
      .eq('user_id', userId).is('deleted_at', null).eq('is_archived', false)
      .order('is_pinned', { ascending: false }).order('updated_at', { ascending: false }).limit(NOTE_LIMIT),
  ])
  const open = tasks.data ?? []
  const overdue = open.filter((t) => t.due_date && t.due_date < today).length
  const dueToday = open.filter((t) => t.due_date === today).length
  const rank = (t: { due_date: string | null }) => (t.due_date == null ? 3 : t.due_date < today ? 0 : t.due_date === today ? 1 : 2)
  const sorted = [...open].sort((a, b) => rank(a) - rank(b) || String(a.due_date ?? '').localeCompare(String(b.due_date ?? '')))
  return {
    today,
    counts: { open: open.length, overdue, today: dueToday, notes: (notes.data ?? []).length },
    tasks: sorted.slice(0, TASK_LIMIT).map((t) => ({
      id: t.id, title: t.title, due: t.due_date, important: t.is_important || t.priority === 'high' || t.priority === 'urgent', time: t.scheduled_time,
    })),
    notes: (notes.data ?? []).map((n) => ({
      id: n.id, title: n.title || 'Notatka', pinned: n.is_pinned, locked: n.is_locked,
      snippet: n.is_locked ? '' : snippet(String(n.content ?? ''), String(n.title ?? '')),
    })),
  }
}

async function handle(req: Request, db: Db) {
  const body = await req.clone().json().catch(() => ({})) as Record<string, unknown>
  const userId = await requireWidgetUser(db, req, body)
  const today = getWarsawDateString()

  switch (body.action) {
    case 'list':
      return await listState(db, userId)
    case 'add_task': {
      const title = String(body.title ?? '').trim().slice(0, 300)
      if (!title) throw new WidgetHttpError(400, 'Wpisz treść zadania.')
      const due = body.due === 'today' ? today : body.due === 'tomorrow' ? shiftDay(today, 1) : null
      const important = body.important === true
      const row = buildTodoInsertRow({ user_id: userId, title, due_date: due, priority: important ? 'high' : 'normal', is_important: important })
      const { error } = await db.from('todo_items').insert(row)
      if (error) {
        if (error.code === '23505') throw new WidgetHttpError(409, 'Takie zadanie już masz na liście.')
        throw error
      }
      return { saved: true, state: await listState(db, userId) }
    }
    case 'add_note': {
      const text = String(body.text ?? '').trim().slice(0, 20000)
      if (!text) throw new WidgetHttpError(400, 'Wpisz treść notatki.')
      const { error } = await db.from('vanguard_notes').insert(buildNoteInsertRow({ user_id: userId, content: text }))
      if (error) throw error
      return { saved: true, state: await listState(db, userId) }
    }
    case 'complete': {
      const id = String(body.id ?? '')
      const { data, error } = await db.from('todo_items')
        .update({ status: 'done', completed_at: new Date().toISOString() })
        .eq('id', id).eq('user_id', userId).eq('status', 'open').select('id')
      if (error) throw error
      if (!data?.length) throw new WidgetHttpError(404, 'Tego zadania już nie ma na liście.')
      return { saved: true, state: await listState(db, userId) }
    }
    default:
      throw new WidgetHttpError(400, 'Nieznana akcja.')
  }
}

Deno.serve(serveJson(async (req, { supabase: db }) => {
  try {
    return await handle(req, db)
  } catch (err) {
    if (err instanceof WidgetHttpError) return Response.json({ error: err.message }, { status: err.status })
    throw err
  }
}, { auth: 'none' }))
