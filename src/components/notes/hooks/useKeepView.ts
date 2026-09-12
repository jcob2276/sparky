import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Note } from '../../../lib/notesApi';
import { convertNoteToTodoItem, exportNoteChecklistsToTodos } from '../../../lib/behavior/captureBridge';
import { notify, confirmDialog, promptDialog } from '../../../lib/notify';
import { useKeepPageEffects } from './useKeepPageEffects';
import { matchesNoteSearch } from '../keepUtils';
import {
  DEFAULT_NOTE_COLLECTION_PREFERENCES,
  sortAndGroupNotes,
  type NoteCollectionPreferences,
  filterNotesByTags,
} from '../../../lib/noteOrganization';
import {
  fetchNoteViewPreferences,
  getCollectionPreferenceKey,
  saveNoteViewPreferences,
  type NoteViewPreferenceMap,
} from '../../../lib/noteViewPreferences';
import { getFolderDescendantIds, type NoteFolder } from '../../../lib/noteFoldersApi';
import { matchesSmartFolder, type NoteSmartFolder } from '../../../lib/noteSmartFolders';
import { useKeepBulkActions } from './useKeepBulkActions';
import { useKeepKeyboardShortcuts } from './useKeepKeyboardShortcuts';
import type { KeepQuickFilter } from '../KeepFilterPills';

type KeepViewMode = 'list' | 'gallery';

const isMobileNotesView = () => window.matchMedia('(max-width: 767px)').matches;
const keepViewStorageKey = () => `vanguard_keep_view_mode_${isMobileNotesView() ? 'mobile' : 'desktop'}`;

interface UseKeepViewProps {
  userId: string;
  notes: Note[];
  setNotes: (updater: Note[] | ((prev: Note[]) => Note[])) => void;
  busy: boolean;
  setBusy: (busy: boolean) => void;
  handleCreate: (note: { title: string; content: string; tags?: string[] }) => void;
  handleUpdate: (id: string, patch: Partial<Note>) => void;
  handleDelete: (id: string) => void;
  handleTogglePin: (note: Note) => void;
  handleReorder: (dragId: string, overId: string) => void;
  handleNewNote: () => Promise<string | null | undefined>;
  handleDeleteTag: (tag: string) => Promise<void>;
  handleDiscardEmpty: (id: string) => Promise<void>;
  handleUnlockNote: (note: Note, passphrase: string) => Promise<void>;
  unlockedNoteIds: Set<string>;
  folders: NoteFolder[];
  smartFolders: NoteSmartFolder[];
  onBack?: () => void;
  onNavigateTo?: (dest: string) => void;
}

export function useKeepView({
  userId, notes, setNotes, busy, setBusy, handleCreate, handleUpdate, handleDelete,
  handleTogglePin, handleReorder, handleNewNote, handleDeleteTag, handleDiscardEmpty, handleUnlockNote,
  unlockedNoteIds, folders, smartFolders,
  onBack, onNavigateTo,
}: UseKeepViewProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [tagFilter, setTagFilter] = useState<{ tags: string[]; mode: 'all' | 'any' }>({ tags: [], mode: 'all' });
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [activeSmartFolderId, setActiveSmartFolderId] = useState<string | null>(null);
  const [sidebarTab, setSidebarTab] = useState<'notes' | 'archive' | 'trash'>('notes');
  const [quickFilter, setQuickFilter] = useState<KeepQuickFilter>('all');
  
  const [viewMode, setViewMode] = useState<KeepViewMode>(() => {
    const saved = (() => { try { return localStorage.getItem(keepViewStorageKey()); } catch { return null; } })();
    return (saved === 'list' || saved === 'gallery') ? saved : saved === 'grid' ? 'gallery' : 'list';
  });
  const [organizationPreferences, setOrganizationPreferences] = useState<Omit<NoteCollectionPreferences, 'view'>>({
    sortField: DEFAULT_NOTE_COLLECTION_PREFERENCES.sortField,
    direction: DEFAULT_NOTE_COLLECTION_PREFERENCES.direction,
    groupByDate: DEFAULT_NOTE_COLLECTION_PREFERENCES.groupByDate,
  });
  const [preferenceMap, setPreferenceMap] = useState<NoteViewPreferenceMap>({});

  useEffect(() => {
    let active = true;
    void fetchNoteViewPreferences(userId).then(value => {
      if (active) setPreferenceMap(value);
    }).catch(() => {
      if (active) notify('Nie udało się wczytać ustawień widoku', 'error');
    });
    return () => { active = false; };
  }, [userId]);

  const setViewModeWithPersist = useCallback((val: KeepViewMode | ((prev: KeepViewMode) => KeepViewMode)) => {
    setViewMode((prev) => {
      const next = typeof val === 'function' ? val(prev) : val;
      try {
        localStorage.setItem(keepViewStorageKey(), next);
      } catch {
        // ignore storage errors
      }
      return next;
    });
  }, []);
  const [columns, setColumns] = useState(3);
  const [editingId, setEditingId] = useState<string | null>(() => searchParams.get('note'));
  const [visibleCount, setVisibleCount] = useState(30);

  useKeepPageEffects({
    search, activeTag, sidebarTab, viewMode, editingId, setEditingId,
    setVisibleCount, setColumns, handleNewNote, handleCreate,
  });

  const goTo = useCallback((dest: string) => {
    if (onNavigateTo) {
      onNavigateTo(dest);
    } else {
      navigate('/');
    }
  }, [onNavigateTo, navigate]);

  const goBack = useCallback(() => (onBack ? onBack() : navigate('/')), [onBack, navigate]);

  const handleCloseCard = useCallback((isEmpty = false) => {
    const closingId = editingId;
    setEditingId(null);
    if (isEmpty && closingId) {
      void handleDiscardEmpty(closingId).catch(error => {
        notify(error instanceof Error ? error.message : 'Nie usunięto pustej notatki', 'error');
      });
    }
    if (!searchParams.has('note')) return;
    const next = new URLSearchParams(searchParams);
    next.delete('note');
    setSearchParams(next, { replace: true });
  }, [editingId, handleDiscardEmpty, searchParams, setSearchParams]);

  const bulk = useKeepBulkActions({ onUpdate: handleUpdate, onDelete: handleDelete });

  useKeepKeyboardShortcuts({
    onNewNote: () => { void handleNewNote().then(id => { if (id) setEditingId(id); }); },
    onClearSelection: bulk.clearSelection,
    isSelectMode: bulk.isSelectMode,
    setIsSelectMode: bulk.setIsSelectMode,
    onCloseEditing: () => handleCloseCard(),
    editingId,
    onToggleViewMode: () => setViewModeWithPersist(v => (v === 'list' ? 'gallery' : 'list')),
  });

  const handleOpenNote = useCallback(async (id: string) => {
    const note = notes.find(item => item.id === id);
    if (!note) return;
    if (note.is_locked && !unlockedNoteIds.has(note.id)) {
      const passphrase = await promptDialog('Hasło do zablokowanej notatki');
      if (passphrase === null) return;
      setBusy(true);
      try {
        await handleUnlockNote(note, passphrase);
      } catch (error) {
        notify(error instanceof Error ? error.message : 'Nie udało się odblokować notatki', 'error');
        return;
      } finally {
        setBusy(false);
      }
    }
    setEditingId(id);
  }, [handleUnlockNote, notes, setBusy, unlockedNoteIds]);

  const allTags = Array.from(new Set(notes.flatMap(n => n.tags))).sort();

  const handleConfirmDeleteTag = useCallback(async (tagToDelete: string) => {
    const ok = await confirmDialog(`Czy na pewno chcesz usunąć tag "${tagToDelete}" ze wszystkich notatek?`);
    if (!ok) return;
    await handleDeleteTag(tagToDelete);
    setActiveTag(t => (t === tagToDelete ? null : t));
  }, [handleDeleteTag]);

  const activeSmartFolder = smartFolders.find(folder => folder.id === activeSmartFolderId);
  const smartDescendants = activeSmartFolder?.rule.folderId
    ? getFolderDescendantIds(folders, activeSmartFolder.rule.folderId)
    : new Set<string>();
  const filtered = filterNotesByTags(notes, tagFilter.tags, tagFilter.mode).filter(n => {
    const matchTab = sidebarTab === 'notes' ? !n.is_archived : sidebarTab === 'archive' && !!n.is_archived;
    const matchSearch = matchesNoteSearch(n, search);
    const matchTag = !activeTag || n.tags.includes(activeTag);
    const matchFolder = !activeFolderId || n.folder_id === activeFolderId;
    const matchSmart = !activeSmartFolder || matchesSmartFolder(n, activeSmartFolder.rule, smartDescendants);
    if (!matchTab || !matchSearch || !matchTag || !matchFolder || !matchSmart) return false;
    if (quickFilter === 'pinned') return n.is_pinned;
    if (quickFilter === 'todos') return n.content?.includes('keep-todo-checkbox');
    if (quickFilter === 'attachments') return (n.attachment_names && n.attachment_names.length > 0) || !!n.drawing_preview_path;
    if (quickFilter === 'locked') return n.is_locked;
    return true;
  });

  const baseNotes = sidebarTab === 'notes' ? notes.filter(n => !n.is_archived) : notes.filter(n => !!n.is_archived);
  const quickFilterCounts = useMemo(() => ({
    all: baseNotes.length,
    pinned: baseNotes.filter(n => n.is_pinned).length,
    todos: baseNotes.filter(n => n.content?.includes('keep-todo-checkbox')).length,
    attachments: baseNotes.filter(n => (n.attachment_names && n.attachment_names.length > 0) || !!n.drawing_preview_path).length,
    locked: baseNotes.filter(n => n.is_locked).length,
  }), [baseNotes]);

  const pinned = sidebarTab === 'notes' ? filtered.filter(n => n.is_pinned) : [];
  const others = sidebarTab === 'notes' ? filtered.filter(n => !n.is_pinned) : filtered;
  const visibleOthers = others.slice(0, visibleCount);
  const fallbackPreferences: NoteCollectionPreferences = { view: viewMode, ...organizationPreferences };
  const preferenceKey = getCollectionPreferenceKey(activeFolderId);
  const collectionPreferences = preferenceMap[preferenceKey] ?? fallbackPreferences;
  const sections = useMemo(() => sortAndGroupNotes(
    sidebarTab === 'notes' ? filtered : filtered.map(note => ({ ...note, is_pinned: false })),
    collectionPreferences,
  ), [collectionPreferences, filtered, sidebarTab]);

  const setCollectionPreferences = useCallback((next: NoteCollectionPreferences) => {
    setViewModeWithPersist(next.view);
    setOrganizationPreferences({ sortField: next.sortField, direction: next.direction, groupByDate: next.groupByDate });
    setPreferenceMap(previous => {
      const updated = { ...previous, [preferenceKey]: next };
      void saveNoteViewPreferences(userId, updated).catch(() => notify('Nie udało się zapisać ustawień widoku', 'error'));
      return updated;
    });
  }, [preferenceKey, setViewModeWithPersist, userId]);

  const handleTagClick = useCallback((tag: string) => {
    setSidebarTab('notes');
    setSearch('');
    setActiveFolderId(null);
    setActiveTag(t => (t === tag ? null : tag));
  }, []);

  const handleConvertToTodo = useCallback(async (note: Note) => {
    setBusy(true);
    try {
      await convertNoteToTodoItem(userId, note);
      setNotes(prev => prev.map(n => (
        n.id === note.id ? { ...n, is_archived: true, is_pinned: false } : n
      )));
      notify('Dodano do zadań', 'success');
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : 'Nie udało się dodać do zadań', 'error');
    } finally {
      setBusy(false);
    }
  }, [userId, setNotes, setBusy]);

  const handleExportChecklists = useCallback(async (note: Note) => {
    setBusy(true);
    try {
      const created = await exportNoteChecklistsToTodos(userId, note);
      notify(`Dodano ${created.length} zadań`, 'success');
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : 'Eksport nie powiódł się', 'error');
    } finally {
      setBusy(false);
    }
  }, [userId, setBusy]);

  const sharedGridProps = {
    onDelete: handleDelete,
    onTogglePin: handleTogglePin,
    onUpdate: handleUpdate,
    onReorder: handleReorder,
    busy,
    columns,
    editingId,
    onOpenCard: (id: string) => { void handleOpenNote(id); },
    onClickTag: handleTagClick,
    onConvertToTodo: sidebarTab === 'notes' ? handleConvertToTodo : undefined,
    search,
  };

  return {
    search, setSearch,
    activeTag, setActiveTag,
    tagFilter, setTagFilter,
    activeFolderId, setActiveFolderId,
    activeSmartFolderId, setActiveSmartFolderId,
    sidebarTab, setSidebarTab,
    viewMode, setViewMode: setViewModeWithPersist,
    collectionPreferences, setCollectionPreferences,
    editingId, setEditingId,
    visibleCount, setVisibleCount,
    goTo, goBack,
    handleCloseCard,
    handleOpenNote,
    allTags,
    handleConfirmDeleteTag,
    filtered, pinned, others, visibleOthers, sections,
    handleExportChecklists,
    sharedGridProps,
    bulk,
    quickFilter, setQuickFilter,
    quickFilterCounts,
  };
}
