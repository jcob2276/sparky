import { useMemo, useState } from 'react';
import { noteReferenceContext } from '../../lib/noteReferences';
import type { Note } from '../../lib/notesApi';
import { Pressable } from '../ui/ControlPrimitives';

export default function NoteReferences({ note, notes, onNavigate }: {
  note: Note; notes: Note[]; onNavigate: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const { outgoing, backlinks } = useMemo(() => expanded ? noteReferenceContext(note, notes) : { outgoing: [], backlinks: [] }, [expanded, note, notes]);
  return <details className="border-t border-border-custom py-3 text-xs" onToggle={event => setExpanded(event.currentTarget.open)}>
    <summary className="cursor-pointer font-semibold">Powiązane notatki</summary>
    {expanded && !outgoing.length && !backlinks.length && <p className="mt-2 text-text-muted">Brak powiązanych notatek.</p>}
    {outgoing.length > 0 && <div className="mt-2 space-y-1">
      <p className="text-text-muted">Odwołania z tej notatki</p>
      {outgoing.map(item => item.missing
        ? <p key={item.id} className="text-text-muted">{item.title} — notatka niedostępna</p>
        : <Pressable key={item.id} variant="ghost" size="sm" onClick={() => onNavigate(item.id)}>{item.title}</Pressable>)}
    </div>}
    {backlinks.length > 0 && <div className="mt-2 space-y-1">
      <p className="text-text-muted">Notatki odwołujące się tutaj</p>
      {backlinks.map(item => <Pressable key={item.id} variant="ghost" size="sm" onClick={() => onNavigate(item.id)}>{item.title || 'Bez tytułu'}</Pressable>)}
    </div>}
  </details>;
}
