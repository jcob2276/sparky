import {
  DEFAULT_NOTE_COLLECTION_PREFERENCES,
  type NoteCollectionPreferences,
} from './noteOrganization';
import type { Json } from './database.types';
import { supabase } from './supabase';

export type NoteViewPreferenceMap = Record<string, NoteCollectionPreferences>;

export const getCollectionPreferenceKey = (folderId: string | null): string => (
  folderId ? `folder:${folderId}` : 'all'
);

export function parseNoteViewPreferences(value: unknown): NoteCollectionPreferences {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return DEFAULT_NOTE_COLLECTION_PREFERENCES;
  }
  const candidate = value as Partial<NoteCollectionPreferences>;
  if (
    (candidate.view !== 'list' && candidate.view !== 'gallery')
    || !['updated_at', 'created_at', 'title'].includes(candidate.sortField ?? '')
    || (candidate.direction !== 'asc' && candidate.direction !== 'desc')
    || typeof candidate.groupByDate !== 'boolean'
  ) {
    return DEFAULT_NOTE_COLLECTION_PREFERENCES;
  }
  return {
    view: candidate.view,
    sortField: candidate.sortField as NoteCollectionPreferences['sortField'],
    direction: candidate.direction,
    groupByDate: candidate.sortField === 'title' ? false : candidate.groupByDate,
  };
}

const parseMap = (value: unknown): NoteViewPreferenceMap => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).map(([key, entry]) => [
    key,
    parseNoteViewPreferences(entry),
  ]));
};

export async function fetchNoteViewPreferences(userId: string): Promise<NoteViewPreferenceMap> {
  const { data, error } = await supabase
    .from('user_settings')
    .select('notes_view_preferences')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return parseMap(data?.notes_view_preferences);
}

export async function saveNoteViewPreferences(
  userId: string,
  value: NoteViewPreferenceMap,
): Promise<void> {
  const { error } = await supabase.from('user_settings').upsert({
    user_id: userId,
    notes_view_preferences: value as unknown as Json,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });
  if (error) throw new Error(error.message);
}
