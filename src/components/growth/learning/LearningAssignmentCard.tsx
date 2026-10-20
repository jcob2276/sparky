import { BookOpen, FileText, GraduationCap, Headphones, Trash2, Video, type LucideIcon } from 'lucide-react';
import {
  PACE_LABELS,
  TYPE_LABELS,
  UNIT_LABELS,
  paceStatus,
  progressPct,
  type LearningAssignment,
  type LearningResourceType,
  type LearningUnit,
  type PaceStatus,
} from '../../../lib/learning/learningModel';
import { Pressable } from '../../ui/ControlPrimitives';
import LearningSlotButton from './LearningSlotButton';

const TYPE_ICONS: Record<LearningResourceType, LucideIcon> = {
  book: BookOpen,
  course: GraduationCap,
  article: FileText,
  video: Video,
  podcast: Headphones,
  other: FileText,
};

const PACE_TONE: Record<PaceStatus, string> = {
  done: 'text-success bg-success/10',
  ahead: 'text-info bg-info/10',
  on_track: 'text-text-secondary bg-surface-3',
  behind: 'text-warning bg-warning/10',
};

function formatDue(due: string): string {
  const [, month, day] = due.split('-');
  return `${Number(day)}.${month}`;
}

interface LearningAssignmentCardProps {
  assignment: LearningAssignment;
  skillLabel?: string | null;
  today: string;
  loggedToday: number;
  busy: boolean;
  onToggleToday: () => void;
  onDrop: () => void;
}

export default function LearningAssignmentCard({
  assignment,
  skillLabel,
  today,
  loggedToday,
  busy,
  onToggleToday,
  onDrop,
}: LearningAssignmentCardProps) {
  const type = assignment.resource_type as LearningResourceType;
  const unit = assignment.unit as LearningUnit;
  const Icon = TYPE_ICONS[type] ?? FileText;
  const pct = progressPct(assignment);
  const pace = paceStatus(assignment, today, loggedToday);
  const done = Number(assignment.done);
  const total = Number(assignment.total);

  return (
    <li className="rounded-2xl border border-border-custom/50 bg-surface/40 p-4 space-y-3">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon size={16} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-black text-text-primary leading-snug">{assignment.title}</h3>
          <p className="mt-0.5 text-xs text-text-muted">
            {TYPE_LABELS[type]}
            {skillLabel ? ` · ${skillLabel}` : ''}
            {` · do ${formatDue(assignment.due_date)}`}
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-3xs font-black uppercase tracking-wider ${PACE_TONE[pace]}`}>
          {PACE_LABELS[pace]}
        </span>
      </div>

      <div className="space-y-1">
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          aria-label={`Postęp: ${assignment.title}`}
          className="h-2 w-full overflow-hidden rounded-full bg-border-custom/25"
        >
          <div className={`h-full rounded-full ${pace === 'done' ? 'bg-success' : 'bg-primary'}`} style={{ width: `${pct}%` }} />
        </div>
        <p className="text-xs font-semibold text-text-muted tabular-nums">
          {done} / {total} {UNIT_LABELS[unit]} · {pct}%
        </p>
      </div>

      <div className="flex items-end gap-2 border-t border-border-custom/20 pt-3">
        <div className="min-w-0 flex-1">
          <LearningSlotButton assignment={assignment} today={today} loggedToday={loggedToday} busy={busy} onToggle={onToggleToday} />
        </div>
        <Pressable
          onClick={onDrop}
          aria-label={`Odpuść: ${assignment.title}`}
          title="Odpuść w tym miesiącu"
          className="h-8 w-8 shrink-0 rounded-lg flex items-center justify-center text-text-muted hover:text-danger hover:bg-danger/10 transition-colors"
        >
          <Trash2 size={15} />
        </Pressable>
      </div>
    </li>
  );
}
