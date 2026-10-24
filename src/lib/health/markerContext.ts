import { shiftDateStr } from '../date';
import { completedNutritionDays } from '../chronicle/nutritionDays';

export type MarkerContextKind = 'iron' | 'hormone' | 'metabolic';

export interface MarkerContextRows {
  runKm: Array<{ date: string; value: number }>;
  strengthDates: string[];
  sleep: Array<{ date: string; hours: number | null; hrv: number | null }>;
  nutrition: Array<{ date: string; calories: number | null; protein: number | null }>;
}

export interface MarkerContext {
  title: string;
  from: string;
  to: string;
  lines: string[];
}

const IRON = /ferryt|ferrit|hemoglobin|hematokryt|hematocrit|erytrocyt|rbc|mcv|ż?elazo|iron|transferyn/i;
const HORMONE = /testosteron|tsh|kortyzol|cortisol|shbg|estradiol|prolaktyn/i;
const METABOLIC = /glukoz|glucose|cholesterol|ldl|hdl|trójglicer|triglycer|hba1c|insulin|insulin/i;

/** Które markery mają sens zestawić z treningiem, snem albo jedzeniem; reszta nie dostaje kontekstu. */
export function contextKindFor(markerKey: string, markerName: string): MarkerContextKind | null {
  const text = `${markerKey} ${markerName}`;
  if (IRON.test(text)) return 'iron';
  if (HORMONE.test(text)) return 'hormone';
  if (METABOLIC.test(text)) return 'metabolic';
  return null;
}

const WINDOW_DAYS: Record<MarkerContextKind, number> = { iron: 56, hormone: 30, metabolic: 30 };

/** Okno danych kończy się w dniu badania, bo to ono tłumaczy wynik, a nie to, co było potem. */
export function contextWindow(kind: MarkerContextKind, resultDate: string): { from: string; to: string } {
  return { from: shiftDateStr(resultDate, -(WINDOW_DAYS[kind] - 1)), to: resultDate };
}

const round1 = (value: number) => Math.round(value * 10) / 10;
const fmt = (value: number, unit = '') => `${String(round1(value)).replace('.', ',')}${unit}`;
const mean = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : null);
const inRange = (date: string, from: string, to: string) => date >= from && date <= to;

function ironLines(rows: MarkerContextRows, from: string, to: string): string[] {
  const km = rows.runKm.filter((r) => inRange(r.date, from, to));
  const weeks = WINDOW_DAYS.iron / 7;
  const total = km.reduce((a, b) => a + b.value, 0);
  const strength = rows.strengthDates.filter((d) => inRange(d, from, to)).length;
  const lines = [km.length ? `Bieganie: ${fmt(total, ' km')} w ${km.length} biegach (średnio ${fmt(total / weeks, ' km')} tygodniowo).` : 'Bieganie: brak biegów w tym oknie.'];
  lines.push(`Trening siłowy: ${strength} sesji w ${WINDOW_DAYS.iron / 7} tygodniach.`);
  return lines;
}

function hormoneLines(rows: MarkerContextRows, from: string, to: string): string[] {
  const nights = rows.sleep.filter((r) => inRange(r.date, from, to));
  const hours = nights.flatMap((r) => (r.hours && r.hours > 0 ? [r.hours] : []));
  const hrv = nights.flatMap((r) => (r.hrv && r.hrv > 0 ? [r.hrv] : []));
  if (!hours.length) return ['Sen: brak danych z Oura w tym oknie.'];
  const short = hours.filter((h) => h < 6).length;
  const lines = [`Sen: średnio ${fmt(mean(hours) ?? 0, ' h')} z ${hours.length} nocy, w tym ${short} krótszych niż 6 h.`];
  if (hrv.length) lines.push(`HRV: średnio ${fmt(mean(hrv) ?? 0, ' ms')}.`);
  return lines;
}

function metabolicLines(rows: MarkerContextRows, from: string, to: string, today: string): string[] {
  const days = completedNutritionDays(rows.nutrition.filter((r) => inRange(r.date, from, to)), today);
  if (!days.length) return ['Jedzenie: brak pełnych dni z zapisem w tym oknie.'];
  const protein = days.flatMap((r) => (r.protein != null ? [r.protein] : []));
  const lines = [`Jedzenie: średnio ${fmt(mean(days.map((r) => r.calories ?? 0)) ?? 0, ' kcal')} dziennie z ${days.length} pełnych dni.`];
  if (protein.length) lines.push(`Białko: średnio ${fmt(mean(protein) ?? 0, ' g')} dziennie.`);
  return lines;
}

const TITLES: Record<MarkerContextKind, string> = {
  iron: 'Trening w tym okresie',
  hormone: 'Sen przed badaniem',
  metabolic: 'Jedzenie przed badaniem',
};

/** Dane z okresu poprzedzającego badanie, podane jako fakty; bez wniosków o przyczynie wyniku. */
export function buildMarkerContext(kind: MarkerContextKind, rows: MarkerContextRows, resultDate: string, today: string): MarkerContext {
  const { from, to } = contextWindow(kind, resultDate);
  const lines = kind === 'iron' ? ironLines(rows, from, to) : kind === 'hormone' ? hormoneLines(rows, from, to) : metabolicLines(rows, from, to, today);
  return { title: TITLES[kind], from, to, lines };
}
