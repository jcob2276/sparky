/** Pure core of the AI period comparison: facts per period, the prompt, and response shaping (no Deno or DB imports). */

export interface PeriodRows {
  wins: Array<Record<string, unknown>>
  scores: Array<{ date: string; day_score: number | null }>
  oura: Array<{ total_sleep_hours: number | null; sleep_score: number | null; hrv_avg: number | null; rhr_avg: number | null; readiness_score: number | null }>
  nutrition: Array<{ date: string; calories: number | null; protein: number | null; fiber: number | null; avg_food_quality: number | null }>
  workoutSessions: number
  runDistancesM: Array<number | null>
  closer: Array<{ dials: number | null; appointments: number | null; sales_calls: number | null; sales_closed: number | null }>
  journal: Array<{ timestamp: string | null; content: string | null }>
}

interface CategoryRate { done: number; planned: number }

export interface PeriodFacts {
  label: string
  start: string
  end: string
  days: number
  scoreAvg: number | null
  scoredDays: number
  tasks: CategoryRate & { byCategory: Record<string, CategoryRate> }
  notes: Array<{ date: string; text: string }>
  sleep: { hours: number | null; score: number | null; hrv: number | null; rhr: number | null; readiness: number | null }
  /** Tylko pełne dni (bez dzisiejszego, z zapisanymi kaloriami); `days` = ile ich było. */
  food: { days: number; kcal: number | null; protein: number | null; fiber: number | null; quality: number | null }
  training: { sessions: number; runKm: number }
  /** `entries` = dni z wpisem; bez wpisów to brak danych, nie zero. */
  sales: { entries: number; calls: number; booked: number; salesCalls: number; sold: number }
  journal: Array<{ date: string; text: string }>
}

interface CompareItem { title: string; evidence: string }
interface CompareChange { title: string; why: string; how: string }

export interface PeriodCompareResult {
  summary: string
  improved: CompareItem[]
  worsened: CompareItem[]
  changes: CompareChange[]
  journal: CompareItem[]
}

const MAX_ITEMS = 3
const MAX_NOTES = 7
const MAX_JOURNAL = 12
const MAX_JOURNAL_CHARS = 450

function clip(text: string, max: number): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean
}

/** Date in Warsaw: an entry at 00:30 belongs to the new day, not to the previous UTC day. */
export function warsawDay(iso: string): string {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Warsaw' }).format(date)
}

/** Średnia z wartości znanych, wliczając 0 (dzień bez błonnika to prawdziwe 0, brak danych to null). */
function avgKnown(values: Array<number | null | undefined>): number | null {
  const real = values.filter((v): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0)
  return real.length ? Math.round((real.reduce((a, b) => a + b, 0) / real.length) * 10) / 10 : null
}

function avg(values: Array<number | null | undefined>): number | null {
  const real = values.filter((v): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0)
  return real.length ? Math.round((real.reduce((a, b) => a + b, 0) / real.length) * 10) / 10 : null
}

function daysBetween(start: string, end: string): number {
  return Math.round((new Date(`${end}T12:00:00Z`).getTime() - new Date(`${start}T12:00:00Z`).getTime()) / 86400000) + 1
}

const sum = (values: Array<number | null | undefined>) => values.reduce<number>((a, b) => a + (b ?? 0), 0)

export function buildPeriodFacts(label: string, start: string, end: string, rows: PeriodRows, today: string): PeriodFacts {
  // Dzisiejszy dzień jest w toku i zaniżałby średnie jedzenia (jak „średnia z N pełnych dni” w apce).
  const foodDays = rows.nutrition.filter((r) => r.date < today && (r.calories ?? 0) > 0)
  const byCategory: Record<string, CategoryRate> = {}
  let done = 0
  let planned = 0
  const notes: PeriodFacts['notes'] = []
  for (const win of rows.wins) {
    for (let n = 1; n <= 5; n++) {
      const title = win[`task_${n}`]
      if (typeof title !== 'string' || !title.trim()) continue
      const category = typeof win[`category_${n}`] === 'string' && win[`category_${n}`] ? String(win[`category_${n}`]) : 'general'
      const isDone = Boolean(win[`done_${n}`])
      const entry = (byCategory[category] ??= { done: 0, planned: 0 })
      entry.planned += 1
      planned += 1
      if (isDone) { entry.done += 1; done += 1 }
    }
    const note = win.day_note
    if (typeof note === 'string' && note.trim() && typeof win.date === 'string') {
      notes.push({ date: win.date, text: clip(note, 300) })
    }
  }
  notes.sort((a, b) => a.date.localeCompare(b.date))

  const scoreValues = rows.scores.map((s) => s.day_score)
  const journal = rows.journal
    .filter((entry) => entry.content && entry.content.trim() && entry.timestamp)
    .map((entry) => ({ date: warsawDay(entry.timestamp as string), text: clip(entry.content as string, MAX_JOURNAL_CHARS) }))
    .sort((a, b) => a.date.localeCompare(b.date))

  return {
    label, start, end, days: daysBetween(start, end),
    scoreAvg: avg(scoreValues),
    scoredDays: scoreValues.filter((v) => typeof v === 'number').length,
    tasks: { done, planned, byCategory },
    notes: notes.slice(0, MAX_NOTES),
    sleep: {
      hours: avg(rows.oura.map((r) => r.total_sleep_hours)),
      score: avg(rows.oura.map((r) => r.sleep_score)),
      hrv: avg(rows.oura.map((r) => r.hrv_avg)),
      rhr: avg(rows.oura.map((r) => r.rhr_avg)),
      readiness: avg(rows.oura.map((r) => r.readiness_score)),
    },
    food: {
      days: foodDays.length,
      kcal: avgKnown(foodDays.map((r) => r.calories)),
      protein: avgKnown(foodDays.map((r) => r.protein)),
      fiber: avgKnown(foodDays.map((r) => r.fiber)),
      quality: avgKnown(foodDays.map((r) => r.avg_food_quality)),
    },
    training: { sessions: rows.workoutSessions, runKm: Math.round((sum(rows.runDistancesM) / 1000) * 10) / 10 },
    sales: {
      entries: rows.closer.length,
      calls: sum(rows.closer.map((r) => r.dials)),
      booked: sum(rows.closer.map((r) => r.appointments)),
      salesCalls: sum(rows.closer.map((r) => r.sales_calls)),
      sold: sum(rows.closer.map((r) => r.sales_closed)),
    },
    journal: journal.slice(-MAX_JOURNAL),
  }
}

export const COMPARE_SYSTEM_PROMPT = `Jesteś bezpośrednim, rzeczowym trenerem, który porównuje DWA okresy życia jednej osoby: okres A (wybrany) i okres B (punkt odniesienia). Dostajesz liczby (sen, jedzenie, trening, sprzedaż), oceny dnia (1–10), zrobione i niezrobione zadania z planu 5 zadań, jednozdaniowe opinie oraz wpisy z dziennika głosowego.
Zasady:
- Opieraj się WYŁĄCZNIE na przekazanych danych. Nie zgaduj, nie wymyślaj liczb, nie dopowiadaj przyczyn, których dane nie pokazują. Brak danych w okresie nazwij brakiem, nie zerem.
- Każdy punkt musi mieć dowód: konkretne liczby A vs B albo krótki cytat użytkownika. Wnioski o związku (np. sen a ocena dnia) formułuj ostrożnie („w tych okresach szły razem”), bo próba jest mała.
- Nie dodawaj okoliczności, których nie ma w danych (np. przyczyn zmęczenia, rodzaju treningu). Zdanie o tym, co JUŻ się wydarzyło (np. „prawdopodobnie domknąłem w poniedziałek”), nie jest zadaniem na przyszłość: zmiany wyciągaj tylko z liczb albo z tego, co użytkownik zapowiada lub planuje.
- Błonnik w danych to dolna granica (nie każdy produkt ma go w bazie), a jedzenie jest liczone z pełnych dni bez dzisiejszego: nie wyciągaj z samego błonnika mocnych wniosków ani zaleceń. Przy białku i kaloriach odnoś się do celów żywieniowych, jeśli je podano.
- Okres bez wpisów (sprzedaż, jedzenie, sen) to brak danych, więc nie nazywaj tego poprawą ani pogorszeniem. 0 km biegania może znaczyć brak biegów albo brak synchronizacji; nie opieraj na tym jedynym dowodzie mocnych wniosków.
- Pisz po polsku, do użytkownika na „Ty”, krótko i konkretnie. Bez moralizowania, bez diagnoz medycznych i psychologicznych, bez ogólnych porad motywacyjnych.
- "improved": do 3 rzeczy, które w A są wyraźnie lepsze niż w B. "worsened": do 3, które są wyraźnie gorsze. Każda: "title" (krótko) i "evidence" (liczby A vs B lub cytat).
- "changes": do 3 konkretnych zmian na następny okres, wynikających z porównania. Każda: "title" (do 8 słów), "why" (1–2 zdania z dowodem), "how" (jedno konkretne, sprawdzalne działanie, np. godzina, liczba, miejsce w dniu).
- "journal": do 3 różnic w tym, o czym piszesz w dzienniku w A i w B (tematy, ton, powtarzające się zdania). Każda: "title" (temat) i "evidence" (krótki cytat użytkownika, do 160 znaków, z jaką datą jeśli wiesz).
- Tematy intymne lub seksualne nazywaj ogólnie (np. „rozpraszacze”, „impulsy”) i nigdy ich nie cytuj.
- Jeśli danych jest za mało na porównanie, napisz to w "summary" i zwróć puste listy.
- "summary": 2 zdania: co się zmieniło między B a A.
Zwróć wyłącznie JSON: {"summary":string,"improved":[{"title":string,"evidence":string}],"worsened":[{"title":string,"evidence":string}],"changes":[{"title":string,"why":string,"how":string}],"journal":[{"title":string,"evidence":string}]}`

const show = (value: number | null, unit = '') => (value == null ? 'brak' : `${String(value).replace('.', ',')}${unit}`)

/** Okres bez żadnego wpisu sprzedaży to brak danych, a nie sprzedaż równa zero. */
function describeSales(f: PeriodFacts): string {
  if (f.sales.entries === 0) return 'Sprzedaż: brak wpisów z tego okresu (to brak danych, NIE zero)'
  return `Sprzedaż (z ${f.sales.entries} dni z wpisem): rozmowy odebrane ${f.sales.calls}, umówieni ${f.sales.booked}, rozmowy sprzedażowe ${f.sales.salesCalls}, sprzedaże ${f.sales.sold}`
}

function describePeriod(tag: string, f: PeriodFacts): string {
  const categories = Object.entries(f.tasks.byCategory).map(([name, r]) => `${name} ${r.done}/${r.planned}`).join(', ') || 'brak'
  const notes = f.notes.length ? f.notes.map((n) => `  [${n.date}] „${n.text}”`).join('\n') : '  (brak opinii)'
  const journal = f.journal.length ? f.journal.map((j) => `  [${j.date}] ${j.text}`).join('\n') : '  (brak wpisów)'
  return `OKRES ${tag}: ${f.label} (${f.start} do ${f.end}, ${f.days} dni)
Ocena dnia: średnio ${show(f.scoreAvg, '/10')} z ${f.scoredDays} ocenionych dni
Zadania z planu: ${f.tasks.done}/${f.tasks.planned} zrobionych (wg obszarów: ${categories})
Sen: ${show(f.sleep.hours, ' h')}, jakość ${show(f.sleep.score)}, HRV ${show(f.sleep.hrv, ' ms')}, tętno spoczynkowe ${show(f.sleep.rhr, ' bpm')}, gotowość ${show(f.sleep.readiness)}
Jedzenie (średnia z ${f.food.days} pełnych dni z zapisem): ${show(f.food.kcal, ' kcal')}/dzień, białko ${show(f.food.protein, ' g')}, błonnik (dolna granica) ${show(f.food.fiber, ' g')}, jakość ${show(f.food.quality)}
Trening: ${f.training.sessions} sesji siłowych, bieganie ${show(f.training.runKm, ' km')} (0 może znaczyć brak biegów albo brak synchronizacji)
${describeSales(f)}
Opinie o dniach:
${notes}
Dziennik głosowy (Telegram):
${journal}`
}

export interface FoodTargets { kcal: number | null; protein: number | null }

export function buildCompareUserPrompt(a: PeriodFacts, b: PeriodFacts, targets?: FoodTargets): string {
  const goals = targets && (targets.kcal != null || targets.protein != null)
    ? `Cele żywieniowe użytkownika: ${show(targets.kcal ?? null, ' kcal')}/dzień, białko co najmniej ${show(targets.protein ?? null, ' g')}/dzień\n\n`
    : ''
  return `${goals}${describePeriod('A (wybrany)', a)}\n\n${describePeriod('B (punkt odniesienia)', b)}`
}

function text(value: unknown, max: number): string {
  return typeof value === 'string' ? clip(value, max) : ''
}

function items(raw: unknown, titleMax: number, evidenceMax: number): CompareItem[] {
  return (Array.isArray(raw) ? raw : [])
    .map((item): CompareItem => {
      const row = (item ?? {}) as Record<string, unknown>
      return { title: text(row.title, titleMax), evidence: text(row.evidence, evidenceMax) }
    })
    .filter((i) => i.title && i.evidence)
    .slice(0, MAX_ITEMS)
}

/** Turns the model's JSON into what the app renders; null when there is no usable summary. */
export function normalizeCompare(raw: Record<string, unknown> | null): PeriodCompareResult | null {
  if (!raw) return null
  const summary = text(raw.summary, 420)
  if (!summary) return null
  const changes = (Array.isArray(raw.changes) ? raw.changes : [])
    .map((item): CompareChange => {
      const row = (item ?? {}) as Record<string, unknown>
      return { title: text(row.title, 80), why: text(row.why, 260), how: text(row.how, 260) }
    })
    .filter((c) => c.title && c.how)
    .slice(0, MAX_ITEMS)
  return {
    summary,
    improved: items(raw.improved, 80, 220),
    worsened: items(raw.worsened, 80, 220),
    changes,
    journal: items(raw.journal, 80, 200),
  }
}
