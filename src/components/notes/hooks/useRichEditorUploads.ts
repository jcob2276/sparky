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
      const safeLabel = document.createElement('span');
      safeLabel.textContent = `📎 ${attachment.file_name}`;
      restoreSelection();
      document.execCommand(
        'insertHTML',
        false,
        `<p><span data-attachment-id="${attachment.id}" contenteditable="false">${safeLabel.innerHTML}</span></p><p><br></p>`
      );
      handleInput();
      notify('Zdjęcie zapisane jako załącznik', 'success');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Nie udało się dodać załącznika', 'error');
    }
    e.target.value = '';
  };

  return {
    handleImageFile,
  };
}
