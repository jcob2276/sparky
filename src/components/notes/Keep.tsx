/**
 * @component Keep
 * @role Główna strona notatek — spina foldery, listę/galerię i wspólny edytor.
 * @composes KeepHeader, KeepSidebar, SplitNotesView i wspólny InlineEditor
 * @folders hooks/ = useNotesData (dane+mutacje) i useKeepView (stan widoku, wraps useKeepPageEffects)
 * @usedBy Dashboard (lazy import)
 */
import KeepHeader from './KeepHeader';
import KeepSidebar from './KeepSidebar';
import SplitNotesView from './SplitNotesView';
import { useUserId } from '../../store/useStore';
import { useNotesData } from './hooks/useNotesData';
import { useKeepView } from './hooks/useKeepView';
import './notes.css';
import WorkspaceNavigation from '../shared/WorkspaceNavigation';
import TrashNotesView from './TrashNotesView';
import { useEffect, useState } from 'react';
import {
  exportNotesArchive,
  exportSingleNote,
  exportSingleNotePdf,
  shareNoteCopy,
} from '../../lib/notesExport';
import { notify, promptDialog } from '../../lib/notify';
import { getPlainText } from '../../lib/noteText';

export default function Keep({ onBack, onNavigateTo }: { onBack?: () => void; onNavigateTo?: (dest: string) => void }) {
  const userId = useUserId();
  const [exporting, setExporting] = useState(false);

  const {
    notes, trashedNotes, folders, smartFolders, setNotes, trashLoading, foldersLoading, smartFoldersLoading, busy, setBusy,
    handleCreate, handleUpdate, handleDelete, handleTogglePin, handleNewNote,
    handleDeleteTag, handleRenameTag, handleReorder, handleRestore, handlePermanentDelete,
    handleCreateFolder, handleRenameFolder, handleMoveFolder, handleReorderFolder, handleDeleteFolder,
    handleCreateSmartFolder, handleUpdateSmartFolder, handleDeleteSmartFolder,
    handleDiscardEmpty,
    handleLockNote, handleUnlockNote, lockNow, unlockedNoteIds,
  } = useNotesData(userId!);

  const {
    search, setSearch,
    activeTag, setActiveTag, tagFilter, setTagFilter,
    activeFolderId, setActiveFolderId,
    activeSmartFolderId, setActiveSmartFolderId,
    sidebarTab, setSidebarTab,
    viewMode, setViewMode, collectionPreferences, setCollectionPreferences,
    editingId, setEditingId,
    goTo, goBack,
    handleCloseCard,
    handleOpenNote,
    allTags,
    handleConfirmDeleteTag,
    filtered, pinned, others, sections,
    handleExportChecklists,
    sharedGridProps,
  } = useKeepView({
    userId: userId!, notes, setNotes, busy, setBusy,
    handleCreate, handleUpdate, handleDelete, handleTogglePin, handleReorder,
    handleNewNote, handleDeleteTag, handleDiscardEmpty, handleUnlockNote, unlockedNoteIds,
    folders, smartFolders,
    onBack, onNavigateTo,
  });

  useEffect(() => {
    const locked = notes.find(note => note.id === editingId && note.is_locked && !unlockedNoteIds.has(note.id));
    if (!locked) return;
    setEditingId(null);
    void handleOpenNote(locked.id);
  }, [editingId, handleOpenNote, notes, setEditingId, unlockedNoteIds]);

  if (!userId) return null;

  const handleExportArchive = async () => {
    setExporting(true);
    try {
      await exportNotesArchive(userId, [...notes, ...trashedNotes], folders);
      notify('Archiwum notatek zostało przygotowane', 'success');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Eksport nie powiódł się', 'error');
    } finally {
      setExporting(false);
    }
  };

  const handleExportNote = (note: (typeof notes)[number]) => {
    void exportSingleNote(note, folders.find(folder => folder.id === note.folder_id)).catch(error => {
      notify(error instanceof Error ? error.message : 'Eksport nie powiódł się', 'error');
    });
  };

  const handleRequestLock = async (note: (typeof notes)[number]) => {
    const passphrase = await promptDialog('Ustaw hasło do notatki (minimum 6 znaków)');
    if (passphrase === null) return;
    const repeated = await promptDialog('Powtórz hasło do notatki');
    if (repeated !== passphrase) {
      notify('Hasła nie są takie same.', 'error');
      return;
    }
    try {
      await handleLockNote(note, passphrase);
      setEditingId(null);
      notify('Notatka została zaszyfrowana i zablokowana', 'success');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Nie udało się zablokować notatki', 'error');
    }
  };

  const handleSelectNote = (id: string | null) => {
    if (!id) {
      setEditingId(null);
      return;
    }
    const current = notes.find(note => note.id === editingId);
    if (current && !current.title.trim() && !getPlainText(current.content)) {
      void handleDiscardEmpty(current.id);
    }
    void handleOpenNote(id);
  };

  const handleExportPdf = (note: (typeof notes)[number]) => {
    void exportSingleNotePdf(note, folders.find(folder => folder.id === note.folder_id)).catch(error => {
      notify(error instanceof Error ? error.message : 'Eksport PDF nie powiódł się', 'error');
    });
  };

  const handleShareNote = (note: (typeof notes)[number]) => {
    void shareNoteCopy(note, folders.find(folder => folder.id === note.folder_id)).catch(error => {
      notify(error instanceof Error ? error.message : 'Udostępnianie nie powiodło się', 'error');
    });
  };

  const createNewNote = () => {
    void handleNewNote().then((id) => {
      if (id) setEditingId(id);
    });
  };

  const changeViewMode = (mode: 'list' | 'gallery') => {
    setEditingId(null);
    setViewMode(mode);
  };

  return (
    <div className={`keep-root ${editingId ? 'keep-mobile-note-open' : ''}`}>
      <KeepSidebar
          notes={notes}
          trashCount={trashedNotes.length}
          folders={folders}
          foldersLoading={foldersLoading}
          smartFolders={smartFolders}
          smartFoldersLoading={smartFoldersLoading}
          allTags={allTags}
          sidebarTab={sidebarTab}
          setSidebarTab={(tab) => { setSidebarTab(tab); setEditingId(null); }}
          activeTag={activeTag}
          setActiveTag={(fn) => { setActiveTag(fn); setEditingId(null); }}
          setSearch={setSearch}
          activeFolderId={activeFolderId}
          setActiveFolderId={(id) => { setActiveFolderId(id); setEditingId(null); }}
          onCreateFolder={handleCreateFolder}
          onRenameFolder={handleRenameFolder}
          onMoveFolder={handleMoveFolder}
          onReorderFolder={handleReorderFolder}
          onDeleteFolder={handleDeleteFolder}
          goTo={goTo}
          onConfirmDeleteTag={handleConfirmDeleteTag}
          tagFilter={tagFilter}
          onTagFilterChange={setTagFilter}
          onRenameTag={handleRenameTag}
          activeSmartFolderId={activeSmartFolderId}
          setActiveSmartFolderId={setActiveSmartFolderId}
          onCreateSmartFolder={handleCreateSmartFolder}
          onUpdateSmartFolder={handleUpdateSmartFolder}
          onDeleteSmartFolder={handleDeleteSmartFolder}
      />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="keep-browser-header"><KeepHeader
          onBack={goBack}
          search={search}
          setSearch={setSearch}
          onExport={() => { void handleExportArchive(); }}
          onNewNote={createNewNote}
          exporting={exporting}
          showLockNow={unlockedNoteIds.size > 0}
          onLockNow={() => { lockNow(); setEditingId(null); }}
          viewMode={viewMode}
          setViewMode={changeViewMode}
          preferences={collectionPreferences}
          onPreferencesChange={setCollectionPreferences}
        /></div>
        {sidebarTab === 'trash' ? (
          <TrashNotesView
            notes={trashedNotes}
            loading={trashLoading}
            onRestore={handleRestore}
            onPermanentDelete={handlePermanentDelete}
          />
        ) : (
          <SplitNotesView
            notes={notes}
            filtered={filtered}
            pinned={pinned}
            others={others}
            activeNoteId={editingId}
            onSelectNote={handleSelectNote}
            onCloseNote={handleCloseCard}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
            onTogglePin={handleTogglePin}
            busy={busy}
            allTags={allTags}
            onCreate={handleCreate}
            search={search}
            activeTag={activeTag}
            onExportChecklists={handleExportChecklists}
            folders={folders}
            onExportNote={handleExportNote}
            onExportPdf={handleExportPdf}
            onShareNote={handleShareNote}
            onLockNote={handleRequestLock}
            collectionView={viewMode}
            gridProps={sharedGridProps}
            sections={sections}
          />
        )}
      </div>

      {/* Mobile bottom nav */}
      <WorkspaceNavigation
        active="keep"
        orientation="horizontal"
        onNavigate={goTo}
        primaryAction={{ label: 'Notatka', onClick: createNewNote }}
        className="keep-mobile-navigation md:hidden fixed bottom-0 inset-x-0 z-[var(--z-overlay)] border-t border-border-custom bg-background/95 backdrop-blur-[var(--blur-xl)]"
      />
    </div>
  );
}
