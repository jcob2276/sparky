import { useId, useState, type ReactNode } from 'react';
import { BookOpen, Check, ChevronDown, Pencil, Trash2, X } from 'lucide-react';
import { ControlInput, Pressable } from '../ui/ControlPrimitives';
import StudyAssignmentForm from './StudyAssignmentForm';
import { pluralPl } from '../../lib/formatPl';

interface StudySubjectProps {
  title: string;
  openCount: number;
  doneCount: number;
  children: ReactNode;
  onSave: (title: string, dueDate: string) => Promise<void>;
  onRename: (title: string) => void;
  onDelete: () => void;
}

export default function StudySubject({ title, openCount, doneCount, children, onSave, onRename, onDelete }: StudySubjectProps) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(title);
  const panelId = useId();

  function commitRename() {
    const next = draft.trim();
    setEditing(false);
    if (next && next !== title) onRename(next);
  }

  return (
    <article className="overflow-hidden rounded-lg border border-border-custom/60 bg-surface-solid/40">
      <div className="flex items-center">
        {editing ? (
          <form
            className="flex min-h-16 min-w-0 flex-1 items-center gap-2 px-3 py-3 sm:px-4"
            onSubmit={event => { event.preventDefault(); commitRename(); }}
          >
            <BookOpen size={18} className="shrink-0 text-primary" />
            <ControlInput
              autoFocus value={draft} onChange={event => setDraft(event.target.value)}
              onKeyDown={event => { if (event.key === 'Escape') setEditing(false); }}
              aria-label={`Nazwa przedmiotu: ${title}`}
              className="h-11 min-w-0 flex-1 rounded-lg border border-border-custom bg-surface-solid px-3 text-base"
            />
            <Pressable type="submit" aria-label="Zapisz nazwę" className="todo-tap-target text-success"><Check size={18} /></Pressable>
            <Pressable aria-label="Anuluj zmianę nazwy" onClick={() => setEditing(false)} className="todo-tap-target text-text-muted"><X size={18} /></Pressable>
          </form>
        ) : (
          <>
            <h3 className="min-w-0 flex-1">
              <Pressable
                aria-expanded={expanded} aria-controls={panelId}
                onClick={() => setExpanded(value => !value)}
                className="flex min-h-16 w-full items-center gap-3 px-3 py-3 text-left hover:bg-primary/5 focus-visible:shadow-focus sm:px-4"
              >
                <BookOpen size={18} className="shrink-0 text-primary" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold leading-snug text-text-primary">{title}</span>
                  <span className="mt-1 block text-xs font-normal text-text-muted">
                    {openCount || doneCount ? `${openCount} do zrobienia · ${doneCount} ${pluralPl(doneCount, 'wykonane', 'wykonane', 'wykonanych')}` : 'Brak zadań — dodaj pierwsze'}
                  </span>
                </span>
                <ChevronDown size={18} className={`shrink-0 text-text-muted ${expanded ? 'rotate-180' : ''}`} />
              </Pressable>
            </h3>
            <Pressable
              aria-label={`Zmień nazwę przedmiotu: ${title}`}
              onClick={() => { setDraft(title); setEditing(true); }}
              className="todo-tap-target shrink-0 text-text-muted hover:text-text-primary"
            ><Pencil size={16} /></Pressable>
            <Pressable
              aria-label={`Usuń przedmiot: ${title}`} onClick={onDelete}
              className="todo-tap-target shrink-0 pr-1 text-text-muted hover:text-danger"
            ><Trash2 size={16} /></Pressable>
          </>
        )}
      </div>
      <div id={panelId} hidden={!expanded}>
        {children}
        <StudyAssignmentForm onSave={onSave} />
      </div>
    </article>
  );
}
