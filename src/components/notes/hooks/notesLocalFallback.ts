import type { Note } from '../../../lib/notesApi';
import { STORAGE_KEYS } from '../../../lib/constants';

export function getNotesStorageKey(userId: string): string {
  return `${STORAGE_KEYS.KEEP_NOTES_LOCAL}_${userId}`;
}

export function readLocalFallback(userId: string): Note[] {
  if (!userId) return [];
  try {
    const local = localStorage.getItem(getNotesStorageKey(userId));
    return local ? (JSON.parse(local) as Note[]) : [];
  } catch {
    return [];
  }
}
