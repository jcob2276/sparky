import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { getTodayWarsaw } from '../date';
import type { Database } from '../database.types';

export type MedicalLabRow = {
  id: string;
  result_date: string;
  marker_key: string;
  marker_name: string;
  category: string | null;
  value: number;
  unit: string | null;
  ref_low: number | null;
  ref_high: number | null;
  ref_text: string | null;
  flag: string | null;
  source_name: string;
  provider: string | null;
  notes: string | null;
};


export type BodyCompositionRow = {
  id: string;
  measured_at: string;
  source: string;
  method: string;
  reliability: string;
  weight_kg: number | null;
  body_fat_pct: number | null;
  fat_mass_kg: number | null;
  muscle_mass_kg: number | null;
  visceral_fat_rating: number | null;
  bmi: number | null;
  bmr_kcal: number | null;
  notes: string | null;
};

export type LabFreshness = 'current' | 'recent' | 'stale' | 'old' | 'unknown';

export type MarkerSeries = {
  marker_key: string;
  marker_name: string;
  category: string | null;
  unit: string | null;
  ref_low: number | null;
  ref_high: number | null;
  ref_text: string | null;
  latest: MedicalLabRow;
  prior: MedicalLabRow | null;
  history: MedicalLabRow[];
};

export function diffDaysFromToday(dateStr: string): number | null {
  const today = getTodayWarsaw();
  const d = new Date(`${dateStr.slice(0, 10)}T12:00:00Z`).getTime();
  const t = new Date(`${today}T12:00:00Z`).getTime();
  if (!Number.isFinite(d) || !Number.isFinite(t)) return null;
  return Math.round((t - d) / 86400000);
}

export function labFreshness(ageDays: number | null): LabFreshness {
  if (ageDays == null || ageDays < 0) return 'unknown';
  if (ageDays <= 90) return 'current';
  if (ageDays <= 180) return 'recent';
  if (ageDays <= 365) return 'stale';
  return 'old';
}

export function freshnessLabel(f: LabFreshness): string {
  switch (f) {
    case 'current':
      return 'świeże';
    case 'recent':
      return 'niedawne';
    case 'stale':
      return 'stare';
    case 'old':
      return 'archiwum';
    default:
      return '—';
  }
}

function canonicalCategory(rawCategory: string | null | undefined): string {
  if (!rawCategory) return 'Inne';
  const norm = rawCategory.trim().toLowerCase();

  if (norm.includes('żelaz') || norm.includes('zelaz') || norm === 'iron_status' || norm === 'iron') {
    return 'Gospodarka żelazem';
  }
  if (norm.includes('morfolog') || norm.includes('hematolog') || norm === 'hematology') {
    return 'Morfologia krwi';
  }
  if (norm.includes('lipid') || norm === 'lipids') {
    return 'Lipidogram';
  }
  if (norm.includes('glukoz') || norm.includes('cukier') || norm.includes('metabol') || norm === 'metabolic') {
    return 'Metabolizm i glukoza';
  }
  if (norm.includes('tarczyc') || norm === 'thyroid') {
    return 'Tarczyca';
  }
  if (norm.includes('hormon') || norm === 'hormones') {
    return 'Hormony';
  }
  if (norm.includes('witamin') || norm === 'vitamins') {
    return 'Witaminy';
  }
  if (norm.includes('miner') || norm.includes('elektrolit') || norm === 'minerals') {
    return 'Elektrolity i minerały';
  }
  if (norm.includes('wątrob') || norm.includes('watrob') || norm === 'liver') {
    return 'Próby wątrobowe';
  }
  if (norm.includes('nerk') || norm === 'renal' || norm === 'kidney') {
    return 'Funkcja nerek';
  }
  if (norm.includes('mocz') || norm === 'urine') {
    return 'Badanie moczu';
  }

  return rawCategory.charAt(0).toUpperCase() + rawCategory.slice(1);
}

export function formatMedicalDate(dateStr: string): string {
  try {
    return format(new Date(`${dateStr.slice(0, 10)}T12:00:00Z`), 'd MMM yyyy', { locale: pl });
  } catch {
    return dateStr.slice(0, 10);
  }
}

export function buildMarkerSeries(rows: MedicalLabRow[]): MarkerSeries[] {
  const byKey = new Map<string, MedicalLabRow[]>();
  for (const row of rows) {
    const canonical = canonicalCategory(row.category);
    const normalizedRow = { ...row, category: canonical };
    const arr = byKey.get(normalizedRow.marker_key);
    if (arr) arr.push(normalizedRow);
    else byKey.set(normalizedRow.marker_key, [normalizedRow]);
  }

  const series: MarkerSeries[] = [];
  for (const [marker_key, history] of byKey) {
    history.sort((a, b) => b.result_date.localeCompare(a.result_date) || b.id.localeCompare(a.id));
    const latest = history[0];
    series.push({
      marker_key,
      marker_name: latest.marker_name,
      category: canonicalCategory(latest.category),
      unit: latest.unit,
      ref_low: latest.ref_low,
      ref_high: latest.ref_high,
      ref_text: latest.ref_text,
      latest,
      prior: history[1] ?? null,
      history,
    });
  }

  return series.sort((a, b) => {
    const cat = (a.category ?? 'zzz').localeCompare(b.category ?? 'zzz', 'pl');
    if (cat !== 0) return cat;
    return a.marker_name.localeCompare(b.marker_name, 'pl');
  });
}

export function groupRowsByDate(rows: MedicalLabRow[]): Map<string, MedicalLabRow[]> {
  const map = new Map<string, MedicalLabRow[]>();
  for (const row of rows) {
    const canonical = canonicalCategory(row.category);
    const normalizedRow = { ...row, category: canonical };
    const arr = map.get(normalizedRow.result_date);
    if (arr) arr.push(normalizedRow);
    else map.set(normalizedRow.result_date, [normalizedRow]);
  }
  for (const [, arr] of map) {
    arr.sort((a, b) => a.marker_name.localeCompare(b.marker_name, 'pl'));
  }
  return new Map([...map.entries()].sort((a, b) => b[0].localeCompare(a[0])));
}

/**
 * Klucz markeru z nazwy (ASCII, snake_case). Dzięki lookupowi po istniejących
 * markerach ręczny wpis „Ferrytyna" spina się z serią `ferritin` i trendy działają.
 */
export function deriveMarkerKey(name: string, existingByName?: Map<string, string>): string {
  const hit = existingByName?.get(name.trim().toLowerCase());
  if (hit) return hit;
  const ascii = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const slug = ascii
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return slug || 'unknown';
}

export function computeLabFlag(value: number, refLow: number | null, refHigh: number | null): 'L' | 'H' | 'N' {
  if (refLow != null && value < refLow) return 'L';
  if (refHigh != null && value > refHigh) return 'H';
  return 'N';
}

export const PRIORITY_CHART_MARKERS = [
  'testosterone_total',
  'ferritin',
  'vitamin_d_25oh',
  'cholesterol_total',
  'ldl_cholesterol_calculated',
  'glucose',
  'tsh',
  'hemoglobin',
  'hdl_cholesterol',
  'triglycerides',
] as const;

export type MedicalDocumentRow = Pick<
  Database['public']['Tables']['medical_documents']['Row'],
  'id' | 'document_date' | 'document_type' | 'source_name' | 'source_path' | 'provider' | 'clinical_validity' | 'summary' | 'notes' | 'created_at'
>;
