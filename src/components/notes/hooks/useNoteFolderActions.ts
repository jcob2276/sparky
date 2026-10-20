import { useCallback } from 'react';
import type { QueryClient } from '@tanstack/react-query';
import { notesKeys } from '../../../lib/queryKeys';
import { notify } from '../../../lib/notify';
import {
  createNoteFolder,
  deleteNoteFolder,
  moveNoteFolder,
  renameNoteFolder,
  type NoteFolder,
} from '../../../lib/noteFoldersApi';
import {
  createNoteSmartFolder,
  deleteNoteSmartFolder,
  updateNoteSmartFolder,
  type SmartFolderRuleV1,
} from '../../../lib/noteSmartFolders';

interface NoteFolderActionsDeps {
  queryClient: QueryClient;
  userId: string;
  folders: NoteFolder[];
}

/** Folder and smart-folder CRUD handlers that invalidate their react-query caches. */
export function useNoteFolderActions({ queryClient, userId, folders }: NoteFolderActionsDeps) {
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

  return {
    handleCreateFolder,
    handleRenameFolder,
    handleMoveFolder,
    handleReorderFolder,
    handleDeleteFolder,
    handleCreateSmartFolder,
    handleUpdateSmartFolder,
    handleDeleteSmartFolder,
  };
}
