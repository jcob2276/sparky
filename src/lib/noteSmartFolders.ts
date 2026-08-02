import { useQuery } from '@tanstack/react-query';
import type { Json } from './database.types';
import type { Note } from './notesApi';
import { supabase } from './supabase';

export interface SmartFolderRuleV1 {
  version: 1;
  tags: string[];
  tagMode: 'all' | 'any';
  folderId: string | null;
  includeDescendants: boolean;
  hasAttachments: boolean | null;
  isLocked: boolean | null;
  updatedWithinDays: number | null;
}

export interface NoteSmartFolder {
  id: string;
  user_id: string;
  name: string;
  position: number;
  rule: SmartFolderRuleV1;
  created_at: string;
  updated_at: string;
}

const isNullableBoolean = (value: unknown): value is boolean | null => (
  value === null || typeof value === 'boolean'
);

export function parseSmartFolderRule(value: unknown): SmartFolderRuleV1 {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Uszkodzona reguła Smart Folderu.');
  }
  const rule = value as Record<string, unknown>;
  if (rule.version !== 1) throw new Error('Nieobsługiwana wersja Smart Folderu.');
  const valid = Array.isArray(rule.tags)
    && rule.tags.every(tag => typeof tag === 'string')
    && (rule.tagMode === 'all' || rule.tagMode === 'any')
    && (rule.folderId === null || typeof rule.folderId === 'string')
    && typeof rule.includeDescendants === 'boolean'
    && isNullableBoolean(rule.hasAttachments)
    && isNullableBoolean(rule.isLocked)
    && (rule.updatedWithinDays === null
      || (typeof rule.updatedWithinDays === 'number' && rule.updatedWithinDays >= 1));
  if (!valid) throw new Error('Uszkodzona reguła Smart Folderu.');
  return rule as unknown as SmartFolderRuleV1;
}

export function matchesSmartFolder(
  note: Note,
  rule: SmartFolderRuleV1,
  folderDescendants: Set<string>,
  now = new Date(),
): boolean {
  const tagsMatch = !rule.tags.length || (rule.tagMode === 'all'
    ? rule.tags.every(tag => note.tags.includes(tag))
    : rule.tags.some(tag => note.tags.includes(tag)));
  const folderMatch = rule.folderId === null
    || note.folder_id === rule.folderId
    || (rule.includeDescendants && !!note.folder_id && folderDescendants.has(note.folder_id));
  const hasAttachments = (note.attachment_names?.length ?? 0) > 0;
  const attachmentMatch = rule.hasAttachments === null || rule.hasAttachments === hasAttachments;
  const lockMatch = rule.isLocked === null || rule.isLocked === note.is_locked;
  const ageMs = now.getTime() - new Date(note.updated_at).getTime();
  const timeMatch = rule.updatedWithinDays === null || ageMs <= rule.updatedWithinDays * 86_400_000;
  return tagsMatch && folderMatch && attachmentMatch && lockMatch && timeMatch;
}

const mapSmartFolder = (row: Record<string, unknown>): NoteSmartFolder => ({
  ...(row as unknown as Omit<NoteSmartFolder, 'rule'>),
  rule: parseSmartFolderRule(row.rule),
});

export function useNoteSmartFolders(userId: string) {
  return useQuery({
    queryKey: ['notes', 'smart-folders', userId],
    queryFn: async () => {
      const { data, error } = await supabase.from('note_smart_folders')
        .select('*').eq('user_id', userId).order('position').order('name');
      if (error) throw new Error(error.message);
      return (data ?? []).map(row => mapSmartFolder(row));
    },
    enabled: !!userId,
  });
}

export async function createNoteSmartFolder(
  userId: string,
  name: string,
  rule: SmartFolderRuleV1,
): Promise<void> {
  parseSmartFolderRule(rule);
  const { error } = await supabase.from('note_smart_folders').insert({
    user_id: userId,
    name: name.trim(),
    rule: rule as unknown as Json,
  });
  if (error) throw new Error(error.message);
}

export async function updateNoteSmartFolder(
  id: string,
  patch: { name?: string; rule?: SmartFolderRuleV1 },
): Promise<void> {
  if (patch.rule) parseSmartFolderRule(patch.rule);
  const { error } = await supabase.from('note_smart_folders').update({
    ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
    ...(patch.rule ? { rule: patch.rule as unknown as Json } : {}),
    updated_at: new Date().toISOString(),
  }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteNoteSmartFolder(id: string): Promise<void> {
  const { error } = await supabase.from('note_smart_folders').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
