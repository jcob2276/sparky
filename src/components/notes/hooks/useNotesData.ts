import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useNotes, useTrashedNotes, Note, updateNoteApi,
  restoreNoteApi, deleteNoteApi, moveNoteToTrashApi, sortNotes,
} from '../../../lib/notesApi';
import { notesKeys } from '../../../lib/queryKeys';
import { notify } from '../../../lib/notify';
import { STORAGE_KEYS } from '../../../lib/constants';
import { useNotesMutations } from './useNotesMutations';
import { deleteAllNoteAttachmentFiles, hasNoteAttachments } from '../../../lib/noteAttachmentsApi';
import { hasNoteDrawing } from '../../../lib/noteDrawingsApi';
import { shouldDiscardEmptyNote } from '../../../lib/noteDiscardRules';
import {
  createNoteFolder,
  deleteNoteFolder,
  moveNoteFolder,
  renameNoteFolder,
  useNoteFolders,
} from '../../../lib/noteFoldersApi';
import { decryptNotePayload, encryptNotePayload, type LockableNotePayload } from '../../../lib/noteLockCrypto';
import { getNoteLockBlockReason } from '../../../lib/noteLockRules';
import {
  createNoteSmartFolder,
  deleteNoteSmartFolder,
  updateNoteSmartFolder,
  useNoteSmartFolders,
  type SmartFolderRuleV1,
} from '../../../lib/noteSmartFolders';

function getNotesStorageKey(userId: string): string {
  return `${STORAGE_KEYS.KEEP_NOTES_LOCAL}_${userId}`;
}

function readLocalFallback(userId: string): Note[] {
  if (!userId) return [];
  try {
    const local = localStorage.getItem(getNotesStorageKey(userId));
    return local ? (JSON.parse(local) as Note[]) : [];
  } catch {
    return [];
  }
}

/**
 * The react-query cache (keyed by notesKeys.list(userId)) is the single source of truth for
 * notes — there is no separate local useState<Note[]> to drift out of sync with it. `setNotes`
 * below is a queryClient.setQueryData wrapper with the exact Dispatch<SetStateAction<Note[]>>
 * shape useState would have given, so useNotesMutations.ts and every Keep.tsx callsite that
 * calls setNotes(...) work unchanged. See docs/FRONTEND_GUIDE.md.
 */
export function useNotesData(userId: string) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [unlockedState, setUnlockedState] = useState<{
    userId: string;
    payloads: Map<string, LockableNotePayload>;
  }>({ userId, payloads: new Map() });
  const unlockedPayloads = useMemo(
    () => (unlockedState.userId === userId ? unlockedState.payloads : new Map<string, LockableNotePayload>()),
    [unlockedState, userId],
  );
  const unlockSecretsRef = useRef(new Map<string, string>());
  const lockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
    unlockSecretsRef.current.clear();
  }, [userId]);

  const { data: serverNotes, isLoading: loading, isError, refetch: fetchNotes } = useNotes(userId);
  const { data: trashedNotes = [], isLoading: trashLoading, error: trashQueryError } = useTrashedNotes(userId);
  const { data: folders = [], isLoading: foldersLoading } = useNoteFolders(userId);
  const { data: smartFolders = [], isLoading: smartFoldersLoading } = useNoteSmartFolders(userId);
  const storedNotes = useMemo(
    () => (isError ? readLocalFallback(userId) : (serverNotes ?? [])),
    [isError, serverNotes, userId],
  );
  const notes = useMemo(() => storedNotes.map(note => {
    const payload = unlockedPayloads.get(note.id);
    return payload ? { ...note, ...payload } : note;
  }), [storedNotes, unlockedPayloads]);
  const unlockedNoteIds = useMemo(() => new Set(unlockedPayloads.keys()), [unlockedPayloads]);

  // Mirror every successful cache state to localStorage — the fallback an offline session reads.
  useEffect(() => {
    if (serverNotes !== undefined && userId) {
      try {
        localStorage.setItem(getNotesStorageKey(userId), JSON.stringify(serverNotes));
      } catch {
        // ignore quota errors
      }
    }
  }, [serverNotes, userId]);

  const setNotes = useCallback<React.Dispatch<React.SetStateAction<Note[]>>>((updater) => {
    queryClient.setQueryData<Note[]>(notesKeys.list(userId), (old) => {
      const base = old ?? [];
      return typeof updater === 'function' ? (updater as (prev: Note[]) => Note[])(base) : updater;
    });
  }, [queryClient, userId]);

  const {
    handleCreate,
    handleUpdate: handlePlainUpdate,
    handleDelete,
    handleTogglePin,
    handleNewNote,
  } = useNotesMutations({
    userId,
    notes,
    setNotes,
    setBusy,
    setError,
  });

  const lockNow = useCallback(() => {
    unlockSecretsRef.current.clear();
    setUnlockedState({ userId, payloads: new Map() });
    if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
    lockTimerRef.current = null;
  }, [userId]);

  const refreshLockTimer = useCallback(() => {
    if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
    lockTimerRef.current = setTimeout(lockNow, 5 * 60 * 1000);
  }, [lockNow]);

  useEffect(() => () => {
    if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
    unlockSecretsRef.current.clear();
  }, []);

  const handleUpdate = useCallback(async (id: string, patch: Partial<Note>) => {
    const stored = storedNotes.find(note => note.id === id);
    const secret = unlockSecretsRef.current.get(id);
    if (!stored?.is_locked) {
      await handlePlainUpdate(id, patch);
      return;
    }
    if (!secret) throw new Error('Sesja zablokowanej notatki wygasła.');

    const current = unlockedPayloads.get(id);
    if (!current) throw new Error('Sesja zablokowanej notatki wygasła.');
    const payload = {
      title: patch.title ?? current.title,
      content: patch.content ?? current.content,
      tags: patch.tags ?? current.tags,
    };
    const encrypted = await encryptNotePayload(payload, secret);
    await updateNoteApi(id, {
      title: payload.title,
      content: '',
      tags: [],
      is_locked: true,
      ...encrypted,
      ...(patch.color !== undefined ? { color: patch.color } : {}),
      ...(patch.folder_id !== undefined ? { folder_id: patch.folder_id } : {}),
    });
    setUnlockedState(previous => ({
      userId,
      payloads: new Map(previous.userId === userId ? previous.payloads : []).set(id, payload),
    }));
    setNotes(previous => previous.map(note => note.id === id ? {
      ...note,
      title: payload.title,
      content: '',
      tags: [],
      is_locked: true,
      ...encrypted,
    } : note));
    refreshLockTimer();
  }, [handlePlainUpdate, refreshLockTimer, setNotes, storedNotes, unlockedPayloads, userId]);

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
  }, [notes, setNotes]);

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

  const handleCreateFolder = useCallback(async (name: string, parentId: string | null = null) => {
    const created = await createNoteFolder(userId, name, parentId);
    await queryClient.invalidateQueries({ queryKey: notesKeys.folders(userId) });
    return created;
  }, [queryClient, userId]);

  const handleRenameFolder = useCallback(async (id: string, name: string) => {
    await renameNoteFolder(id, name);
    await queryClient.invalidateQueries({ queryKey: notesKeys.folders(userId) });
  }, [queryClient, userId]);

  const handleMoveFolder = useCallback(async (id: string, parentId: string | null) => {
    const siblings = folders.filter(folder => folder.parent_id === parentId);
    await moveNoteFolder(folders, id, parentId, siblings.length);
    await queryClient.invalidateQueries({ queryKey: notesKeys.folders(userId) });
  }, [folders, queryClient, userId]);

  const handleReorderFolder = useCallback(async (id: string, direction: 'up' | 'down') => {
    const folder = folders.find(item => item.id === id);
    if (!folder) return;
    const siblings = folders
      .filter(item => item.parent_id === folder.parent_id)
      .sort((a, b) => a.position - b.position || a.name.localeCompare(b.name, 'pl'));
    const index = siblings.findIndex(item => item.id === id);
    const target = siblings[direction === 'up' ? index - 1 : index + 1];
    if (!target) return;
    await Promise.all([
      moveNoteFolder(folders, folder.id, folder.parent_id, target.position),
      moveNoteFolder(folders, target.id, target.parent_id, folder.position),
    ]);
    await queryClient.invalidateQueries({ queryKey: notesKeys.folders(userId) });
  }, [folders, queryClient, userId]);

  const handleDeleteFolder = useCallback(async (id: string) => {
    await deleteNoteFolder(id);
    await queryClient.invalidateQueries({ queryKey: notesKeys.all });
    notify('Folder usunięty; notatki pozostały w Wszystkich', 'info');
  }, [queryClient]);

  const refreshSmartFolders = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['notes', 'smart-folders', userId] });
  }, [queryClient, userId]);

  const handleCreateSmartFolder = useCallback(async (name: string, rule: SmartFolderRuleV1) => {
    await createNoteSmartFolder(userId, name, rule);
    await refreshSmartFolders();
  }, [refreshSmartFolders, userId]);

  const handleUpdateSmartFolder = useCallback(async (id: string, name: string, rule: SmartFolderRuleV1) => {
    await updateNoteSmartFolder(id, { name, rule });
    await refreshSmartFolders();
  }, [refreshSmartFolders]);

  const handleDeleteSmartFolder = useCallback(async (id: string) => {
    await deleteNoteSmartFolder(id);
    await refreshSmartFolders();
  }, [refreshSmartFolders]);

  const handleLockNote = useCallback(async (note: Note, passphrase: string) => {
    const blockReason = getNoteLockBlockReason(note);
    if (blockReason) throw new Error(blockReason);
    const encrypted = await encryptNotePayload({
      title: note.title,
      content: note.content,
      tags: note.tags,
    }, passphrase);
    const patch: Partial<Note> = {
      title: note.title,
      content: '',
      tags: [],
      attachment_names: [],
      is_locked: true,
      ...encrypted,
    };
    await updateNoteApi(note.id, patch);
    setNotes(previous => previous.map(item => item.id === note.id ? { ...item, ...patch } : item));
    unlockSecretsRef.current.delete(note.id);
    setUnlockedState(previous => {
      const currentMap = previous.userId === userId ? previous.payloads : new Map();
      const next = new Map(currentMap);
      next.delete(note.id);
      return { userId, payloads: next };
    });
  }, [setNotes, userId]);

  const handleUnlockNote = useCallback(async (note: Note, passphrase: string): Promise<void> => {
    if (!note.locked_payload || !note.lock_salt || !note.lock_iv) {
      throw new Error('Brak danych potrzebnych do odblokowania notatki.');
    }
    const payload = await decryptNotePayload({
      locked_payload: note.locked_payload,
      lock_salt: note.lock_salt,
      lock_iv: note.lock_iv,
    }, passphrase);
    unlockSecretsRef.current.set(note.id, passphrase);
    setUnlockedState(previous => {
      const currentMap = previous.userId === userId ? previous.payloads : new Map();
      return { userId, payloads: new Map(currentMap).set(note.id, payload) };
    });
    refreshLockTimer();
  }, [refreshLockTimer, userId]);

  return {
    notes,
    trashedNotes,
    folders,
    smartFolders,
    setNotes,
    loading,
    trashLoading,
    trashError: trashQueryError ? (trashQueryError instanceof Error ? trashQueryError.message : String(trashQueryError)) : null,
    foldersLoading,
    smartFoldersLoading,
    error,
    setError,
    busy,
    setBusy,
    fetchNotes,
    handleCreate,
    handleUpdate,
    handleDelete,
    handleTogglePin,
    handleNewNote,
    handleDeleteTag,
    handleRenameTag,
    handleReorder,
    handleRestore,
    handlePermanentDelete,
    handleDiscardEmpty,
    handleCreateFolder,
    handleRenameFolder,
    handleMoveFolder,
    handleReorderFolder,
    handleDeleteFolder,
    handleCreateSmartFolder,
    handleUpdateSmartFolder,
    handleDeleteSmartFolder,
    handleLockNote,
    handleUnlockNote,
    lockNow,
    unlockedNoteIds,
  };
}
