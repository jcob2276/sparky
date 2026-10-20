import { useCallback } from 'react';
import { Note, updateNoteApi, sortNotes } from '../../../lib/notesApi';
import { notify } from '../../../lib/notify';

interface NoteListActionsDeps {
  notes: Note[];
  setNotes: React.Dispatch<React.SetStateAction<Note[]>>;
  setBusy: (busy: boolean) => void;
  setError: (error: string | null) => void;
}

/** Tag-wide operations (delete/rename) and drag-reorder over the notes list. */
export function useNoteListActions({ notes, setNotes, setBusy, setError }: NoteListActionsDeps) {
  const handleDeleteTag = useCallback(async (tagToDelete: string) => {
    setBusy(true);
    setError(null);
    try {
      const notesToUpdate = notes.filter((n) => n.tags?.includes(tagToDelete));
      for (const note of notesToUpdate) {
        const nextTags = (note.tags || []).filter((t) => t !== tagToDelete);
        await updateNoteApi(note.id, { tags: nextTags, updated_at: new Date().toISOString() });
      }
      const updatedNotes = notes.map((n) =>
        n.tags?.includes(tagToDelete)
          ? {
              ...n,
              tags: (n.tags || []).filter((t) => t !== tagToDelete),
              updated_at: new Date().toISOString(),
            }
          : n
      );
      setNotes(sortNotes(updatedNotes));
      notify(`Tag "${tagToDelete}" został usunięty ze wszystkich notatek.`, 'info');
    } catch (err: unknown) {
      console.error('Error deleting tag:', err);
      const errMsg = err instanceof Error ? err.message : String(err);
      setError(errMsg || 'Nie udało się usunąć tagu.');
    } finally {
      setBusy(false);
    }
  }, [notes, setBusy, setError, setNotes]);

  const handleRenameTag = useCallback(async (oldTag: string, newTag: string) => {
    const normalized = newTag.trim();
    if (!normalized) throw new Error('Nazwa tagu nie może być pusta.');
    const changed = notes.filter(note => note.tags.includes(oldTag));
    for (const note of changed) {
      const tags = [...new Set(note.tags.map(tag => tag === oldTag ? normalized : tag))];
      await updateNoteApi(note.id, { tags, updated_at: new Date().toISOString() });
    }
    setNotes(previous => previous.map(note => note.tags.includes(oldTag) ? {
      ...note,
      tags: [...new Set(note.tags.map(tag => tag === oldTag ? normalized : tag))],
    } : note));
  }, [notes, setNotes]);

  const handleReorder = useCallback((dragId: string, overId: string) => {
    setNotes((prev) => {
      const arr = [...prev];
      const fromIdx = arr.findIndex((n) => n.id === dragId);
      const toIdx = arr.findIndex((n) => n.id === overId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      if (arr[fromIdx].is_pinned !== arr[toIdx].is_pinned) return prev;
      const [moved] = arr.splice(fromIdx, 1);
      arr.splice(toIdx, 0, moved);
      return arr;
    });
  }, [setNotes]);

  return { handleDeleteTag, handleRenameTag, handleReorder };
}
