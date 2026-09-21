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
import { useKeepActions } from './hooks/useKeepActions';
import './notes.css';
import TrashNotesView from './TrashNotesView';

export default function Keep({ onBack, onNavigateTo }: { onBack?: () => void; onNavigateTo?: (dest: string) => void }) {
  const userId = useUserId();

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
    bulk,
    quickFilter, setQuickFilter,
    quickFilterCounts,
  } = useKeepView({
    userId: userId!, notes, setNotes, busy, setBusy,
    handleCreate, handleUpdate, handleDelete, handleTogglePin, handleReorder,
    handleNewNote, handleDeleteTag, handleDiscardEmpty, handleUnlockNote, unlockedNoteIds,
    folders, smartFolders,
    onBack, onNavigateTo,
  });

  const {
    exporting,
    handleExportArchive,
    handleExportNote,
    handleRequestLock,
    handleSelectNote,
    handleExportPdf,
    handleShareNote,
    createNewNote,
    changeViewMode,
  } = useKeepActions({
    userId: userId!,
    notes,
    trashedNotes,
    folders,
    editingId,
    setEditingId,
    unlockedNoteIds,
    handleOpenNote,
    handleLockNote,
    handleDiscardEmpty,
    handleNewNote,
    setViewMode,
  });

  if (!userId) return null;

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
          isSelectMode={bulk.isSelectMode}
          onToggleSelectMode={() => bulk.setIsSelectMode(!bulk.isSelectMode)}
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
            onCreateFolder={handleCreateFolder}
            onExportNote={handleExportNote}
            onExportPdf={handleExportPdf}
            onShareNote={handleShareNote}
            onLockNote={handleRequestLock}
            collectionView={viewMode}
            gridProps={sharedGridProps}
            sections={sections}
            bulk={bulk}
            quickFilter={quickFilter}
            setQuickFilter={setQuickFilter}
            quickFilterCounts={quickFilterCounts}
          />
        )}
      </div>

    </div>
  );
}
