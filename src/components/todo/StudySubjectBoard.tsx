import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { CalendarClock } from 'lucide-react';
import { Pressable } from '../ui/ControlPrimitives';
import { getTodayWarsaw } from '../../lib/date';
import { doneRatio, dueLabel, subjectHue, subjectMonogram, type DueTone } from '../../lib/todo/studyBoard';
import StudySubjectPanel, { type SubjectActions } from './StudySubjectPanel';

export interface BoardSubject extends SubjectActions {
  id: string;
  title: string;
  openCount: number;
  doneCount: number;
  /** Najbliższy termin otwartego zadania (YYYY-MM-DD) albo null. */
  nextDue: string | null;
  children: ReactNode;
}

const RING_RADIUS = 24;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;
const TONE_CLASS: Record<DueTone, string> = { overdue: 'text-danger', soon: 'text-warning', calm: 'text-text-muted' };

function Ring({ ratio, label }: { ratio: number; label: string }) {
  return (
    <span className="relative flex h-14 w-14 shrink-0 items-center justify-center" aria-hidden="true">
      <svg viewBox="0 0 56 56" className="absolute inset-0 -rotate-90">
        <circle cx="28" cy="28" r={RING_RADIUS} fill="none" stroke="currentColor" strokeOpacity="0.2" strokeWidth="5" />
        <circle cx="28" cy="28" r={RING_RADIUS} fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round"
          strokeDasharray={`${RING_LENGTH * ratio} ${RING_LENGTH}`} />
      </svg>
      <span className="text-xs font-bold tracking-tight">{label}</span>
    </span>
  );
}

function Tile({ subject, selected, today, onSelect }: { subject: BoardSubject; selected: boolean; today: string; onSelect: () => void }) {
  const due = subject.openCount > 0 ? dueLabel(today, subject.nextDue) : null;
  const empty = subject.openCount + subject.doneCount === 0;
  return (
    <Pressable
      variant="ghost"
      aria-pressed={selected}
      aria-label={`${subject.title}: ${subject.openCount} do zrobienia, ${subject.doneCount} wykonanych`}
      onClick={onSelect}
      style={{ '--subject-hue': subjectHue(subject.title) } as CSSProperties}
      className="study-tile flex min-h-[8.5rem] w-full flex-col items-start gap-2 p-3 text-left"
    >
      <Ring ratio={doneRatio(subject.openCount, subject.doneCount)} label={subjectMonogram(subject.title)} />
      <span className="line-clamp-3 text-sm font-semibold leading-snug text-text-primary">{subject.title}</span>
      <span className="mt-auto flex w-full flex-col gap-0.5 text-2xs font-semibold">
        <span className="tabular-nums text-text-secondary">
          {empty ? 'Dodaj pierwsze zadanie' : subject.openCount === 0 ? 'Wszystko zrobione' : `${subject.openCount} do zrobienia`}
        </span>
        {due && <span className={`flex items-center gap-1 ${TONE_CLASS[due.tone]}`}><CalendarClock size={11} aria-hidden="true" />{due.text}</span>}
      </span>
    </Pressable>
  );
}

/** Przedmioty jako kafle z pierścieniem postępu; dotknięty kafel otwiera panel z zadaniami pod siatką. */
export default function StudySubjectBoard({ subjects }: { subjects: BoardSubject[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  // Panel otwiera się pod siatką, więc na telefonie przewijamy do niego po wybraniu kafla.
  useEffect(() => {
    if (selectedId) panelRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
  }, [selectedId]);
  const today = getTodayWarsaw();
  const selected = subjects.find((s) => s.id === selectedId) ?? null;
  const open = subjects.reduce((sum, s) => sum + s.openCount, 0);
  const done = subjects.reduce((sum, s) => sum + s.doneCount, 0);
  const nearest = subjects
    .flatMap((s) => (s.openCount > 0 && s.nextDue ? [{ title: s.title, label: dueLabel(today, s.nextDue)!, due: s.nextDue }] : []))
    .sort((a, b) => a.due.localeCompare(b.due))[0];

  if (subjects.length === 0) return null;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 rounded-2xl bg-surface-2/60 px-3.5 py-2.5">
        <p className="text-sm font-semibold text-text-primary">Semestr: <span className="tabular-nums">{done}</span> z <span className="tabular-nums">{open + done}</span> zadań</p>
        {nearest && <p className={`min-w-0 truncate text-2xs font-semibold ${TONE_CLASS[nearest.label.tone]}`}>Najbliżej: {nearest.label.text}</p>}
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {subjects.map((subject) => (
          <Tile key={subject.id} subject={subject} today={today} selected={subject.id === selectedId}
            onSelect={() => setSelectedId((current) => (current === subject.id ? null : subject.id))} />
        ))}
      </div>
      {selected && (
        <div ref={panelRef} className="scroll-mt-20">
          <StudySubjectPanel title={selected.title} onSave={selected.onSave} onRename={selected.onRename} onDelete={selected.onDelete}>
            {selected.children}
          </StudySubjectPanel>
        </div>
      )}
    </div>
  );
}
