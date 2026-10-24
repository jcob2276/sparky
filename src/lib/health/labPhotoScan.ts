import { TIMEOUTS } from '../constants';
import { blobToBase64 } from '../imageEncoding';
import { prepareVisionUpload } from '../imageThumbnail';
import { invokeEdge } from '../supabase';
import type { ParseLabResultsResponse } from '../edgeTypes';

export interface LabEntryDraft {
  markerName: string;
  value: string;
  unit: string;
  refLow: string;
  refHigh: string;
  category: string;
}

const text = (value: number | null): string => (value === null ? '' : String(value));

/** Odczyt z modelu → wiersze kreatora jako tekst do edycji; użytkownik poprawia i zatwierdza, nic nie trafia do bazy samo. */
export function draftsFromScan(scan: ParseLabResultsResponse): LabEntryDraft[] {
  return scan.results.map((r) => ({
    markerName: r.marker_name,
    value: String(r.value),
    unit: r.unit,
    refLow: text(r.ref_low),
    refHigh: text(r.ref_high),
    category: r.category ?? '',
  }));
}

export function describeLabScanError(cause: unknown): string {
  const message = cause instanceof Error ? cause.message : String(cause);
  if (/not found|404|failed to send a request/i.test(message)) return 'Odczyt zdjęć nie jest jeszcze dostępny. Wpisz wyniki ręcznie.';
  return message || 'Nie udało się odczytać wyników ze zdjęcia.';
}

export async function scanLabPhoto(file: File, userId: string): Promise<ParseLabResultsResponse> {
  const image = await prepareVisionUpload(file, { maxDim: 1800, quality: 0.82 });
  const imageBase64 = await blobToBase64(image);
  return invokeEdge('parse-lab-results', {
    body: { userId, mimeType: 'image/jpeg', imageBase64 },
    signal: AbortSignal.timeout(TIMEOUTS.llmHeavy),
  });
}
