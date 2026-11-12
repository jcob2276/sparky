import { confirmDialog } from '../../lib/notify';
import NoteQuickActions from './NoteQuickActions';
import type { Note } from './keepUtils';

export interface NoteActionMenuState { note: Note; point?: { x: number; y: number } }

interface Props {
  menu: NoteActionMenuState;
  onClose: () => void;
  onTogglePin: (note: Note) => void;
  onUpdate: (id: string, patch: Partial<Note>) => void;
  onDelete: (id: string) => void;
  onMove: (note: Note) => void;
  onLockNote?: (note: Note) => Promise<void>;
  onShareNote?: (note: Note) => void;
}

/** Wires the context menu actions to the notes handlers; every action closes the menu first. */
export default function NoteActionMenuHost({ menu, onClose, onTogglePin, onUpdate, onDelete, onMove, onLockNote, onShareNote }: Props) {
  const { note } = menu;
  const run = (action: () => void) => () => { onClose(); action(); };
  return (
    <NoteQuickActions
      note={note}
      point={menu.point}
      onClose={onClose}
      onTogglePin={run(() => onTogglePin(note))}
      onLock={onLockNote && !note.is_locked ? run(() => { void onLockNote(note); }) : undefined}
      onShare={onShareNote ? run(() => onShareNote(note)) : undefined}
      onMove={run(() => onMove(note))}
      onArchive={run(() => onUpdate(note.id, { is_archived: true }))}
      onDelete={run(() => { void confirmDialog('Przenieść notatkę do Kosza?').then(ok => { if (ok) onDelete(note.id); }); })}
    />
  );
}
