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

/** PDF idzie bez kompresji, więc ma twardy limit rozmiaru; zdjęcia są zmniejszane przed wysyłką. */
const MAX_PDF_BYTES = 6_000_000;

export const isPdfFile = (file: Pick<File, 'type' | 'name'>): boolean => file.type === 'application/pdf' || /\.pdf$/i.test(file.name);

export async function scanLabPhoto(file: File, userId: string): Promise<ParseLabResultsResponse> {
  const pdf = isPdfFile(file);
  if (pdf && file.size > MAX_PDF_BYTES) throw new Error('PDF jest za duży (limit 6 MB). Zrób zdjęcie wyniku albo wyślij mniejszy plik.');
  const payload = pdf ? file : await prepareVisionUpload(file, { maxDim: 1800, quality: 0.82 });
  const imageBase64 = await blobToBase64(payload);
  return invokeEdge('parse-lab-results', {
    body: { userId, mimeType: pdf ? 'application/pdf' : 'image/jpeg', imageBase64 },
    signal: AbortSignal.timeout(TIMEOUTS.llmHeavy),
  });
}
