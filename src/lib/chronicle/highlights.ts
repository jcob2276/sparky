import type { ChronicleGoal, ChronicleSummaryData, ChronicleTile } from './summaryTypes';

/** Które kafelki Kroniki są skrótem tygodnia (po etykiecie, żeby nie zależeć od ich kolejności). */
export const WEEK_HIGHLIGHTS: Array<{ goal: ChronicleGoal; labels: string[] }> = [
  { goal: 'duch', labels: ['Wszystkie zwycięstwa'] },
  { goal: 'konto', labels: ['Umówieni', 'Sprzedaże'] },
  { goal: 'cialo', labels: ['Treningi', 'Sen', 'Jakość snu', 'Kalorie / dzień', 'Białko / dzień'] },
];

/** Wybrane kafelki w podanej kolejności; brak podsumowania lub kafelka to po prostu pusta lista, nie wyjątek. */
export function pickTiles(summary: ChronicleSummaryData | null, labels: string[]): ChronicleTile[] {
  if (!summary) return [];
  return labels.flatMap((label) => summary.tiles.filter((tile) => tile.label === label));
}
