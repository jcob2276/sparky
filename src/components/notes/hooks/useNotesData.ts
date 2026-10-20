import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNotes, useTrashedNotes, Note, updateNoteApi } from '../../../lib/notesApi';
import { notesKeys } from '../../../lib/queryKeys';
import { useNotesMutations } from './useNotesMutations';
import { useNoteFolders } from '../../../lib/noteFoldersApi';
import { encryptNotePayload, decryptNotePayload, type LockableNotePayload } from '../../../lib/noteLockCrypto';
import { getNoteLockBlockReason } from '../../../lib/noteLockRules';
import { useNoteSmartFolders } from '../../../lib/noteSmartFolders';
import { getNotesStorageKey, readLocalFallback } from './notesLocalFallback';
import { useNoteListActions } from './useNoteListActions';
import { useNoteTrashActions } from './useNoteTrashActions';
import { useNoteFolderActions } from './useNoteFolderActions';


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

  const { handleDeleteTag, handleRenameTag, handleReorder } = useNoteListActions({
    notes, setNotes, setBusy, setError,
  });
  const { handleRestore, handlePermanentDelete, handleDiscardEmpty } = useNoteTrashActions({
    queryClient, userId, setNotes,
  });
  const {
    handleCreateFolder,
    handleRenameFolder,
    handleMoveFolder,
    handleReorderFolder,
    handleDeleteFolder,
    handleCreateSmartFolder,
    handleUpdateSmartFolder,
    handleDeleteSmartFolder,
  } = useNoteFolderActions({ queryClient, userId, folders });

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
