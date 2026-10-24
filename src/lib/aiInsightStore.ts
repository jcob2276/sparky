import { supabase } from './supabase';
import type { Database } from './database.types';
import type { PeriodCompareResponse, WeekAiInsightResponse } from './edgeTypes';

type Json = Database['public']['Tables']['ai_insight_results']['Row']['payload'];
export type InsightKind = 'week-insight' | 'period-compare';

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

export function isPeriodCompareResponse(value: unknown): value is PeriodCompareResponse {
  return isRecord(value) && isRecord(value.comparison) && typeof value.comparison.summary === 'string' && typeof value.generatedAt === 'string';
}

export function isWeekAiInsightResponse(value: unknown): value is WeekAiInsightResponse {
  return isRecord(value) && isRecord(value.insight) && typeof value.insight.summary === 'string' && typeof value.generatedAt === 'string';
}

/** Zapisany wynik analizy z konta (inne urządzenia, wyczyszczona przeglądarka); brak lub błąd to po prostu null. */
export async function loadInsight(userId: string, kind: InsightKind, cacheKey: string): Promise<unknown> {
  const { data, error } = await supabase
    .from('ai_insight_results')
    .select('payload')
    .eq('user_id', userId)
    .eq('kind', kind)
    .eq('cache_key', cacheKey)
    .maybeSingle();
  return error ? null : (data?.payload ?? null);
}

/** Zapis jest dodatkiem: gdy się nie uda, wynik nadal widać w tej sesji i w pamięci przeglądarki. */
export async function saveInsight(userId: string, kind: InsightKind, cacheKey: string, payload: object): Promise<void> {
  const json: Json = JSON.parse(JSON.stringify(payload));
  await supabase
    .from('ai_insight_results')
    .upsert({ user_id: userId, kind, cache_key: cacheKey, payload: json }, { onConflict: 'user_id,kind,cache_key' });
}
