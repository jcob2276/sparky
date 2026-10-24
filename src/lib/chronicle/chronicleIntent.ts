import type { ChroniclePeriod } from './periods';
import type { ChronicleGoal } from './summaryTypes';

/** Co ustawić w Kronice, gdy ktoś tam trafia ze skrótu (np. z zakładki Tydzień). */
export interface ChronicleIntent {
  goal: ChronicleGoal;
  period: ChroniclePeriod;
  /** Ile okresów wstecz od bieżącego (0 = bieżący). */
  offset: number;
  compareOffset: number;
}

let pending: ChronicleIntent | null = null;
const listeners = new Set<() => void>();

/**
 * Kronika może jeszcze nie być zamontowana (ładuje się przy pierwszym wejściu), więc zamiar czeka tutaj,
 * aż zostanie odebrany, zamiast ginąć jak zdarzenie wysłane w próżnię.
 */
export function requestChronicle(intent: ChronicleIntent): void {
  pending = intent;
  listeners.forEach((listener) => listener());
}

export function takeChronicleIntent(): ChronicleIntent | null {
  const intent = pending;
  pending = null;
  return intent;
}

export function subscribeChronicleIntent(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
