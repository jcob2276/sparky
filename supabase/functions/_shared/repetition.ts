export interface PastEntry {
  date: string
  text: string
}

export interface RepetitionResult {
  repeated: boolean
  /** Ile porównanych wpisów jest podobnych do dzisiejszego. */
  matches: number
  best: { date: string; similarity: number } | null
  compared: number
}

const MIN_TOKENS = 8
const MIN_PAST_CHARS = 60
const SIMILAR_AT = 0.45
const VERY_SIMILAR_AT = 0.7
const MATCHES_TO_ALARM = 2
const PREFIX = 5

/** Słowa bez znaczenia dla treści (po obcięciu do 5 liter i tak łączą odmiany, więc tylko najczęstsze). */
const STOPWORDS = new Set([
  'dzisi', 'wczor', 'jeste', 'było', 'była', 'które', 'który', 'która', 'kiedy', 'teraz', 'jeszc', 'trochę', 'bardz',
  'tylko', 'przez', 'żeby', 'może', 'mogę', 'mimo', 'bo', 'ale', 'albo', 'oraz', 'tego', 'tych', 'tutaj', 'także', 'ogóln',
])

/** Zbiór „rdzeni” słów: małe litery, bez interpunkcji, słowa od 4 liter obcięte do 5, bez słów pustych. */
function contentTokens(text: string): Set<string> {
  const tokens = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 4)
    .map((w) => w.slice(0, PREFIX))
    .filter((w) => !STOPWORDS.has(w))
  return new Set(tokens)
}

export function similarity(a: string, b: string): number {
  const x = contentTokens(a)
  const y = contentTokens(b)
  if (x.size === 0 || y.size === 0) return 0
  let shared = 0
  for (const token of x) if (y.has(token)) shared++
  return shared / (x.size + y.size - shared)
}

/**
 * Czy dzisiejszy wpis powtarza poprzednie: alarm, gdy co najmniej 2 wcześniejsze wpisy są podobne (≥45% wspólnych słów)
 * albo jeden jest niemal taki sam (≥70%). Krótkie wpisy (poniżej 8 słów treści) nie są porównywane.
 */
export function detectRepetition(current: string, past: PastEntry[]): RepetitionResult {
  const candidates = past.filter((p) => p.text.trim().length >= MIN_PAST_CHARS)
  const empty: RepetitionResult = { repeated: false, matches: 0, best: null, compared: candidates.length }
  if (contentTokens(current).size < MIN_TOKENS) return empty
  let best: RepetitionResult['best'] = null
  let matches = 0
  for (const entry of candidates) {
    const s = similarity(current, entry.text)
    if (s >= SIMILAR_AT) matches++
    if (!best || s > best.similarity) best = { date: entry.date, similarity: Math.round(s * 100) / 100 }
  }
  const repeated = matches >= MATCHES_TO_ALARM || (best?.similarity ?? 0) >= VERY_SIMILAR_AT
  return { repeated, matches, best, compared: candidates.length }
}

/** Pytania, które wymuszają inną odpowiedź niż „dzisiaj było tak samo”. Wybór zmienia się z dnia na dzień. */
export const FRESH_QUESTIONS = [
  'Co dziś zrobiłeś INACZEJ niż wczoraj, choćby drobiazg?',
  'Jedna decyzja, którą dziś odłożyłeś. Dlaczego i co by się stało, gdybyś ją podjął od razu?',
  'Jaki jeden drobny dowód z dziś pokazuje, że stajesz się kimś, kim chcesz być?',
  'Co zrobiłeś w chwili, gdy poczułeś opór? Konkretnie, krok po kroku.',
  'Gdybyś miał powtórzyć ten dzień, jedną rzecz robisz inaczej. Którą?',
  'Czego dziś unikałeś i ile to Cię kosztowało (czas, energia, pieniądze)?',
  'Co dziś Cię zaskoczyło, czego nie przewidziałeś rano?',
  'Za rok spojrzysz na dzisiejszy dzień. Co z niego będzie warte zapamiętania?',
]

export function pickFreshQuestion(date: string): string {
  const day = Math.floor(new Date(`${date}T12:00:00Z`).getTime() / 86_400_000)
  return FRESH_QUESTIONS[((day % FRESH_QUESTIONS.length) + FRESH_QUESTIONS.length) % FRESH_QUESTIONS.length]
}

export function repetitionMessage(result: RepetitionResult, today: string): string {
  const best = result.best
  const [, month, day] = (best?.date ?? '').split('-')
  const when = best && month && day ? ` (najbardziej jak z ${day}.${month}, ok. ${Math.round(best.similarity * 100)}% wspólnych słów)` : ''
  const count = result.matches >= MATCHES_TO_ALARM ? `${result.matches} z Twoich wpisów z ostatnich dni` : 'jeden z Twoich wpisów z ostatnich dni'
  return `🔁 To brzmi prawie tak samo jak ${count}${when}. Powtarzanie tych samych słów rzadko zmienia zachowanie.\n\nJedno nowe pytanie na dziś: ${pickFreshQuestion(today)}`
}
