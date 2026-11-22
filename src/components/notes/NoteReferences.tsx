import { useMemo } from 'react';
import { noteReferenceContext } from '../../lib/noteReferences';
import type { Note } from '../../lib/notesApi';
import { Pressable } from '../ui/ControlPrimitives';

export default function NoteReferences({ note, notes, onNavigate }: {
  note: Note; notes: Note[]; onNavigate: (id: string) => void;
}) {
  const { outgoing, backlinks } = useMemo(() => noteReferenceContext(note, notes), [note, notes]);

  // If there are no references, do not clutter the note writing canvas.
  if (!outgoing.length && !backlinks.length) return null;

  return (
    <details className="mt-8 border-t border-border-custom/20 pt-3 pb-6 text-xs text-text-muted">
      <summary className="cursor-pointer font-medium hover:text-text-primary select-none">
        Powiązane notatki ({outgoing.length + backlinks.length})
      </summary>
      {outgoing.length > 0 && <div className="mt-2 space-y-1">
        <p className="text-text-muted font-medium">Odwołania z tej notatki</p>
        {outgoing.map(item => item.missing
          ? <p key={item.id} className="text-text-muted">{item.title} — notatka niedostępna</p>
          : <Pressable key={item.id} variant="ghost" size="sm" onClick={() => onNavigate(item.id)}>{item.title}</Pressable>)}
      </div>}
      {backlinks.length > 0 && <div className="mt-2 space-y-1">
        <p className="text-text-muted font-medium">Notatki odwołujące się tutaj</p>
        {backlinks.map(item => <Pressable key={item.id} variant="ghost" size="sm" onClick={() => onNavigate(item.id)}>{item.title || 'Bez tytułu'}</Pressable>)}
      </div>}
    </details>
  );
}
