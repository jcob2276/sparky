import type { Note } from './notesApi';

export type EmergencyNoteDraft = Pick<
  Note,
  'title' | 'content' | 'color' | 'tags' | 'folder_id'
>;

const draftKey = (noteId: string) => `vanguard_note_draft:${noteId}`;

export function loadEmergencyNoteDraft(noteId: string): EmergencyNoteDraft | null {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(draftKey(noteId)) ?? 'null');
    if (!value || typeof value !== 'object') return null;
    const draft = value as Record<string, unknown>;
    if (typeof draft.title !== 'string' || typeof draft.content !== 'string' || typeof draft.color !== 'string'
      || !Array.isArray(draft.tags) || !draft.tags.every((tag): tag is string => typeof tag === 'string')
      || (draft.folder_id !== null && typeof draft.folder_id !== 'string')) return null;
    return { title: draft.title, content: draft.content, color: draft.color, tags: draft.tags, folder_id: draft.folder_id };
  } catch {
    return null;
  }
}

export function saveEmergencyNoteDraft(noteId: string, draft: EmergencyNoteDraft): void {
  try {
    localStorage.setItem(draftKey(noteId), JSON.stringify(draft));
  } catch {
    // The editor still keeps the draft in memory when storage is unavailable.
  }
}

export function removeEmergencyNoteDraft(noteId: string): void {
  try {
    localStorage.removeItem(draftKey(noteId));
  } catch {
    // Storage cleanup is best effort.
  }
}
