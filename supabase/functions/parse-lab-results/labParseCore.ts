const MAX_RESULTS = 80
const DATE = /^\d{4}-\d{2}-\d{2}$/

interface ParsedLabResult {
  marker_name: string
  value: number
  unit: string
  ref_low: number | null
  ref_high: number | null
  category: string | null
}

export interface ParsedLabDocument {
  resultDate: string | null
  provider: string | null
  results: ParsedLabResult[]
}

export const LAB_PARSE_PROMPT = `Dostajesz zdjęcie lub skan wyniku badań laboratoryjnych (po polsku). Odczytaj z niego wszystkie wyniki liczbowe.
Zwróć WYŁĄCZNIE JSON: {"resultDate":"RRRR-MM-DD" lub null,"provider":string lub null,"results":[{"marker_name":string,"value":number,"unit":string,"ref_low":number lub null,"ref_high":number lub null,"category":string lub null}]}
Zasady:
- Przepisuj dokładnie to, co widać. Niczego nie zgaduj i nie uzupełniaj z pamięci: jeśli wartości nie da się odczytać, pomiń ten wiersz.
- "value" to liczba (przecinek dziesiętny zamień na kropkę). Wyniki opisowe bez liczby (np. "ujemny") pomiń.
- "resultDate" to data pobrania lub wykonania badania z dokumentu; jeśli jej nie widać, null.
- "ref_low" i "ref_high" to granice zakresu referencyjnego z dokumentu. Dla zapisu "< 5" daj ref_low null i ref_high 5, dla "> 30" ref_low 30 i ref_high null.
- "category" tylko jeśli dokument grupuje badania (np. "Morfologia", "Lipidogram"), inaczej null.
- Nie dodawaj interpretacji ani diagnoz.`

const clean = (value: unknown, max: number): string => (typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : '')

function toNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value !== 'string') return null
  const parsed = Number(value.replace(',', '.').trim())
  return value.trim() !== '' && Number.isFinite(parsed) ? parsed : null
}

/** Odpowiedź modelu → bezpieczna lista do ręcznego zatwierdzenia; wiersze bez nazwy lub liczby odpadają. */
export function normalizeLabParse(raw: unknown): ParsedLabDocument | null {
  if (typeof raw !== 'object' || raw === null) return null
  const doc = raw as Record<string, unknown>
  const rows = Array.isArray(doc.results) ? doc.results : []
  const results = rows.flatMap((row): ParsedLabResult[] => {
    if (typeof row !== 'object' || row === null) return []
    const r = row as Record<string, unknown>
    const name = clean(r.marker_name, 80)
    const value = toNumber(r.value)
    if (!name || value === null) return []
    return [{ marker_name: name, value, unit: clean(r.unit, 20), ref_low: toNumber(r.ref_low), ref_high: toNumber(r.ref_high), category: clean(r.category, 40) || null }]
  }).slice(0, MAX_RESULTS)
  const date = clean(doc.resultDate, 10)
  return { resultDate: DATE.test(date) ? date : null, provider: clean(doc.provider, 60) || null, results }
}
