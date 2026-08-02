import { supabase } from '../supabase';
import type { MedicalEvent, MedicalEventDraft } from './medicalRecords';
import type { BodyCompositionRow, MedicalLabRow } from './medicalAnalytics';
import { getTodayWarsaw } from '../date';

export type PreventionActionStatus = 'done' | 'snoozed' | 'dismissed';

export interface PreventionAction {
  suggestionKey: string;
  status: PreventionActionStatus;
  snoozedUntil: string | null;
}

export async function fetchMedicalRecordData(userId: string) {
  const [labRes, bodyRes, docRes] = await Promise.all([
    supabase.from('medical_lab_results')
      .select('id, result_date, marker_key, marker_name, category, value, unit, ref_low, ref_high, ref_text, flag, source_name, provider, notes')
      .eq('user_id', userId).order('result_date', { ascending: false }).order('marker_name').limit(500),
    supabase.from('body_composition_measurements')
      .select('id, measured_at, source, method, reliability, weight_kg, body_fat_pct, fat_mass_kg, muscle_mass_kg, visceral_fat_rating, bmi, bmr_kcal, notes')
      .eq('user_id', userId).order('measured_at', { ascending: false }).limit(20),
    supabase.from('medical_documents')
      .select('id, document_date, document_type, source_name, source_path, provider, clinical_validity, summary, notes, created_at')
      .eq('user_id', userId).order('document_date', { ascending: false }).limit(50),
  ]);
  if (labRes.error) throw labRes.error;
  if (bodyRes.error) throw bodyRes.error;
  if (docRes.error) throw docRes.error;
  return {
    labs: (labRes.data ?? []).map((row) => ({
      ...row,
      value: Number(row.value),
      ref_low: row.ref_low == null ? null : Number(row.ref_low),
      ref_high: row.ref_high == null ? null : Number(row.ref_high),
    })) as MedicalLabRow[],
    bodyComposition: (bodyRes.data ?? []).map((row) => ({
      ...row,
      weight_kg: row.weight_kg == null ? null : Number(row.weight_kg),
      body_fat_pct: row.body_fat_pct == null ? null : Number(row.body_fat_pct),
      fat_mass_kg: row.fat_mass_kg == null ? null : Number(row.fat_mass_kg),
      muscle_mass_kg: row.muscle_mass_kg == null ? null : Number(row.muscle_mass_kg),
      visceral_fat_rating: row.visceral_fat_rating == null ? null : Number(row.visceral_fat_rating),
      bmi: row.bmi == null ? null : Number(row.bmi),
      bmr_kcal: row.bmr_kcal == null ? null : Number(row.bmr_kcal),
    })) as BodyCompositionRow[],
    documents: docRes.data ?? [],
  };
}

export async function importMedicalLabResults(input: {
  userId: string;
  docName: string;
  results: Array<{
    marker_key: string;
    marker_name: string;
    value: string | number;
    unit: string | null;
    ref_low: number | null;
    ref_high: number | null;
    flag: string | null;
    category: string | null;
  }>;
}): Promise<void> {
  const resultDate = getTodayWarsaw();
  const { error: documentError } = await supabase.from('medical_documents').insert({
    user_id: input.userId,
    document_date: resultDate,
    document_type: 'processed',
    source_name: input.docName,
    provider: 'Diagnostyka',
    clinical_validity: 'clinical',
  });
  if (documentError) throw documentError;
  const { error: labError } = await supabase.from('medical_lab_results').insert(
    input.results.map((result) => ({
      user_id: input.userId,
      result_date: resultDate,
      marker_key: result.marker_key,
      marker_name: result.marker_name,
      value: Number(result.value),
      unit: result.unit,
      ref_low: result.ref_low,
      ref_high: result.ref_high,
      flag: result.flag,
      category: result.category,
      source_name: input.docName,
      provider: 'Diagnostyka',
    })),
  );
  if (labError) throw labError;
}

function mapEvent(row: {
  id: string;
  user_id: string;
  event_type: string;
  occurred_on: string;
  title: string;
  specialty: string | null;
  provider: string | null;
  reason: string | null;
  summary: string | null;
  recommendations: string | null;
  follow_up_on: string | null;
  source_text: string | null;
  created_at: string;
}): MedicalEvent {
  return {
    id: row.id,
    userId: row.user_id,
    eventType: row.event_type as MedicalEvent['eventType'],
    occurredOn: row.occurred_on,
    title: row.title,
    specialty: row.specialty,
    provider: row.provider,
    reason: row.reason,
    summary: row.summary,
    recommendations: row.recommendations,
    followUpOn: row.follow_up_on,
    sourceText: row.source_text,
    createdAt: row.created_at,
  };
}

export async function fetchMedicalEvents(userId: string): Promise<MedicalEvent[]> {
  const { data, error } = await supabase
    .from('medical_events')
    .select('id, user_id, event_type, occurred_on, title, specialty, provider, reason, summary, recommendations, follow_up_on, source_text, created_at')
    .eq('user_id', userId)
    .order('occurred_on', { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []).map(mapEvent);
}

export async function createMedicalEvent(userId: string, draft: MedicalEventDraft): Promise<MedicalEvent> {
  const { data, error } = await supabase
    .from('medical_events')
    .insert({
      user_id: userId,
      event_type: draft.eventType,
      occurred_on: draft.occurredOn,
      title: draft.title,
      specialty: draft.specialty,
      provider: draft.provider,
      reason: draft.reason,
      summary: draft.summary,
      recommendations: draft.recommendations,
      follow_up_on: draft.followUpOn,
      source_text: draft.sourceText,
    })
    .select('id, user_id, event_type, occurred_on, title, specialty, provider, reason, summary, recommendations, follow_up_on, source_text, created_at')
    .single();
  if (error) throw error;
  return mapEvent(data);
}

export async function fetchPreventionActions(userId: string): Promise<PreventionAction[]> {
  const { data, error } = await supabase
    .from('medical_prevention_actions')
    .select('suggestion_key, status, snoozed_until')
    .eq('user_id', userId);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    suggestionKey: row.suggestion_key,
    status: row.status as PreventionActionStatus,
    snoozedUntil: row.snoozed_until,
  }));
}

export async function savePreventionAction(input: {
  userId: string;
  suggestionKey: string;
  status: PreventionActionStatus;
  sourceUrl: string;
  snoozedUntil?: string | null;
}): Promise<void> {
  const { error } = await supabase
    .from('medical_prevention_actions')
    .upsert({
      user_id: input.userId,
      suggestion_key: input.suggestionKey,
      status: input.status,
      snoozed_until: input.snoozedUntil ?? null,
      rule_version: '2026-07-29',
      source_url: input.sourceUrl,
      decided_at: new Date().toISOString(),
    }, { onConflict: 'user_id,suggestion_key' });
  if (error) throw error;
}
