export type ReasonTone = 'good' | 'neutral' | 'watch' | 'bad';

interface ReadinessSignalInput {
  key: string;
  flag: string;
  detail: string;
}

export interface ReadinessInput {
  level: string | null | undefined;
  mainLimiter?: string | null;
  signals?: ReadinessSignalInput[] | null;
  /** Last night's sleep score, 0–100. */
  sleepScore?: number | null;
  /** Negative = sleep deficit in hours (matches the daily strain components). */
  sleepDebtH?: number | null;
}

interface ReadinessReason {
  key: string;
  tone: ReasonTone;
  text: string;
}

export interface ReadinessBrief {
  tone: ReasonTone;
  headline: string;
  advice: string;
  /** One sentence naming what pulls the day down, without repeating the numbers shown in the tiles. Null when nothing does. */
  drivers: string | null;
  reasons: ReadinessReason[];
}

const MAX_REASONS = 3;
const TONE_ORDER: Record<ReasonTone, number> = { bad: 0, watch: 1, good: 2, neutral: 3 };

const VERDICTS: Record<string, Omit<ReadinessBrief, 'reasons' | 'drivers'>> = {
  primed: { tone: 'good', headline: 'Gotowy na mocny dzień', advice: 'Organizm jest dobrze zregenerowany. Możesz zrobić ciężki trening.' },
  balanced: { tone: 'neutral', headline: 'Normalny dzień', advice: 'Nic nie ostrzega. Trenuj według planu.' },
  strained: { tone: 'watch', headline: 'Dziś lżej', advice: 'Organizm jest zmęczony. Wybierz lżejszy trening albo odpoczynek.' },
  rundown: { tone: 'bad', headline: 'Dziś odpoczywaj', advice: 'Wyraźne zmęczenie. Odpuść intensywny trening i połóż się wcześniej.' },
};
const NO_DATA: Omit<ReadinessBrief, 'reasons' | 'drivers'> = {
  tone: 'neutral',
  headline: 'Za mało danych',
  advice: 'Potrzeba kilku dni pomiarów z Oura, żeby ocenić Twoją gotowość.',
};

export function formatHours(hours: number): string {
  const totalMinutes = Math.round(Math.abs(hours) * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

function toneOf(flag: string): ReasonTone {
  return flag === 'good' || flag === 'watch' || flag === 'bad' ? flag : 'neutral';
}

function sleepReason(score: number): ReadinessReason {
  const n = Math.round(score);
  if (score >= 85) return { key: 'sleep', tone: 'good', text: `Sen był bardzo dobry (${n}/100).` };
  if (score >= 70) return { key: 'sleep', tone: 'neutral', text: `Sen był w normie (${n}/100).` };
  if (score >= 55) return { key: 'sleep', tone: 'watch', text: `Sen był przeciętny (${n}/100).` };
  return { key: 'sleep', tone: 'bad', text: `Sen był słaby (${n}/100).` };
}

const SIGNAL_TEXT: Record<string, Record<ReasonTone, string | null>> = {
  hrv: {
    good: 'Zmienność rytmu serca (HRV) wyższa niż zwykle, czyli dobra regeneracja.',
    neutral: 'Zmienność rytmu serca (HRV) w Twojej normie.',
    watch: 'Zmienność rytmu serca (HRV) trochę niższa niż zwykle.',
    bad: 'Zmienność rytmu serca (HRV) wyraźnie niższa niż zwykle, czyli organizm jest zmęczony.',
  },
  rhr: {
    good: 'Tętno spoczynkowe niskie, co jest dobrym znakiem.',
    neutral: 'Tętno spoczynkowe w normie.',
    watch: 'Tętno spoczynkowe trochę podwyższone.',
    bad: 'Tętno spoczynkowe podwyższone. To może znaczyć przemęczenie albo początek infekcji.',
  },
  respRate: {
    good: null,
    neutral: null,
    watch: 'Oddech w nocy szybszy niż zwykle.',
    bad: 'Oddech w nocy wyraźnie szybszy niż zwykle. To może być wczesny sygnał infekcji.',
  },
  monotony: {
    good: null,
    neutral: null,
    watch: 'Każdy dzień wygląda podobnie. Urozmaić bodźce treningowe.',
    bad: 'Każdy dzień wygląda podobnie. Urozmaić bodźce treningowe.',
  },
};

function acwrReason(signal: ReadinessSignalInput): ReadinessReason | null {
  const ratio = Number.parseFloat(/ACWR\s*([0-9]+(?:\.[0-9]+)?)/i.exec(signal.detail)?.[1] ?? '');
  if (!Number.isFinite(ratio)) return null;
  if (ratio < 0.8) return { key: 'load', tone: 'neutral', text: 'Trenowałeś ostatnio mniej niż zwykle, więc możesz dołożyć obciążenia.' };
  if (ratio < 1.3) return { key: 'load', tone: 'good', text: 'Obciążenie treningowe w sam raz.' };
  if (ratio < 1.5) return { key: 'load', tone: 'watch', text: 'Obciążenie rośnie szybko. Obserwuj samopoczucie.' };
  return { key: 'load', tone: 'bad', text: 'Gwałtowny skok obciążenia. Rośnie ryzyko kontuzji.' };
}

function signalReason(signal: ReadinessSignalInput): ReadinessReason | null {
  if (signal.key === 'acwr') return acwrReason(signal);
  const tone = toneOf(signal.flag);
  const text = SIGNAL_TEXT[signal.key]?.[tone];
  return text ? { key: signal.key, tone, text } : null;
}

const DRIVER_PHRASE: Record<string, string> = {
  hrv: 'niskie HRV',
  rhr: 'podwyższone tętno spoczynkowe',
  respRate: 'szybszy oddech w nocy',
  load: 'skok obciążenia',
  monotony: 'monotonny trening',
};

function buildDrivers(reasons: ReadinessReason[], sleepDebtH: number | null | undefined): string | null {
  const phrases = reasons
    .filter((r) => r.tone === 'watch' || r.tone === 'bad')
    .map((r) => {
      if (r.key === 'sleep') return r.tone === 'bad' ? 'słaby sen' : 'przeciętny sen';
      if (r.key === 'sleepDebt' && sleepDebtH != null) return `dług snu ${formatHours(sleepDebtH)}`;
      return DRIVER_PHRASE[r.key];
    })
    .filter((p): p is string => !!p)
    .slice(0, 2);
  if (phrases.length === 0) return null;
  return `Najmocniej ciągną w dół: ${phrases.join(' i ')}.`;
}

/** Turns the stored readiness data into one verdict, one sentence of advice and up to three plain-language reasons. */
export function buildReadinessBrief(input: ReadinessInput): ReadinessBrief {
  const verdict = (input.level && VERDICTS[input.level]) || NO_DATA;
  const reasons: ReadinessReason[] = [];

  if (input.sleepScore != null && Number.isFinite(input.sleepScore)) reasons.push(sleepReason(input.sleepScore));
  if (input.sleepDebtH != null && input.sleepDebtH <= -1) {
    reasons.push({ key: 'sleepDebt', tone: input.sleepDebtH <= -3 ? 'bad' : 'watch', text: `Brakuje Ci ${formatHours(input.sleepDebtH)} snu z ostatnich dni.` });
  }
  for (const signal of input.signals ?? []) {
    const reason = signalReason(signal);
    if (reason) reasons.push(reason);
  }

  const sleepFirst = input.mainLimiter === 'sleep';
  reasons.sort((a, b) => {
    if (sleepFirst && (a.key === 'sleep') !== (b.key === 'sleep')) return a.key === 'sleep' ? -1 : 1;
    return TONE_ORDER[a.tone] - TONE_ORDER[b.tone];
  });

  return { ...verdict, drivers: buildDrivers(reasons, input.sleepDebtH), reasons: reasons.slice(0, MAX_REASONS) };
}
