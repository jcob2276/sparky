import { useReducedMotion } from 'framer-motion';
import {
  LIFE_OBLIGATION_KIND_LABELS,
  LIFE_OBLIGATION_RECURRENCE_LABELS,
  type LifeObligationKind,
  type LifeObligationRecurrence,
} from '@vanguard/domain';
import { Cake, Car, FileText, Trash2, Clock, CheckCircle2, Circle, ListTodo, FileSpreadsheet } from 'lucide-react';
import { Pressable } from '../ui/ControlPrimitives';
import { formatLongDateWarsaw } from '../../lib/date';
import {
  countdownLabel,
  initialsFrom,
  type DerivedObligation,
} from './terminyDerived';

const KIND_ICON: Record<'people' | 'vehicle' | 'document', typeof Cake> = {
  people: Cake,
  vehicle: Car,
  document: FileText,
};

const KIND_ACCENT: Record<'people' | 'vehicle' | 'document', string> = {
  people: 'text-primary bg-primary/12 ring-1 ring-primary/25',
  vehicle: 'text-info bg-info/12 ring-1 ring-info/25',
  document: 'text-warning bg-warning/12 ring-1 ring-warning/25',
};

const RING_ACCENT: Record<'people' | 'vehicle' | 'document', string> = {
  people: 'stroke-primary',
  vehicle: 'stroke-info',
  document: 'stroke-warning',
};

interface Props {
  row: DerivedObligation;
  onDelete: () => void;
  onEdit?: () => void;
  onComplete?: () => void;
  onConvertToTodo?: () => void;
  compact?: boolean;
}

function ObligationProgressRing({
  row,
  kind,
  compact,
  reduceMotion,
}: {
  row: DerivedObligation;
  kind: 'people' | 'vehicle' | 'document';
  compact: boolean;
  reduceMotion: boolean | null;
}) {
  const Icon = KIND_ICON[kind];
  const ringClass = compact ? 'h-11 w-11' : 'h-13 w-13';
  const r = compact ? 19 : 23;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - Math.max(0, Math.min(1, row.ringProgress)));
  const cx = compact ? 22 : 26;

  return (
    <div className={`relative shrink-0 ${ringClass}`}>
      <svg viewBox={`0 0 ${cx * 2} ${cx * 2}`} className="h-full w-full -rotate-90" aria-hidden>
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="currentColor" strokeWidth={3} className="text-border-custom/30" />
        <circle
          cx={cx}
          cy={cx}
          r={r}
          fill="none"
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className={`${RING_ACCENT[kind]} ${reduceMotion ? '' : 'transition-[stroke-dashoffset] duration-500 ease-out'}`}
        />
      </svg>
      <div className={`absolute inset-1.5 flex items-center justify-center rounded-full text-xs font-semibold ${KIND_ACCENT[kind]}`}>
        {kind === 'people'
          ? initialsFrom(row.item.title, row.item.related_name)
          : <Icon size={compact ? 14 : 16} strokeWidth={2.2} />}
      </div>
    </div>
  );
}

export function TerminyObligationCard({
  row,
  onDelete,
  onEdit,
  onComplete,
  onConvertToTodo,
  compact = false,
}: Props) {
  const reduceMotion = useReducedMotion();
  const kind = (['people', 'vehicle', 'document'].includes(row.item.kind)
    ? row.item.kind
    : 'document') as 'people' | 'vehicle' | 'document';
  const isUrgent = row.daysLeft <= 3;
  const isToday = row.daysLeft === 0;

  const badgeClass = isToday
    ? 'bg-danger/15 text-danger ring-1 ring-danger/30'
    : isUrgent
    ? 'bg-warning/15 text-warning ring-1 ring-warning/30'
    : 'bg-surface-3/60 text-text-secondary ring-1 ring-border-custom/30';

  return (
    <article
      role={onEdit ? 'button' : undefined}
      tabIndex={onEdit ? 0 : undefined}
      onClick={onEdit}
      onKeyDown={
        onEdit
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onEdit();
              }
            }
          : undefined
      }
      className={`group relative flex items-center gap-3.5 rounded-[20px] border border-border-custom/30 bg-surface-solid/70 backdrop-blur-md p-3.5 shadow-xs transition-all duration-200 ease-out active:scale-[0.98] hover:border-border-custom/60 hover:bg-surface-2/70 hover:shadow-md ${
        onEdit ? 'cursor-pointer' : ''
      }`}
    >
      {/* Apple Reminders Completion Button */}
      {onComplete && (
        <Pressable
          onClick={(e) => {
            e.stopPropagation();
            onComplete();
          }}
          aria-label="Oznacz jako odnowione/zrealizowane"
          className="group/check shrink-0 rounded-full p-1 text-text-muted hover:text-primary transition-colors"
        >
          <Circle size={20} className="block group-hover/check:hidden text-text-muted/60" strokeWidth={1.75} />
          <CheckCircle2 size={20} className="hidden group-hover/check:block text-primary" strokeWidth={2.2} />
        </Pressable>
      )}

      <ObligationProgressRing row={row} kind={kind} compact={compact} reduceMotion={reduceMotion} />

      {/* Info Block */}
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold tracking-tight text-text-primary">
            {row.item.title}
          </p>
          {row.item.related_name && (
            <span className="truncate text-xs font-normal text-text-muted">
              · {row.item.related_name}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-text-muted">
          <span>{LIFE_OBLIGATION_KIND_LABELS[row.item.kind as LifeObligationKind]}</span>
          <span>·</span>
          <span>{formatLongDateWarsaw(row.nextDate)}</span>
          <span>·</span>
          <span className="text-text-muted/80">
            {LIFE_OBLIGATION_RECURRENCE_LABELS[
              (row.item.recurrence as LifeObligationRecurrence) || 'yearly'
            ]}
          </span>
        </div>

        {row.item.notes && (
          <p className="flex items-center gap-1 text-2xs text-text-muted/90 truncate pt-0.5">
            <FileSpreadsheet size={11} strokeWidth={2} className="shrink-0 text-primary/80" />
            <span className="truncate">{row.item.notes}</span>
          </p>
        )}
      </div>

      {/* Actions & Urgency Pill */}
      <div className="flex shrink-0 items-center gap-1.5">
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-2xs font-semibold tracking-tight ${badgeClass}`}>
          <Clock size={11} strokeWidth={2.2} />
          {countdownLabel(row.daysLeft)}
        </span>

        {onConvertToTodo && (
          <Pressable
            onClick={(e) => {
              e.stopPropagation();
              onConvertToTodo();
            }}
            className="rounded-full p-2 text-text-muted opacity-70 transition-all duration-150 ease-out hover:bg-primary/10 hover:text-primary hover:opacity-100 active:scale-90"
            title="Dodaj zadanie do Todo"
            aria-label="Dodaj zadanie do Todo"
          >
            <ListTodo size={15} strokeWidth={2} />
          </Pressable>
        )}

        <Pressable
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="rounded-full p-2 text-text-muted opacity-60 transition-all duration-150 ease-out hover:bg-danger/10 hover:text-danger hover:opacity-100 active:scale-90 group-hover:opacity-100"
          aria-label="Usuń termin"
        >
          <Trash2 size={15} strokeWidth={2} />
        </Pressable>
      </div>
    </article>
  );
}




