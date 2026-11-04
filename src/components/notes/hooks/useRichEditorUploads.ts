import { useQueryClient } from '@tanstack/react-query';
import { notify } from '../../../lib/notify';
import { uploadNoteAttachment } from '../../../lib/noteAttachmentsApi';
import { notesKeys } from '../../../lib/queryKeys';

interface UseRichEditorUploadsOptions {
  noteId?: string;
  userId?: string;
  restoreSelection: () => void;
  handleInput: () => void;
}

export function useRichEditorUploads({
  noteId,
  userId,
  restoreSelection,
  handleInput,
}: UseRichEditorUploadsOptions) {
  const queryClient = useQueryClient();

  const handleImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!noteId || !userId) {
      notify('Najpierw zapisz notatkę, aby dodać załącznik.', 'error');
      e.target.value = '';
      return;
    }
    try {
      const attachment = await uploadNoteAttachment(userId, noteId, file);
      await queryClient.invalidateQueries({ queryKey: notesKeys.attachments(noteId) });
      restoreSelection();
      // Zdjęcie wstawiamy jako obraz w treści; src odświeżamy przy otwarciu notatki (podpisany URL wygasa).
      const img = document.createElement('img');
      img.className = 'keep-inline-img';
      img.alt = '';
      img.setAttribute('data-attachment-id', attachment.id);
      if (attachment.signed_url) img.src = attachment.signed_url;
      const holder = document.createElement('div');
      holder.appendChild(img);
      document.execCommand('insertHTML', false, `${holder.innerHTML}<p><br></p>`);
      handleInput();
      notify('Zdjęcie dodane do notatki', 'success');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Nie udało się dodać załącznika', 'error');
    }
    e.target.value = '';
  };

  return {
    handleImageFile,
  };
}
