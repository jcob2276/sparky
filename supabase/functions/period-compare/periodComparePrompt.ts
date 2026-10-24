import { MIN_FULL_DAY_KCAL } from '@vanguard/domain'
import { MAX_ITEMS, clip, type CompareChange, type CompareItem, type PeriodCompareResult, type PeriodFacts } from './periodCompareCore.ts'

export const COMPARE_SYSTEM_PROMPT = `Jesteś bezpośrednim, rzeczowym trenerem, który porównuje DWA okresy życia jednej osoby: okres A (wybrany) i okres B (punkt odniesienia). Dostajesz liczby (sen, jedzenie, trening, sprzedaż), oceny dnia (1–10), zrobione i niezrobione zadania z planu 5 zadań, jednozdaniowe opinie oraz wpisy z dziennika głosowego.
Zasady:
- Opieraj się WYŁĄCZNIE na przekazanych danych. Nie zgaduj, nie wymyślaj liczb, nie dopowiadaj przyczyn, których dane nie pokazują. Brak danych w okresie nazwij brakiem, nie zerem.
- Każdy punkt musi mieć dowód: konkretne liczby A vs B albo krótki cytat użytkownika. Wnioski o związku (np. sen a ocena dnia) formułuj ostrożnie („w tych okresach szły razem”), bo próba jest mała.
- Nie dodawaj okoliczności, których nie ma w danych (np. przyczyn zmęczenia, rodzaju treningu). Zdanie o tym, co JUŻ się wydarzyło (np. „prawdopodobnie domknąłem w poniedziałek”), nie jest zadaniem na przyszłość: zmiany wyciągaj tylko z liczb albo z tego, co użytkownik zapowiada lub planuje.
- Błonnik w danych to dolna granica (nie każdy produkt ma go w bazie), a jedzenie jest liczone z pełnych dni bez dzisiejszego: nie wyciągaj z samego błonnika mocnych wniosków ani zaleceń. Przy białku i kaloriach odnoś się do celów żywieniowych, jeśli je podano.
- Brak wpisów lub danych tylko w JEDNYM okresie to uwaga o danych (wspomnij o niej w „summary”), a nie zalecenie dla użytkownika: nie każ „zapisywać” czegoś, co użytkownik już zapisuje, tylko w drugim okresie jeszcze nie zapisywał.
- Przy śnie podawaj konkretne noce i godziny z danych (zasypianie, pobudka, krótkie noce z datami), a nie ogólne „śpij dłużej”. Zalecenie o śnie ma wynikać z jego rzeczywistych godzin.
- Okres bez wpisów (sprzedaż, jedzenie, sen) to brak danych, więc nie nazywaj tego poprawą ani pogorszeniem. Przy bieganiu: gdy dane mówią, że Strava jest zsynchronizowana, 0 km to prawdziwy brak biegów (można to nazwać pogorszeniem, jeśli w drugim okresie biegi były); w przeciwnym razie nie opieraj na samym zerze mocnych wniosków.
- Zalecenie nie może przeczyć własnemu tytułowi: liczby w tytule i w kroku mają być spójne (nie pisz „jedna sesja więcej”, a w kroku „trzy sesje”). Nie zalecaj więcej czegoś, co w A jest już lepsze niż w B, chyba że dane pokazują lukę względem celu lub planu użytkownika.
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
function describeSleep(f: PeriodFacts): string {
  const s = f.sleep
  const timing = s.bedtime
    ? `zasypianie średnio ${s.bedtime}${s.bedtimeSpreadMin != null ? ` (rozrzut ±${s.bedtimeSpreadMin} min)` : ''}, pobudka średnio ${s.wake ?? 'brak'}`
    : 'godziny snu: brak'
  const short = s.shortNights.length
    ? `krótkie noce (<6 h, data pobudki): ${s.shortNights.map((n) => `${n.date} ${show(n.hours, ' h')}`).join(', ')}`
    : 'brak nocy krótszych niż 6 h'
  return `Sen: ${show(s.hours, ' h')}, jakość ${show(s.score)}, HRV ${show(s.hrv, ' ms')}, tętno spoczynkowe ${show(s.rhr, ' bpm')}, gotowość ${show(s.readiness)}
Szczegóły snu: ${timing}; ${short}; zasypianie trwa ${show(s.latency, ' min')}, sen głęboki ${show(s.deepHours, ' h')}, REM ${show(s.remHours, ' h')}, wydajność ${show(s.efficiency, '%')}`
}

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
${describeSleep(f)}
Jedzenie (średnia z ${f.food.days} pełnych dni; dni poniżej ${MIN_FULL_DAY_KCAL} kcal i dzisiejszy pominięto jako niepełne zapisy): ${show(f.food.kcal, ' kcal')}/dzień, białko ${show(f.food.protein, ' g')}, błonnik (dolna granica) ${show(f.food.fiber, ' g')}, jakość ${show(f.food.quality)}
Trening: ${f.training.sessions} sesji siłowych, bieganie ${show(f.training.runKm, ' km')} ${f.training.stravaFresh ? '(Strava jest zsynchronizowana, więc 0 km to brak biegów)' : '(0 może znaczyć brak biegów albo brak synchronizacji)'}
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
