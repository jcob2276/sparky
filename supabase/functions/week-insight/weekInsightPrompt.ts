/** Pure prompt + response shaping for the Tydzień AI analysis (no Deno or DB imports, so it can be tested anywhere). */

interface WeekInsightTask {
  title: string
  done: boolean
  category: string | null
}

export interface WeekInsightDay {
  date: string
  weekday: string
  score: number | null
  note: string | null
  tasks: WeekInsightTask[]
}

interface WeekInsightJournalEntry {
  date: string
  text: string
}

export interface WeekInsightFacts {
  days: WeekInsightDay[]
  journal: WeekInsightJournalEntry[]
}

interface WeekInsightChange {
  title: string
  why: string
  how: string
}

interface WeekInsightPattern {
  theme: string
  evidence: string
}

export interface WeekInsightResult {
  summary: string
  changes: WeekInsightChange[]
  patterns: WeekInsightPattern[]
}

const MAX_ITEMS = 3
const MAX_JOURNAL_CHARS = 700
const MAX_SUMMARY = 420
const MAX_TITLE = 80
const MAX_TEXT = 260
const MAX_EVIDENCE = 160

export const WEEK_INSIGHT_SYSTEM_PROMPT = `Jesteś bezpośrednim, rzeczowym trenerem, który czyta tydzień jednej osoby: jej plan 5 zadań dziennie, własne oceny dnia (1–10), jednozdaniowe opinie i wpisy z dziennika głosowego.
Zasady:
- Opieraj się WYŁĄCZNIE na przekazanych danych. Nie zgaduj, nie dopowiadaj faktów, nie wymyślaj liczb. Każdy wniosek musi mieć dowód w danych (ocena, zadanie, cytat).
- Cytuj słowa użytkownika (krótko), zamiast je parafrazować. Pisz po polsku, do użytkownika na „Ty”, krótko i konkretnie. Bez moralizowania, bez diagnoz medycznych i psychologicznych, bez ogólnych porad motywacyjnych.
- "changes": maksymalnie 3 zmiany, które realnie zmienią następne dni. Każda: "title" (do 8 słów), "why" (1–2 zdania z dowodem z danych), "how" (jedno konkretne działanie na jutro, które da się sprawdzić, np. godzina, liczba, miejsce w dniu).
- "patterns": maksymalnie 3 powtarzające się tematy z opinii i dziennika. Każdy: "theme" (krótka nazwa) i "evidence" (krótki cytat użytkownika, do 160 znaków).
- Tematy intymne lub seksualne nazywaj ogólnie (np. „rozpraszacze”, „impulsy”) i nigdy ich nie cytuj.
- Jeśli danych jest za mało na wniosek, napisz to w "summary" i zwróć puste listy.
- "summary": 2 zdania o tym, co w tym tygodniu naprawdę się działo.
Zwróć wyłącznie JSON: {"summary":string,"changes":[{"title":string,"why":string,"how":string}],"patterns":[{"theme":string,"evidence":string}]}`

function clip(text: string, max: number): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean
}

/** Facts as plain text the model can quote from. */
export function buildWeekInsightUserPrompt(facts: WeekInsightFacts): string {
  const days = facts.days.map((day) => {
    const score = day.score != null ? `ocena ${day.score}/10` : 'bez oceny'
    const tasks = day.tasks.length
      ? day.tasks.map((t) => `${t.done ? '✓' : '✗'} ${clip(t.title, 80)}${t.category ? ` [${t.category}]` : ''}`).join('; ')
      : 'brak planu'
    const note = day.note ? `; opinia: "${clip(day.note, 300)}"` : ''
    return `${day.date} (${day.weekday}) ${score}; zadania: ${tasks}${note}`
  })
  const journal = facts.journal.length
    ? facts.journal.map((entry) => `[${entry.date}] ${clip(entry.text, MAX_JOURNAL_CHARS)}`)
    : ['(brak wpisów)']
  return `DNI (ostatnie 7):\n${days.join('\n')}\n\nDZIENNIK GŁOSOWY (Telegram):\n${journal.join('\n')}`
}

function str(value: unknown, max: number): string {
  return typeof value === 'string' ? clip(value, max) : ''
}

/** Turns the model's JSON into the shape the app renders; null when there is no usable summary. */
export function normalizeWeekInsight(raw: Record<string, unknown> | null): WeekInsightResult | null {
  if (!raw) return null
  const summary = str(raw.summary, MAX_SUMMARY)
  if (!summary) return null

  const changes = (Array.isArray(raw.changes) ? raw.changes : [])
    .map((item): WeekInsightChange => {
      const row = (item ?? {}) as Record<string, unknown>
      return { title: str(row.title, MAX_TITLE), why: str(row.why, MAX_TEXT), how: str(row.how, MAX_TEXT) }
    })
    .filter((c) => c.title && c.how)
    .slice(0, MAX_ITEMS)

  const patterns = (Array.isArray(raw.patterns) ? raw.patterns : [])
    .map((item): WeekInsightPattern => {
      const row = (item ?? {}) as Record<string, unknown>
      return { theme: str(row.theme, MAX_TITLE), evidence: str(row.evidence, MAX_EVIDENCE) }
    })
    .filter((p) => p.theme && p.evidence)
    .slice(0, MAX_ITEMS)

  return { summary, changes, patterns }
}
