import { useCallback } from 'react';
import type { QueryClient } from '@tanstack/react-query';
import { Note, restoreNoteApi, deleteNoteApi, moveNoteToTrashApi } from '../../../lib/notesApi';
import { notesKeys } from '../../../lib/queryKeys';
import { notify } from '../../../lib/notify';
import { deleteAllNoteAttachmentFiles, hasNoteAttachments } from '../../../lib/noteAttachmentsApi';
import { hasNoteDrawing } from '../../../lib/noteDrawingsApi';
import { shouldDiscardEmptyNote } from '../../../lib/noteDiscardRules';

interface NoteTrashActionsDeps {
  queryClient: QueryClient;
  userId: string;
  setNotes: React.Dispatch<React.SetStateAction<Note[]>>;
}

/** Restore, permanent delete and discard-empty flows around the notes trash. */
export function useNoteTrashActions({ queryClient, userId, setNotes }: NoteTrashActionsDeps) {
  const handleRestore = useCallback(async (id: string) => {
    await restoreNoteApi(id);
    await queryClient.invalidateQueries({ queryKey: notesKeys.all });
    notify('Notatka przywrócona', 'success');
  }, [queryClient]);

  const handlePermanentDelete = useCallback(async (id: string) => {
    await deleteAllNoteAttachmentFiles(id);
    await deleteNoteApi(id);
    queryClient.setQueryData<Note[]>(
      notesKeys.trash(userId),
      previous => (previous ?? []).filter(note => note.id !== id),
    );
    notify('Notatka usunięta trwale', 'info');
  }, [queryClient, userId]);

  const handleDiscardEmpty = useCallback(async (id: string) => {
    const [hasAttachments, hasDrawing] = await Promise.all([
      hasNoteAttachments(id),
      hasNoteDrawing(id),
    ]);
    if (!shouldDiscardEmptyNote({ hasText: false, hasAttachments, hasDrawing })) return;
    await moveNoteToTrashApi(id);
    setNotes(previous => previous.filter(note => note.id !== id));
    await queryClient.invalidateQueries({ queryKey: notesKeys.trash(userId) });
  }, [queryClient, setNotes, userId]);

  return { handleRestore, handlePermanentDelete, handleDiscardEmpty };
}
