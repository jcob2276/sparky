import { supabase } from './supabase';
import { formatLongDateWarsaw, formatWarsawDate, warsawTimeOfDay } from './date';

export interface MemorySourceRef {
  table: string;
  id: string;
  date?: string | null;
  date_precision?: string | null;
  quote?: string | null;
}

export type MemorySourceResult =
  | { status: 'available'; text: string; date: string | null; date_precision: string | null }
  | { status: 'missing' | 'unsupported' };

const SOURCE_CONFIG = {
  vanguard_stream: { label: 'Wpis w strumieniu', select: 'content, created_at', date: 'created_at', precision: 'timestamp', fields: [['content', '']] },
  confirmed_friction_events: { label: 'Potwierdzone zdarzenie', select: 'raw_text, actual_behavior, declared_intention, occurred_at', date: 'occurred_at', precision: 'date', fields: [['raw_text', 'Zapis'], ['actual_behavior', 'Zachowanie'], ['declared_intention', 'Deklaracja']] },
  daily_reconciliations: { label: 'Refleksja dnia', select: 'events_summary, user_response, plan_quality, plan_failure_reason, date', date: 'date', precision: 'date', fields: [['user_response', 'Odpowiedź'], ['events_summary', 'Podsumowanie'], ['plan_quality', 'Realizacja planu'], ['plan_failure_reason', 'Przeszkoda']] },
  vanguard_daily_aggregates: { label: 'Podsumowanie dnia', select: 'final_state, date', date: 'date', precision: 'date', fields: [['final_state', 'Stan dnia']] },
  vanguard_behavioral_patterns: { label: 'Wzorzec zachowania', select: 'title, evidence_text, last_seen', date: 'last_seen', precision: 'date', fields: [['title', 'Wzorzec'], ['evidence_text', 'Przesłanki']] },
} as const;

export function memorySourceLabel(table: string): string {
  return Object.hasOwn(SOURCE_CONFIG, table)
    ? SOURCE_CONFIG[table as keyof typeof SOURCE_CONFIG].label
    : `Nieobsługiwane źródło (${table})`;
}

export function parseMemorySourceRefs(raw: unknown): MemorySourceRef[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((ref: unknown) => {
    if (!ref || typeof ref !== 'object' || !('table' in ref) || !('id' in ref)
      || typeof ref.table !== 'string' || typeof ref.id !== 'string' || !ref.id.trim()) return [];
    return [{
      table: ref.table, id: ref.id,
      date: 'date' in ref && typeof ref.date === 'string' ? ref.date : null,
      date_precision: 'date_precision' in ref && typeof ref.date_precision === 'string' ? ref.date_precision : null,
      quote: 'quote' in ref && typeof ref.quote === 'string' ? ref.quote : null,
    }];
  });
}

/** Legacy refs may contain a storage timestamp rather than an event time. Default to day precision. */
export function formatMemorySourceDate(date?: string | null, precision?: string | null): string {
  if (!date || !/^\d{4}-\d{2}-\d{2}(?:$|T)/.test(date)) return 'Data nieznana';
  const day = date.slice(0, 10);
  const dayDate = new Date(`${day}T12:00:00Z`);
  if (!Number.isFinite(dayDate.getTime()) || formatWarsawDate(dayDate) !== day) return 'Data nieznana';
  if (precision === 'timestamp' && /T\d{2}:\d{2}.*(?:Z|[+-]\d{2}:\d{2})$/.test(date)) {
    if (!Number.isFinite(new Date(date).getTime())) return 'Data nieznana';
    return `${formatLongDateWarsaw(date)} · ${warsawTimeOfDay(date)}`;
  }
  return formatLongDateWarsaw(dayDate);
}

export async function fetchMemorySource(userId: string, ref: MemorySourceRef): Promise<MemorySourceResult> {
  if (!userId || !ref.id.trim()) throw new Error('Brak użytkownika lub identyfikatora źródła');
  if (!Object.hasOwn(SOURCE_CONFIG, ref.table)) return { status: 'unsupported' };
  const table = ref.table as keyof typeof SOURCE_CONFIG;
  const config = SOURCE_CONFIG[table];
  // The authenticated browser client keeps RLS in force; both filters are mandatory.
  const query = table === 'confirmed_friction_events'
    ? supabase.from(table).select(config.select).eq('user_id', userId).eq('id', ref.id).maybeSingle()
    : supabase.from(table).select(config.select).eq('user_id', userId).eq('id', ref.id).maybeSingle();
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  if (!data) return { status: 'missing' };
  const row: Record<string, unknown> = Object.fromEntries(Object.entries(data));
  const text = config.fields.flatMap(([field, label]) => {
    const value = row[field];
    if (value === null || value === undefined || value === '') return [];
    const content = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
    return [label ? `${label}: ${content}` : content];
  }).join('\n\n');
  const date = row[config.date];
  return {
    status: 'available', text: text || 'Źródło istnieje, ale nie zawiera treści tekstowej.',
    date: typeof date === 'string' ? date : null,
    date_precision: config.precision,
  };
}
