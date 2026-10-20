import { supabase } from '../supabase';
import type { TablesInsert } from '../database.types';
import type { NewLibraryItem } from './libraryImport';
import type { LibraryItem } from './shelfModel';

const CHUNK = 100;
const UNIQUE_VIOLATION = '23505';
const MAX_ITEMS = 2000;

export async function fetchLibrary(userId: string): Promise<LibraryItem[]> {
  const { data, error } = await supabase
    .from('library_items')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .range(0, MAX_ITEMS - 1);
  if (error) throw error;
  return data ?? [];
}

function toRow(userId: string, item: NewLibraryItem): TablesInsert<'library_items'> {
  return {
    user_id: userId,
    title: item.title,
    author: item.author,
    resource_type: item.resourceType,
    pages: item.pages,
    finished_on: item.finishedOn,
    finished_year: item.finishedOn ? null : item.finishedYear,
    rating: item.rating,
    source: item.source,
  };
}

export interface InsertSummary {
  added: number;
  skipped: number;
}

/**
 * Wstawia pozycje paczkami. Duplikat odrzucony przez indeks (np. wyścig albo różnica w normalizacji)
 * nie przerywa importu: paczka z błędem jest powtarzana wiersz po wierszu.
 */
export async function insertLibraryItems(userId: string, items: NewLibraryItem[]): Promise<InsertSummary> {
  let added = 0;
  let skipped = 0;
  for (let start = 0; start < items.length; start += CHUNK) {
    const rows = items.slice(start, start + CHUNK).map((item) => toRow(userId, item));
    const { error } = await supabase.from('library_items').insert(rows);
    if (!error) {
      added += rows.length;
      continue;
    }
    if (error.code !== UNIQUE_VIOLATION) throw error;
    for (const row of rows) {
      const single = await supabase.from('library_items').insert(row);
      if (!single.error) added += 1;
      else if (single.error.code === UNIQUE_VIOLATION) skipped += 1;
      else throw single.error;
    }
  }
  return { added, skipped };
}

export async function deleteLibraryItem(userId: string, id: string): Promise<void> {
  const { error } = await supabase.from('library_items').delete().eq('id', id).eq('user_id', userId);
  if (error) throw error;
}
