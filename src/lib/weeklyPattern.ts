import type { ImpactFactor } from '@vanguard/domain';

/** Ile najlepszych zależności bierze udział w cotygodniowej rotacji. */
const ROTATION_SIZE = 5;

const dayIndex = (date: string) => Math.round(new Date(`${date}T12:00:00Z`).getTime() / 86_400_000);

/**
 * Jedna zależność na tydzień: spośród kilku najmocniejszych (lista jest już posortowana po wartości dla decyzji) bierze
 * kolejną co tydzień, żeby karta nie powtarzała w kółko tego samego wniosku. Ten sam tydzień zawsze daje ten sam wybór.
 */
export function pickWeeklyPattern(signals: ImpactFactor[], weekStart: string): ImpactFactor | null {
  const pool = signals.filter((s) => s.evidence_level === 'confirmed' || s.evidence_level === 'probable').slice(0, ROTATION_SIZE);
  if (pool.length === 0) return null;
  return pool[Math.floor(dayIndex(weekStart) / 7) % pool.length];
}

const EVIDENCE_LABEL: Record<ImpactFactor['evidence_level'], string> = {
  confirmed: 'pewny wzorzec',
  probable: 'wyraźny sygnał',
  hypothesis: 'słaby sygnał',
  no_evidence: 'brak dowodu',
};

export function lagText(lag: number): string {
  if (lag === 0) return 'tego samego dnia';
  if (lag === 1) return 'następnego dnia';
  return `${lag} dni później`;
}

/** Podpis pod wnioskiem: skąd to wiadomo i jak mocno, bez żargonu statystycznego. */
export function patternMeta(factor: ImpactFactor): string {
  return `${factor.n} dni danych · ${EVIDENCE_LABEL[factor.evidence_level]} · efekt ${lagText(factor.lag_days)}`;
}
