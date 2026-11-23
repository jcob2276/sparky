import { useId, useState, type ReactNode } from 'react';
import { Check, Pencil, Trash2, X } from 'lucide-react';
import { ControlInput, Pressable } from '../ui/ControlPrimitives';
import StudyAssignmentForm from './StudyAssignmentForm';

export interface SubjectActions {
  onSave: (title: string, dueDate: string) => Promise<void>;
  onRename: (title: string) => void;
  onDelete: () => void;
}

interface Props extends SubjectActions {
  title: string;
  children: ReactNode;
}

/** Panel wybranego przedmiotu: nazwa (zmiana i usunięcie), lista zadań i dodawanie nowego. */
export default function StudySubjectPanel({ title, children, onSave, onRename, onDelete }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(title);
  const headingId = useId();

  function commitRename() {
    const next = draft.trim();
    setEditing(false);
    if (next && next !== title) onRename(next);
  }

  return (
    <section aria-labelledby={headingId} className="study-panel overflow-hidden rounded-3xl border border-border-custom/60 bg-surface-solid/60">
      <div className="flex items-center gap-1 px-4 pt-3">
        {editing ? (
          <form className="flex min-w-0 flex-1 items-center gap-2" onSubmit={(event) => { event.preventDefault(); commitRename(); }}>
            <ControlInput
              autoFocus value={draft} onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Escape') setEditing(false); }}
              aria-label={`Nazwa przedmiotu: ${title}`}
              className="h-11 min-w-0 flex-1 rounded-lg border border-border-custom bg-surface-solid px-3 text-base"
            />
            <Pressable type="submit" aria-label="Zapisz nazwę" className="todo-tap-target text-success"><Check size={18} /></Pressable>
            <Pressable aria-label="Anuluj zmianę nazwy" onClick={() => setEditing(false)} className="todo-tap-target text-text-muted"><X size={18} /></Pressable>
          </form>
        ) : (
          <>
            <h3 id={headingId} className="min-w-0 flex-1 text-base font-semibold leading-snug text-text-primary">{title}</h3>
            <Pressable aria-label={`Zmień nazwę przedmiotu: ${title}`} onClick={() => { setDraft(title); setEditing(true); }} className="todo-tap-target shrink-0 text-text-muted hover:text-text-primary"><Pencil size={16} /></Pressable>
            <Pressable aria-label={`Usuń przedmiot: ${title}`} onClick={onDelete} className="todo-tap-target shrink-0 text-text-muted hover:text-danger"><Trash2 size={16} /></Pressable>
          </>
        )}
      </div>
      {children}
      <StudyAssignmentForm onSave={onSave} />
    </section>
  );
}
