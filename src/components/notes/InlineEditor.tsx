/**
 * @component InlineEditor
 * @role Wspólny panel edycji notatki używany w widokach siatki i podziału.
 * @composes RichEditor
 * @usedBy SplitNotesView
 */
import { Pressable } from '../ui/ControlPrimitives';
import { useMemo } from 'react';
import { useFocusEmptyEditor } from './hooks/useFocusEmptyEditor';
import { ChevronLeft, X } from 'lucide-react';
import TitledRichEditor from './TitledRichEditor';
import { getColor, Note, getPlainText, noteFullDate } from './keepUtils';
import { notify, confirmDialog } from '../../lib/notify';
import NoteFolderPicker from './NoteFolderPicker';
import { useUserId } from '../../store/useStore';
import { useNoteDraftAutosave } from './useNoteDraftAutosave';
import { useNoteAi } from './useNoteAi';
import NoteAttachments from './NoteAttachments';
import type { NoteFolder } from '../../lib/noteFoldersApi';
import NoteSaveIndicator from './NoteSaveIndicator';
import { deriveNoteMetadata } from '../../lib/noteText';
import NoteEditorMoreMenu from './NoteEditorMoreMenu';
import NoteReferences from './NoteReferences';

interface InlineEditorProps {
  note: Note;
  onClose: (isEmpty?: boolean) => void;
  onUpdate: (id: string, patch: Partial<Note>) => void;
  onDelete: (id: string) => void;
  onTogglePin: (note: Note) => void;
  busy: boolean;
  allTags?: string[];
  allNotes?: Note[];
  onExportChecklists?: (note: Note) => void;
  isMobile: boolean;
  showBack?: boolean;
  folders?: NoteFolder[];
  onCreateFolder?: (name: string, parentId?: string | null) => Promise<NoteFolder | null | void>;
  onExportNote?: (note: Note) => void;
  onExportPdf?: (note: Note) => void;
  onShareNote?: (note: Note) => void;
  onNavigateToNote?: (noteId: string) => void;
  onLockNote?: (note: Note) => Promise<void>;
}

export default function InlineEditor({
  note, onClose, onUpdate, onDelete, onTogglePin, busy: _busy, allTags: _allTags = [], allNotes = [], onExportChecklists: _onExportChecklists, isMobile, showBack = false, folders = [], onCreateFolder, onExportNote, onExportPdf, onShareNote, onNavigateToNote, onLockNote,
}: InlineEditorProps) {
  const userId = useUserId();
  const rootRef = useFocusEmptyEditor(note.id);
  const {
    content, color, folder_id, saveStatus, flush: flushSave, flushAndWait, retrySave, setContent, setColor, setFolderId,
  } = useNoteDraftAutosave({ note, onSave: onUpdate });
  const plainWordCount = useMemo(() => {
    const text = getPlainText(content).trim();
    return text ? text.split(/\s+/).length : 0;
  }, [content]);
  const c = getColor(color);
  const metadata = deriveNoteMetadata(content);
  const navigateReference = (id: string) => {
    if (!allNotes.some(item => item.id === id && item.user_id === note.user_id && !item.deleted_at)) {
      notify('Ta notatka jest niedostępna lub została usunięta.', 'error');
      return;
    }
    flushSave();
    onNavigateToNote?.(id);
  };
  const { aiResult, setAiResult, aiSummarize, aiExtractTasks } = useNoteAi({ content, title: metadata.title, noteId: note.id, userId });
  return (
    <div
      ref={rootRef}
      className="keep-inline-editor flex flex-col h-full overflow-hidden"
      style={{ backgroundColor: c.bg, color: c.text }}
    >
      <div className="keep-inline-header flex items-center justify-between border-b border-border-custom/10 px-4 py-2.5 bg-background/5">
        <div className="flex items-center gap-2">
          {(isMobile || showBack) && (
            <Pressable variant="ghost" size="sm" onClick={() => {
              const isEmpty = getPlainText(content).length === 0;
              if (!isEmpty) flushSave();
              onClose(isEmpty);
            }} className="keep-note-back text-inherit hover:bg-text-primary/5">
              <ChevronLeft size={22} />
              <span>Notatki</span>
            </Pressable>
          )}
          {!isMobile && !showBack && <span className="text-xs opacity-[var(--opacity-60)] font-semibold mr-1">Notatka</span>}
          <NoteFolderPicker
            isMobile={isMobile}
            folderId={folder_id}
            folders={folders}
            onCreateFolder={onCreateFolder}
            onSelectFolder={(nextId) => {
              setFolderId(nextId);
              onUpdate(note.id, { folder_id: nextId });
            }}
          />
        </div>
        <div className="flex items-center gap-1.5">
          <NoteEditorMoreMenu
            isMobile={isMobile}
            pinned={note.is_pinned}
            color={color}
            onPin={() => onTogglePin(note)}
            onArchive={() => { onUpdate(note.id, { is_archived: !note.is_archived }); onClose(); }}
            onExport={onExportNote ? () => onExportNote({ ...note, ...metadata, content, color, folder_id }) : undefined}
            onExportPdf={onExportPdf ? () => onExportPdf({ ...note, ...metadata, content, color, folder_id }) : undefined}
            onShare={onShareNote ? () => onShareNote({ ...note, ...metadata, content, color, folder_id }) : undefined}
            onLock={onLockNote ? () => { void flushAndWait().then(() => onLockNote({
              ...note, ...metadata, content, color, folder_id,
            })); } : undefined}
            onDelete={() => { void confirmDialog('Przenieść notatkę do Kosza?').then(confirmed => { if (confirmed) { onDelete(note.id); onClose(); } }); }}
            onSummarize={() => { void aiSummarize(); }}
            onExtractTasks={() => { void aiExtractTasks(); }}
            onColor={(newColor) => {
              setColor(newColor);
              onUpdate(note.id, { color: newColor });
            }}
          />
        </div>
      </div>
      <div data-note-scroll className="flex-1 min-w-0 overflow-x-hidden overflow-y-auto px-4 py-3 md:px-6 md:py-4 flex flex-col gap-3 max-w-3xl mx-auto w-full">
        <div className="flex items-center justify-center gap-1.5 text-2xs text-text-muted font-medium select-none text-center">
          <span>{noteFullDate(note.updated_at || note.created_at)}</span>
          {plainWordCount > 0 && (
            <>
              <span className="opacity-40">·</span>
              <span>{plainWordCount} {plainWordCount === 1 ? 'słowo' : (plainWordCount % 10 >= 2 && plainWordCount % 10 <= 4 && (plainWordCount % 100 < 10 || plainWordCount % 100 >= 20)) ? 'słowa' : 'słów'}</span>
            </>
          )}
          <NoteSaveIndicator status={saveStatus} onRetry={retrySave} className="ml-1 text-2xs text-primary font-semibold" />
        </div>
        {aiResult && (
          <div className="bg-text-primary/5 border border-border-custom/10 p-3 rounded-lg text-xs relative flex flex-col gap-1 leading-relaxed mb-2">
            <div className="flex items-center justify-between text-xs opacity-[var(--opacity-70)] font-semibold">
              <span>{aiResult.type === 'summary' ? 'Podsumowanie AI' : 'Wyekstrahowane zadania'}</span>
              <Pressable variant="ghost" size="sm" onClick={() => setAiResult(null)} className="hover:text-text-primary text-text-muted" aria-label="Zamknij wynik AI"><X size={14} /></Pressable>
            </div>
            <p className="whitespace-pre-wrap">{aiResult.text}</p>
          </div>
        )}
        <div 
          className={`relative mt-2 min-h-[50vh] ${isMobile ? 'flex-none' : 'flex-auto shrink-0'} select-text flex flex-col cursor-text pb-8`}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              const editorEl = e.currentTarget.querySelector<HTMLElement>('.keep-rich-editor');
              if (editorEl) {
                editorEl.focus();
                const sel = window.getSelection();
                if (sel) {
                  const range = document.createRange();
                  range.selectNodeContents(editorEl);
                  range.collapse(false);
                  sel.removeAllRanges();
                  sel.addRange(range);
                }
              }
            }
          }}
        >
          <TitledRichEditor 
            value={content} 
            onChange={setContent} 
            placeholder="Zacznij pisać..."
            className={isMobile ? 'keep-ios-editor flex-1' : 'flex-1'}
            dockToolbar={isMobile}
            allNotes={allNotes} 
            noteId={note.id} 
            userId={userId || undefined}
            onNavigateToNote={navigateReference}
          />
        </div>
        <NoteReferences note={{ ...note, content }} notes={allNotes} onNavigate={navigateReference} />
        <NoteAttachments noteId={note.id} onInsertText={text => {
          const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
          setContent(`${content}<p>${escaped.replace(/\n/g, '<br>')}</p>`);
        }} />
      </div>
    </div>
  );
}
