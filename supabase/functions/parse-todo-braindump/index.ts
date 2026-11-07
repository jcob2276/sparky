/**
 * @function parse-todo-braindump
 * @trigger HTTP POST / Todo — dyktowanie lub wklejony "brain dump"
 * @role Rozbija swobodny monolog na konkretne zadania: wybiera tylko to, co przydatne,
 *       ustawia priorytet, ważność (macierz Eisenhowera), termin i listę.
 * @reads —
 * @writes —
 * @calls deepseek-chat
 * @consumer Todo: Nowe zadanie (mikrofon / "Rozpisz AI")
 * @status active
 */
import { serveJson } from '../_shared/http.ts'
import { deepseekChat, parseJsonFromContent } from '../_shared/deepseek.ts'
import { LLM_TASKS } from '../_shared/llm/tasks.ts'

interface SectionInput { id: string; name: string }
interface RawTask {
  title?: unknown; priority?: unknown; is_important?: unknown
  due_date?: unknown; scheduled_time?: unknown; section_id?: unknown; notes?: unknown
}

const PRIORITIES = new Set(['urgent', 'high', 'normal', 'low'])
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/

function buildPrompt(today: string, sections: SectionInput[]): string {
  const lists = sections.length
    ? sections.map((s) => `- ${s.id} = ${s.name}`).join('\n')
    : '(brak list — zawsze section_id: null)'
  return `Jesteś asystentem, który z chaotycznego, podyktowanego monologu po polsku wyciąga listę zadań.
Dzisiaj jest ${today} (strefa Europe/Warsaw).

Zasady:
- Weź tylko to, co realnie jest zadaniem do zrobienia. Pomiń dygresje, narzekanie, oczywistości, powtórzenia i rzeczy bez wartości.
- Scal duplikaty. Tytuł: krótki, w trybie rozkazującym lub bezokolicznika ("Zadzwonić do Marka", max 80 znaków).
- priority: "urgent" tylko gdy coś naprawdę pali się dziś/jutro lub ma twardy termin; "high" ważne z bliskim terminem; "normal" domyślnie; "low" gdy "kiedyś/jak będzie czas".
- is_important (macierz Eisenhowera): true gdy zadanie przybliża do ważnych celów (zdrowie, praca/sprzedaż, finanse, relacje, rozwój), false dla drobnych porządków i spraw administracyjnych bez konsekwencji.
- due_date w formacie YYYY-MM-DD tylko jeśli z wypowiedzi wynika termin ("jutro", "w piątek"); inaczej null. scheduled_time HH:MM tylko gdy podana godzina.
- section_id: wybierz jedno z poniższych id, jeśli pasuje tematycznie, inaczej null.
- notes: opcjonalny krótki kontekst z wypowiedzi, inaczej null.

Dostępne listy:
${lists}

Zwróć wyłącznie JSON: {"tasks":[{"title":"","priority":"normal","is_important":false,"due_date":null,"scheduled_time":null,"section_id":null,"notes":null}]}`
}

function normalize(raw: unknown, sections: SectionInput[]) {
  const arr = (raw as { tasks?: unknown })?.tasks
  if (!Array.isArray(arr)) return []
  const ids = new Set(sections.map((s) => s.id))
  const seen = new Set<string>()
  const out: Array<Record<string, unknown>> = []
  for (const item of arr.slice(0, 30) as RawTask[]) {
    const title = typeof item.title === 'string' ? item.title.trim().slice(0, 120) : ''
    if (!title || seen.has(title.toLowerCase())) continue
    seen.add(title.toLowerCase())
    const priority = typeof item.priority === 'string' && PRIORITIES.has(item.priority) ? item.priority : 'normal'
    const due = typeof item.due_date === 'string' && DATE_RE.test(item.due_date) ? item.due_date : null
    const time = due && typeof item.scheduled_time === 'string' && TIME_RE.test(item.scheduled_time) ? item.scheduled_time : null
    out.push({
      title,
      priority,
      is_important: item.is_important === true,
      due_date: due,
      scheduled_time: time,
      section_id: typeof item.section_id === 'string' && ids.has(item.section_id) ? item.section_id : null,
      notes: typeof item.notes === 'string' && item.notes.trim() ? item.notes.trim().slice(0, 500) : null,
    })
  }
  return out
}

Deno.serve(serveJson(async (req) => {
  const body = await req.json().catch(() => ({}))
  const text = typeof body.text === 'string' ? body.text.trim().slice(0, 8000) : ''
  if (!text) throw new Error('Missing text')
  const today = typeof body.today === 'string' && DATE_RE.test(body.today) ? body.today : new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Warsaw' }).format(new Date())
  const sections: SectionInput[] = Array.isArray(body.sections)
    ? body.sections
        .filter((s: unknown): s is SectionInput => !!s && typeof (s as SectionInput).id === 'string' && typeof (s as SectionInput).name === 'string')
        .slice(0, 40)
    : []

  const apiKey = Deno.env.get('DEEPSEEK_API_KEY') || ''
  if (!apiKey) throw new Error('Missing DEEPSEEK_API_KEY')

  const result = await deepseekChat({
    apiKey,
    ...LLM_TASKS.structured,
    maxTokens: 2000,
    timeoutMs: 30000,
    messages: [
      { role: 'system', content: buildPrompt(today, sections) },
      { role: 'user', content: text },
    ],
  })

  const tasks = normalize(parseJsonFromContent(result.content), sections)
  console.log(`[parse-todo-braindump] ${text.length} znaków → ${tasks.length} zadań`)
  return { tasks }
}))
