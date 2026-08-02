import { useQuery } from '@tanstack/react-query';
import type { Database } from './database.types';
import { notesKeys } from './queryKeys';
import { supabase } from './supabase';

export type NoteFolder = Database['public']['Tables']['note_folders']['Row'];
export type NoteFolderNode = NoteFolder & { children: NoteFolderNode[] };

export function buildFolderTree(folders: NoteFolder[]): NoteFolderNode[] {
  const nodes = new Map(folders.map(folder => [folder.id, { ...folder, children: [] } as NoteFolderNode]));
  const roots: NoteFolderNode[] = [];
  for (const node of nodes.values()) {
    const parent = node.parent_id ? nodes.get(node.parent_id) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  const sortNodes = (items: NoteFolderNode[]) => {
    items.sort((a, b) => a.position - b.position || a.name.localeCompare(b.name, 'pl') || a.id.localeCompare(b.id));
    items.forEach(item => sortNodes(item.children));
  };
  sortNodes(roots);
  return roots;
}

export function assertValidFolderMove(
  folders: NoteFolder[],
  folderId: string,
  parentId: string | null,
): void {
  if (folderId === parentId) throw new Error('Folder nie może być własnym rodzicem.');
  let cursor = parentId;
  while (cursor) {
    if (cursor === folderId) throw new Error('Folder nie może trafić do własnego podfolderu.');
    cursor = folders.find(folder => folder.id === cursor)?.parent_id ?? null;
  }
}

export function getFolderDescendantIds(folders: NoteFolder[], rootId: string): Set<string> {
  const descendants = new Set<string>();
  const queue = folders.filter(folder => folder.parent_id === rootId).map(folder => folder.id);
  while (queue.length) {
    const id = queue.shift()!;
    if (descendants.has(id)) continue;
    descendants.add(id);
    queue.push(...folders.filter(folder => folder.parent_id === id).map(folder => folder.id));
  }
  return descendants;
}

export function useNoteFolders(userId: string) {
  return useQuery({
    queryKey: notesKeys.folders(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('note_folders')
        .select('*')
        .eq('user_id', userId)
        .order('position')
        .order('name');
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    enabled: !!userId,
  });
}

export async function createNoteFolder(
  userId: string,
  name: string,
  parentId: string | null = null,
): Promise<NoteFolder> {
  const normalized = name.trim();
  if (!normalized) throw new Error('Nazwa folderu nie może być pusta.');
  const { data, error } = await supabase
    .from('note_folders')
    .insert({ user_id: userId, name: normalized, parent_id: parentId })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function renameNoteFolder(id: string, name: string): Promise<void> {
  const normalized = name.trim();
  if (!normalized) throw new Error('Nazwa folderu nie może być pusta.');
  const { error } = await supabase.from('note_folders').update({ name: normalized }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function moveNoteFolder(
  folders: NoteFolder[],
  id: string,
  parentId: string | null,
  position: number,
): Promise<void> {
  assertValidFolderMove(folders, id, parentId);
  const { error } = await supabase.from('note_folders').update({ parent_id: parentId, position }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteNoteFolder(id: string): Promise<void> {
  const { error } = await supabase.rpc('delete_note_folder_hierarchy' as never, { folder_id: id } as never);
  if (error) throw new Error(error.message);
}
