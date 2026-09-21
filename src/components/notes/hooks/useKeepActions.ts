/**
 * @file useKeepActions.ts
 * @role Wydzielone akcje eksportu, blokady hasłem, wyboru notatki i zmiany widoku dla Keep.
 */
import { useState, useEffect } from 'react';
import {
  exportNotesArchive,
  exportSingleNote,
  exportSingleNotePdf,
  shareNoteCopy,
} from '../../../lib/notesExport';
import { notify, promptDialog } from '../../../lib/notify';
import { getPlainText } from '../../../lib/noteText';
import type { Note } from '../../../lib/notesApi';
import type { NoteFolder } from '../../../lib/noteFoldersApi';

interface UseKeepActionsOptions {
  userId: string;
  notes: Note[];
  trashedNotes: Note[];
  folders: NoteFolder[];
  editingId: string | null;
  setEditingId: (id: string | null) => void;
  unlockedNoteIds: Set<string>;
  handleOpenNote: (id: string) => Promise<void>;
  handleLockNote: (note: Note, passphrase: string) => Promise<void>;
  handleDiscardEmpty: (id: string) => Promise<void>;
  handleNewNote: () => Promise<string | null>;
  setViewMode: (mode: 'list' | 'gallery') => void;
}

export function useKeepActions({
  userId,
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
}: UseKeepActionsOptions) {
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const locked = notes.find(
      (note) => note.id === editingId && note.is_locked && !unlockedNoteIds.has(note.id),
    );
    if (!locked) return;
    setEditingId(null);
    void handleOpenNote(locked.id);
  }, [editingId, handleOpenNote, notes, setEditingId, unlockedNoteIds]);

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

  const handleExportNote = (note: Note) => {
    void exportSingleNote(note, folders.find((folder) => folder.id === note.folder_id)).catch((error) => {
      notify(error instanceof Error ? error.message : 'Eksport nie powiódł się', 'error');
    });
  };

  const handleRequestLock = async (note: Note) => {
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
    const current = notes.find((note) => note.id === editingId);
    if (current && !current.title.trim() && !getPlainText(current.content)) {
      void handleDiscardEmpty(current.id);
    }
    void handleOpenNote(id);
  };

  const handleExportPdf = (note: Note) => {
    void exportSingleNotePdf(note, folders.find((folder) => folder.id === note.folder_id)).catch((error) => {
      notify(error instanceof Error ? error.message : 'Eksport PDF nie powiódł się', 'error');
    });
  };

  const handleShareNote = (note: Note) => {
    void shareNoteCopy(note, folders.find((folder) => folder.id === note.folder_id)).catch((error) => {
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

  return {
    exporting,
    handleExportArchive,
    handleExportNote,
    handleRequestLock,
    handleSelectNote,
    handleExportPdf,
    handleShareNote,
    createNewNote,
    changeViewMode,
  };
}
