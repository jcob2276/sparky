import { useUserId } from '../../store/useStore';
import { useNoteAttachmentsController } from './hooks/useNoteAttachmentsController';
import NoteAttachmentsView from './NoteAttachmentsView';
import DrawingEditor from './drawing/DrawingEditor';
import { useState } from 'react';
import { useNoteDrawing } from '../../lib/noteDrawingsApi';
import { Pressable } from '../ui/ControlPrimitives';

export default function NoteAttachments({ noteId, onInsertText }: { noteId: string; onInsertText?: (text: string) => void }) {
  const userId = useUserId();
  const [drawingOpen, setDrawingOpen] = useState(false);
  const controller = useNoteAttachmentsController(noteId, userId || '');
  const { data: drawing } = useNoteDrawing(noteId);
  if (!userId) return null;
  return (
    <>
    <NoteAttachmentsView
      attachments={controller.attachments}
      loading={controller.isLoading}
      busy={controller.busy}
      onUpload={controller.uploadFiles}
      onScan={controller.uploadScan}
      onScanText={async file => {
        const text = await controller.scanText(file);
        onInsertText?.(text);
      }}
      onRecord={controller.recordAudio}
      onDelete={controller.removeAttachment}
      onDraw={() => setDrawingOpen(true)}
    />
    {drawing?.previewUrl && <Pressable type="button" className="note-drawing-preview" onClick={() => setDrawingOpen(true)}>
      <img src={drawing.previewUrl} alt="Podgląd rysunku" />
      <span>Rysunek · edytuj</span>
    </Pressable>}
    {drawingOpen && <DrawingEditor userId={userId} noteId={noteId} onInsertText={onInsertText} onClose={() => setDrawingOpen(false)} />}
    </>
  );
}
