import { useId, useState, type ReactNode } from 'react';
import { BookOpen, ChevronDown } from 'lucide-react';
import { Pressable } from '../ui/ControlPrimitives';
import StudyAssignmentForm from './StudyAssignmentForm';

interface StudySubjectProps {
  title: string;
  openCount: number;
  doneCount: number;
  children: ReactNode;
  onSave: (title: string, dueDate: string) => Promise<void>;
}

export default function StudySubject({ title, openCount, doneCount, children, onSave }: StudySubjectProps) {
  const [expanded, setExpanded] = useState(false);
  const panelId = useId();

  return (
    <article className="overflow-hidden rounded-xl border border-border-custom/60 bg-surface-solid/40">
      <h3>
        <Pressable
          aria-expanded={expanded} aria-controls={panelId}
          onClick={() => setExpanded(value => !value)}
          className="flex min-h-16 w-full items-center gap-3 px-3 py-3 text-left hover:bg-primary/5 focus-visible:shadow-focus sm:px-4"
        >
          <BookOpen size={18} className="shrink-0 text-primary" />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold leading-snug text-text-primary">{title}</span>
            <span className="mt-1 block text-xs font-normal text-text-muted">
              {openCount || doneCount ? `${openCount} do zrobienia · ${doneCount} wykonanych` : 'Brak zadań — dodaj pierwsze'}
            </span>
          </span>
          <ChevronDown size={18} className={`shrink-0 text-text-muted ${expanded ? 'rotate-180' : ''}`} />
        </Pressable>
      </h3>
      <div id={panelId} hidden={!expanded}>
        {children}
        <StudyAssignmentForm onSave={onSave} />
      </div>
    </article>
  );
}
