import { useCallback, useEffect, useRef, useState } from 'react';
import type { Note } from './keepUtils';
import { loadEmergencyNoteDraft, removeEmergencyNoteDraft, saveEmergencyNoteDraft } from '../../lib/noteDraftStorage';
import { canonicalizeNoteContent, deriveNoteMetadata } from '../../lib/noteText';

export type NoteSaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

type SavedDraft = Pick<Note, 'title' | 'content' | 'color' | 'tags' | 'folder_id'>;

interface DraftState extends Omit<SavedDraft, 'tags'> {
  tagsInput: string;
}

interface UseNoteDraftAutosaveOptions {
  note: Note;
  onSave: (id: string, patch: SavedDraft) => void | Promise<void>;
  delay?: number;
}

interface SaveJob {
  noteId: string;
  draft: SavedDraft;
}

const fromNote = (note: Note): DraftState => ({
  title: note.title,
  content: canonicalizeNoteContent(note.title, note.content),
  color: note.color,
  folder_id: note.folder_id,
  tagsInput: note.tags.join(', '),
});

const toSavedDraft = (draft: DraftState): SavedDraft => {
  const content = draft.content.trim();
  const metadata = deriveNoteMetadata(content);
  return {
    title: metadata.title,
    content,
    color: draft.color,
    folder_id: draft.folder_id,
    tags: metadata.tags,
  };
};

const draftsEqual = (left: SavedDraft, right: SavedDraft) => (
  left.title === right.title
  && left.content === right.content
  && left.color === right.color
  && left.folder_id === right.folder_id
  && JSON.stringify(left.tags) === JSON.stringify(right.tags)
);

export function useNoteDraftAutosave({
  note,
  onSave,
  delay = 1_000,
}: UseNoteDraftAutosaveOptions) {
  const cloudDraft = fromNote(note);
  const recoveredDraft = note.is_locked ? null : loadEmergencyNoteDraft(note.id);
  const initialDraft = recoveredDraft ? { ...recoveredDraft, tagsInput: recoveredDraft.tags.join(', ') } : cloudDraft;
  const initialSavedDraft = toSavedDraft(cloudDraft);
  const [draft, setDraft] = useState(initialDraft);
  const [saveStatus, setSaveStatus] = useState<NoteSaveStatus>(recoveredDraft ? 'dirty' : 'idle');
  const draftRef = useRef(initialDraft);
  const baselineRef = useRef(initialSavedDraft);
  const savedDraftsRef = useRef(new Map([[note.id, initialSavedDraft]]));
  const noteIdRef = useRef(note.id);
  const saveRef = useRef(onSave);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queuedSavesRef = useRef(new Map<string, SaveJob>());
  const inFlightJobRef = useRef<SaveJob | null>(null);
  const drainRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    saveRef.current = onSave;
  }, [onSave]);

  const clearTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  const startDrain = useCallback(() => {
    if (drainRef.current || !queuedSavesRef.current.size) return;

    const drain = async () => {
      while (queuedSavesRef.current.size) {
        const job = queuedSavesRef.current.values().next().value!;
        queuedSavesRef.current.delete(job.noteId);
        inFlightJobRef.current = job;
        setSaveStatus('saving');
        try {
          const result = saveRef.current(job.noteId, job.draft);
          if (result instanceof Promise) await result;
          savedDraftsRef.current.set(job.noteId, job.draft);
          if (!queuedSavesRef.current.has(job.noteId)) removeEmergencyNoteDraft(job.noteId);
          if (job.noteId === noteIdRef.current) {
            baselineRef.current = job.draft;
          }
        } catch {
          // Coalesce versions of the same note while preserving other notes.
          if (!queuedSavesRef.current.has(job.noteId)) queuedSavesRef.current.set(job.noteId, job);
          saveEmergencyNoteDraft(job.noteId, queuedSavesRef.current.get(job.noteId)!.draft);
          setSaveStatus('error');
          break;
        } finally {
          inFlightJobRef.current = null;
        }
      }

      if (!queuedSavesRef.current.size) {
        const saved = savedDraftsRef.current.get(noteIdRef.current);
        const current = toSavedDraft(draftRef.current);
        setSaveStatus(saved && draftsEqual(saved, current) ? 'saved' : 'dirty');
      }
    };

    const activeDrain = drain();
    drainRef.current = activeDrain;
    void activeDrain.finally(() => {
      if (drainRef.current === activeDrain) drainRef.current = null;
    });
  }, []);

  const flush = useCallback(() => {
    clearTimer();
    const next = toSavedDraft(draftRef.current);
    const saved = savedDraftsRef.current.get(noteIdRef.current) ?? baselineRef.current;
    if (draftsEqual(saved, next) && !queuedSavesRef.current.size) return;

    queuedSavesRef.current.set(noteIdRef.current, { noteId: noteIdRef.current, draft: next });
    saveEmergencyNoteDraft(noteIdRef.current, next);
    startDrain();
  }, [clearTimer, startDrain]);

  const flushAndWait = useCallback(async () => {
    flush();
    while (drainRef.current) {
      await drainRef.current;
    }
  }, [flush]);

  const schedule = useCallback(() => {
    clearTimer();
    setSaveStatus('dirty');
    timerRef.current = setTimeout(flush, delay);
  }, [clearTimer, delay, flush]);

  const updateDraft = useCallback((patch: Partial<DraftState>) => {
    draftRef.current = { ...draftRef.current, ...patch };
    setDraft({ ...draftRef.current });
    schedule();
  }, [schedule]);

  useEffect(() => {
    if (noteIdRef.current === note.id) return;
    flush();
    const pending = queuedSavesRef.current.get(note.id)
      ?? (inFlightJobRef.current?.noteId === note.id ? inFlightJobRef.current : null);
    const recovered = note.is_locked ? null : (pending?.draft ?? loadEmergencyNoteDraft(note.id));
    const next = recovered ? { ...recovered, tagsInput: recovered.tags.join(', ') } : fromNote(note);
    noteIdRef.current = note.id;
    draftRef.current = next;
    const saved = savedDraftsRef.current.get(note.id) ?? toSavedDraft(fromNote(note));
    savedDraftsRef.current.set(note.id, saved);
    baselineRef.current = saved;
    setDraft(next);
    setSaveStatus(recovered ? 'dirty' : 'idle');
  }, [flush, note]);

  useEffect(() => () => flush(), [flush]);

  return {
    ...draft,
    saveStatus,
    flush,
    flushAndWait,
    retrySave: flush,
    setTitle: (title: string) => updateDraft({ title }),
    setContent: (content: string) => updateDraft({ content }),
    setColor: (color: string) => updateDraft({ color }),
    setFolderId: (folder_id: string | null) => updateDraft({ folder_id }),
    setTagsInput: (tagsInput: string) => updateDraft({ tagsInput }),
  };
}
