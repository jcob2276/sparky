import type { Json } from '../database.types';

export type Pillar = 'cialo' | 'duch' | 'konto';
export const PILLARS: ReadonlyArray<{ key: Pillar; label: string }> = [
  { key: 'cialo', label: 'Ciało' },
  { key: 'duch', label: 'Duch' },
  { key: 'konto', label: 'Konto' },
];

export type PillarScores = Record<Pillar, number>;
export type PillarGoals = Record<Pillar, string>;

/** Rozliczenie celu, z którym wchodziłeś w okres. */
export type GoalStatus = 'done' | 'partial' | 'missed';
export type GoalStatuses = Partial<Record<Pillar, GoalStatus>>;

export interface ReviewAnswers {
  scores: PillarScores;
  goals: PillarGoals;
  note: string;
  /** Tylko filary, które miały poprzedni cel i zostały rozliczone. */
  goalStatus: GoalStatuses;
}

export interface ReviewHistoryEntry {
  weekStart: string;
  scores: Partial<Record<Pillar, number>>;
  goals?: Partial<Record<Pillar, string>> | null;
  commitment?: string | null;
}

export interface ReviewTaskItem {
  id: string;
  title: string;
  done: boolean;
  category?: string | null;
  date?: string | null;
}

export interface ReviewExpenseCategory {
  category: string;
  total: number;
  count: number;
}

export interface ReviewExpenseItem {
  id: string;
  title: string;
  amount: number;
  date: string;
  category?: string | null;
}

export interface ReviewVoiceHighlight {
  id: string;
  content: string;
  createdAt: string;
  isVoice: boolean;
}

/** Jeden dzień tygodnia w liczbach: do paska 7 dni i prostych korelacji. */
export interface ReviewDay {
  date: string;
  /** Własna ocena dnia 1–10 z wieczornego rozliczenia. */
  score: number | null;
  sleepHours: number | null;
  /** Godzina zaśnięcia HH:MM (Warszawa). */
  bedtime: string | null;
  /** Minuty od północy dla zaśnięcia, po północy liczone dalej (00:30 → 24*60+30). */
  bedtimeMinutes: number | null;
  tasksDone: number;
  tasksTotal: number;
  phoneMinutes: number | null;
  hasNote: boolean;
}

/** Cele sprintu, w którym leży przeglądany tydzień: punkt odniesienia dla zadań tygodnia. */
interface ReviewSprintGoals {
  label: string;
  goals: Partial<Record<Pillar, string>>;
  /** Ogólny opis celu sprintu, gdy nie ma rozbicia na filary. */
  summary: string | null;
}

/** Jeden z 12 tygodni sprintu: cele, z którymi wszedłeś, i to, co o nim napisałeś przy zamknięciu. */
export interface LadderWeek {
  weekStart: string;
  /** 1–12 w sprincie. */
  number: number;
  /** Cele tygodnia (ustawione przy zamknięciu poprzedniego). */
  goals: Partial<Record<Pillar, string>>;
  scores: Partial<Record<Pillar, number>>;
  /** Rozliczenie celów tygodnia 🟢🟡🔴. */
  goalStatus: Partial<Record<Pillar, GoalStatus>>;
  /** Jedno zdanie z zamknięcia tygodnia. */
  note: string | null;
  closed: boolean;
  /** Tydzień właśnie przeglądany. */
  current: boolean;
  future: boolean;
}

/** Jeden z 3 miesięcy (bloków po 4 tygodnie) sprintu. */
export interface LadderMonth {
  blockStart: string;
  number: 1 | 2 | 3;
  theme: string | null;
  goals: Partial<Record<Pillar, string>>;
  scores: Partial<Record<Pillar, number>>;
  goalStatus: Partial<Record<Pillar, GoalStatus>>;
  note: string | null;
  closed: boolean;
  current: boolean;
}

/** Cały sprint od góry: cele sprintu → 3 miesiące → 12 tygodni, żeby wszystko było jedną linią. */
export interface ReviewLadder {
  label: string;
  summary: string | null;
  goals: Partial<Record<Pillar, string>>;
  weeks: LadderWeek[];
  months: LadderMonth[];
}

export interface ReviewContext {
  ladder?: ReviewLadder | null;
  sprintGoals?: ReviewSprintGoals | null;
  /** Siedem dni tygodnia w liczbach (tylko przegląd tygodnia). */
  days?: ReviewDay[];
  /** Cele z poprzedniego okresu: to z nimi porównujesz stan. */
  previousGoals: Partial<Record<Pillar, string>> | null;
  /** Oceny z zamkniętych tygodni okresu (lub ostatnich tygodni do średniej). */
  weekScores: Array<{ weekStart: string; scores: Partial<Record<Pillar, number>> }>;
  /** Oceny z zeszłego tygodnia (1 tydzień temu) */
  lastWeekScores?: Partial<Record<Pillar, number>> | null;
  /** Oceny sprzed miesiąca (~4 tygodnie temu) */
  monthAgoScores?: Partial<Record<Pillar, number>> | null;
  /** Historia ostatnich zamkniętych tygodni */
  history?: ReviewHistoryEntry[];
  /** Zadania w tym okresie (ukończone i nieukończone) */
  tasks?: {
    done: ReviewTaskItem[];
    missed: ReviewTaskItem[];
  };
  /** Szczegóły wydatków w tym okresie */
  expenses?: {
    total: number;
    count: number;
    categories: ReviewExpenseCategory[];
    topExpenses: ReviewExpenseItem[];
  };
  /** Zapiski i notatki głosowe ze strumienia w tym okresie */
  voiceHighlights?: ReviewVoiceHighlight[];
  /** Wstępna narracja / synteza AI z weekly_reviews.ai_recap jeśli już istnieje */
  aiRecap?: {
    narrative?: string;
    question?: string;
    longterm_motif?: string | null;
  } | null;
}

/** Średnia ocen filaru z zamkniętych tygodni okresu, do porównania z własną oceną. */
export function averageScore(weekScores: ReviewContext['weekScores'], pillar: Pillar): number | null {
  const values = weekScores.map((w) => w.scores[pillar]).filter((v): v is number => typeof v === 'number');
  if (values.length === 0) return null;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
}

export const asScores = (raw: Json | null | undefined): Partial<Record<Pillar, number>> => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: Partial<Record<Pillar, number>> = {};
  for (const { key } of PILLARS) {
    const value = (raw as Record<string, unknown>)[key];
    if (typeof value === 'number' && Number.isFinite(value)) out[key] = value;
  }
  return out;
};
