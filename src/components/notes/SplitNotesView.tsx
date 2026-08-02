/**
 * @component SplitNotesView
 * @role Alternatywny tryb widoku: lista + panel edycji obok siebie (zamiast grid+modal).
 * @composes NoteRow (lista), InlineEditor (panel edycji)
 * @usedBy Keep (gdy viewMode === 'split')
 */
import { useEffect, useState } from 'react';
import { Bot } from 'lucide-react';
import { Note } from './keepUtils';
import InlineEditor from './InlineEditor';
import NoteQuickActions from './NoteQuickActions';
import { confirmDialog, notify, promptDialog } from '../../lib/notify';
import type { NoteFolder } from '../../lib/noteFoldersApi';
import MasonryGrid from './MasonryGrid';
import NoteCollectionSections from './NoteCollectionSections';
import type { NoteSection } from '../../lib/noteOrganization';

interface SplitNotesViewProps {
  notes: Note[];
  filtered: Note[];
  pinned: Note[];
  others: Note[];
  activeNoteId: string | null;
  onSelectNote: (id: string | null) => void;
  onCloseNote: (isEmpty?: boolean) => void;
  onUpdate: (id: string, patch: Partial<Note>) => void;
  onDelete: (id: string) => void;
  onTogglePin: (note: Note) => void;
  busy: boolean;
  allTags: string[];
  onCreate: (note: { title: string; content: string; tags?: string[] }) => void;
  search: string;
  activeTag: string | null;
  onExportChecklists?: (note: Note) => void;
  folders?: NoteFolder[];
  onExportNote?: (note: Note) => void;
  onExportPdf?: (note: Note) => void;
  onShareNote?: (note: Note) => void;
  onLockNote?: (note: Note) => Promise<void>;
  collectionView: 'list' | 'gallery';
  gridProps: Omit<Parameters<typeof MasonryGrid>[0], 'notes'>;
  sections?: NoteSection[];
}

export default function SplitNotesView({
  notes, filtered, pinned, others, activeNoteId, onSelectNote, onCloseNote, onUpdate, onDelete, onTogglePin,
  busy, allTags, onExportChecklists, folders = [], onExportNote, onExportPdf, onShareNote, onLockNote,
  collectionView, gridProps, sections,
}: SplitNotesViewProps) {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [actionNote, setActionNote] = useState<Note | null>(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const activeNote = notes.find(n => n.id === activeNoteId) || null;
  const galleryMode = collectionView === 'gallery';
  const showCollection = galleryMode ? !activeNoteId : (!isMobile || !activeNoteId);
  const showEditor = galleryMode ? !!activeNoteId : (!isMobile || !!activeNoteId);
  const visibleSections: NoteSection[] = sections ?? [
    ...(pinned.length ? [{ key: 'pinned', label: 'Przypięte', notes: pinned }] : []),
    ...(others.length ? [{ key: 'all', label: 'Notatki', notes: others }] : []),
  ];

  const requestMove = async (note: Note) => {
    const destination = await promptDialog('Przenieś do folderu (wpisz nazwę lub „Bez folderu”)', 'Bez folderu');
    if (destination === null) return;
    const normalized = destination.trim().toLocaleLowerCase('pl-PL');
    const folderId = normalized === '' || normalized === 'bez folderu'
      ? null
      : folders.find(folder => folder.name.toLocaleLowerCase('pl-PL') === normalized)?.id;
    if (folderId === undefined) {
      notify('Nie znaleziono folderu o tej nazwie', 'error');
      return;
    }
    onUpdate(note.id, { folder_id: folderId });
  };

  return (
    <div className="keep-split-container">
      {/* List Pane - Visible on desktop, or on mobile when no note is selected */}
      {showCollection && (
        <section
          className={`keep-split-list-pane ${galleryMode ? 'gallery' : ''}`}
          aria-label={galleryMode ? 'Galeria notatek' : 'Lista notatek'}
        >
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-text-muted p-6 text-center">
              <p className="font-bold text-sm">Brak notatek</p>
              <p className="text-xs mt-1">Zmień filtry lub utwórz nową notatkę.</p>
            </div>
          ) : (
            <NoteCollectionSections
              sections={visibleSections}
              collectionView={collectionView}
              activeNoteId={activeNoteId}
              onSelectNote={id => onSelectNote(id)}
              onLongPress={setActionNote}
              gridProps={gridProps}
              onTogglePin={onTogglePin}
              onMove={note => { void requestMove(note); }}
              onDelete={note => {
                void confirmDialog('Czy usunąć tę notatkę?').then(ok => { if (ok) onDelete(note.id); });
              }}
            />
          )}
        </section>
      )}

      {/* Editor Pane - Visible on desktop, or on mobile when a note IS selected */}
      {showEditor && (
        <section className={`keep-split-editor-pane ${galleryMode ? 'gallery-note' : ''}`} aria-label="Edytor notatki">
          {activeNote ? (
            <InlineEditor
              note={activeNote}
              onClose={onCloseNote}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onTogglePin={onTogglePin}
              busy={busy}
              allTags={allTags}
              allNotes={notes}
              onExportChecklists={onExportChecklists}
              isMobile={isMobile}
              folders={folders}
              onExportNote={onExportNote}
              onExportPdf={onExportPdf}
              onShareNote={onShareNote}
              onNavigateToNote={id => onSelectNote(id)}
              onLockNote={onLockNote}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-text-muted p-8 text-center bg-surface-solid/10">
              <Bot size={40} className="mb-3 text-text-muted/50 animate-pulse" />
              <p className="font-bold text-sm">Wybierz notatkę z listy</p>
              <p className="text-xs mt-1">Kliknij dowolną notatkę po lewej stronie lub utwórz nową notatkę klikając przycisk "+" na dole.</p>
            </div>
          )}
        </section>
      )}
      {actionNote && (
        <NoteQuickActions
          note={actionNote}
          onClose={() => setActionNote(null)}
          onTogglePin={() => { onTogglePin(actionNote); setActionNote(null); }}
          onArchive={() => {
            onUpdate(actionNote.id, { is_archived: true });
            setActionNote(null);
          }}
          onDelete={async () => {
            if (await confirmDialog('Czy usunąć tę notatkę?')) onDelete(actionNote.id);
            setActionNote(null);
          }}
        />
      )}
    </div>
  );
}
