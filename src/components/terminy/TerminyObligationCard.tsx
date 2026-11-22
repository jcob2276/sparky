import { useReducedMotion } from 'framer-motion';
import {
  LIFE_OBLIGATION_KIND_LABELS,
  LIFE_OBLIGATION_RECURRENCE_LABELS,
  type LifeObligationKind,
  type LifeObligationRecurrence,
} from '@vanguard/domain';
import {
  Cake,
  Car,
  FileText,
  Home,
  CreditCard,
  HeartPulse,
  Trash2,
  Clock,
  CheckCircle2,
  Circle,
  ListTodo,
  CalendarPlus,
  Download,
  FileSpreadsheet,
} from 'lucide-react';
import { Pressable } from '../ui/ControlPrimitives';
import { formatLongDateWarsaw } from '../../lib/date';
import {
  countdownLabel,
  initialsFrom,
  type DerivedObligation,
} from './terminyDerived';

const KIND_ICON: Record<LifeObligationKind, typeof Cake> = {
  people: Cake,
  vehicle: Car,
  document: FileText,
  home: Home,
  finance: CreditCard,
  health_admin: HeartPulse,
};

const KIND_ACCENT: Record<LifeObligationKind, string> = {
  people: 'text-danger bg-danger/12 ring-1 ring-danger/25',
  vehicle: 'text-info bg-info/12 ring-1 ring-info/25',
  document: 'text-warning bg-warning/12 ring-1 ring-warning/25',
  home: 'text-success bg-success/12 ring-1 ring-success/25',
  finance: 'text-primary bg-primary/12 ring-1 ring-primary/25',
  health_admin: 'text-info bg-info/12 ring-1 ring-info/25',
};

const RING_ACCENT: Record<LifeObligationKind, string> = {
  people: 'stroke-danger',
  vehicle: 'stroke-info',
  document: 'stroke-warning',
  home: 'stroke-success',
  finance: 'stroke-primary',
  health_admin: 'stroke-info',
};

interface Props {
  row: DerivedObligation;
  onDelete: () => void;
  onEdit?: () => void;
  onComplete?: () => void;
  onConvertToTodo?: () => void;
  onAddToCalendar?: (row: DerivedObligation) => void;
  onExportICS?: (row: DerivedObligation) => void;
  compact?: boolean;
}

function ObligationProgressRing({
  row,
  kind,
  compact = false,
  reduceMotion,
}: {
  row: DerivedObligation;
  kind: LifeObligationKind;
  compact?: boolean;
  reduceMotion: boolean | null;
}) {
  const Icon = KIND_ICON[kind] || FileText;
  const ringClass = compact ? 'h-8 w-8' : 'h-9 w-9';
  const r = compact ? 13 : 15;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - Math.max(0, Math.min(1, row.ringProgress)));
  const cx = compact ? 16 : 18;

  return (
    <div className={`relative shrink-0 ${ringClass}`}>
      <svg viewBox={`0 0 ${cx * 2} ${cx * 2}`} className="h-full w-full -rotate-90" aria-hidden>
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="currentColor" strokeWidth={2.5} className="text-border-custom/30" />
        <circle
          cx={cx}
          cy={cx}
          r={r}
          fill="none"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className={`${RING_ACCENT[kind]} ${reduceMotion ? '' : 'transition-[stroke-dashoffset] duration-500 ease-out'}`}
        />
      </svg>
      <div className={`absolute inset-0.5 flex items-center justify-center rounded-full text-3xs font-bold ${KIND_ACCENT[kind]}`}>
        {kind === 'people'
          ? initialsFrom(row.item.title, row.item.related_name)
          : <Icon size={compact ? 12 : 13} strokeWidth={2.2} />}
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
  onAddToCalendar,
  onExportICS,
  compact = false,
}: Props) {
  const reduceMotion = useReducedMotion();
  const kind = (row.item.kind in KIND_ICON ? row.item.kind : 'document') as LifeObligationKind;
  const isOverdue = row.daysLeft < 0;
  const isUrgent = row.daysLeft <= 3;
  const isToday = row.daysLeft === 0;

  const badgeClass = isOverdue
    ? 'bg-danger/20 text-danger ring-1 ring-danger/40'
    : isToday
    ? 'bg-danger/15 text-danger ring-1 ring-danger/30'
    : isUrgent
    ? 'bg-warning/15 text-warning ring-1 ring-warning/30'
    : 'bg-surface-3/70 text-text-secondary ring-1 ring-border-custom/30';

  const Details = onEdit ? Pressable : 'div';
  const name = [row.item.title, row.item.related_name].filter(Boolean).join(' · ');

  return (
    <article
      className="group relative flex items-center gap-2.5 sm:gap-3 rounded-xl sm:rounded-2xl border border-border-custom/30 bg-surface-solid/70 px-3 py-2 sm:px-3.5 sm:py-2.5 shadow-xs transition-all duration-150 ease-out hover:border-border-custom/60 hover:bg-surface-2/70 active:scale-[0.995]"
    >
      {/* Apple Reminders Completion Button */}
      {onComplete && (
        <Pressable
          onClick={() => onComplete()}
          aria-label="Oznacz jako odnowione/zrealizowane"
          className="group/check grid h-8 w-8 shrink-0 place-items-center rounded-full text-text-muted hover:text-primary transition-colors cursor-pointer"
        >
          <Circle size={18} className="block group-hover/check:hidden text-text-muted/60" strokeWidth={1.75} />
          <CheckCircle2 size={18} className="hidden group-hover/check:block text-primary" strokeWidth={2.2} />
        </Pressable>
      )}

      <ObligationProgressRing row={row} kind={kind} compact={compact} reduceMotion={reduceMotion} />

      {/* Info Block */}
      <Details
        onClick={onEdit}
        aria-label={onEdit ? `Edytuj termin: ${name}` : undefined}
        className="min-w-0 flex-1 space-y-0.5 text-left cursor-pointer"
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="truncate text-xs sm:text-sm font-semibold tracking-tight text-text-primary">
            {row.item.title}
          </span>
          {row.item.related_name && (
            <span className="truncate text-2xs sm:text-xs font-normal text-text-muted">
              · {row.item.related_name}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-2xs text-text-muted">
          <span>{LIFE_OBLIGATION_KIND_LABELS[kind]}</span>
          <span>·</span>
          <span>{formatLongDateWarsaw(row.nextDate)}</span>
          <span className="hidden sm:inline">·</span>
          <span className="hidden sm:inline text-text-muted/80">
            {LIFE_OBLIGATION_RECURRENCE_LABELS[
              (row.item.recurrence as LifeObligationRecurrence) || 'yearly'
            ]}
          </span>
        </div>

        {row.item.notes && (
          <div className="flex items-center gap-1 text-2xs text-text-muted/90 truncate pt-0.5">
            <FileSpreadsheet size={10} strokeWidth={2} className="shrink-0 text-primary/80" />
            <span className="truncate">{row.item.notes}</span>
          </div>
        )}
      </Details>

      {/* Actions & Urgency Pill */}
      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 sm:px-2.5 sm:py-1 text-2xs font-bold tracking-tight whitespace-nowrap ${badgeClass}`}>
          <Clock size={10} strokeWidth={2.2} />
          {countdownLabel(row.daysLeft)}
        </span>

        {/* Desktop Quick Actions */}
        <div className="hidden sm:flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {onConvertToTodo && (
            <Pressable
              onClick={() => onConvertToTodo()}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-text-muted hover:bg-primary/10 hover:text-primary transition-colors"
              title="Dodaj zadanie do Todo"
              aria-label="Dodaj zadanie do Todo"
            >
              <ListTodo size={13} strokeWidth={2} />
            </Pressable>
          )}

          {onAddToCalendar && (
            <Pressable
              onClick={() => onAddToCalendar(row)}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-text-muted hover:bg-primary/10 hover:text-primary transition-colors"
              title="Dodaj do Kalendarza Sparky"
              aria-label="Dodaj do Kalendarza Sparky"
            >
              <CalendarPlus size={13} strokeWidth={2} />
            </Pressable>
          )}

          {onExportICS && (
            <Pressable
              onClick={() => onExportICS(row)}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-text-muted hover:bg-primary/10 hover:text-primary transition-colors"
              title="Eksportuj do iCal (.ics)"
              aria-label="Eksportuj do iCal (.ics)"
            >
              <Download size={13} strokeWidth={2} />
            </Pressable>
          )}

          <Pressable
            onClick={() => onDelete()}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-text-muted hover:bg-danger/10 hover:text-danger transition-colors"
            title="Usuń termin"
            aria-label="Usuń termin"
          >
            <Trash2 size={13} strokeWidth={2} />
          </Pressable>
        </div>

        {/* Mobile Quick Delete */}
        <Pressable
          onClick={() => onDelete()}
          className="flex sm:hidden h-7 w-7 items-center justify-center rounded-full text-text-muted/60 hover:text-danger active:text-danger"
          aria-label="Usuń termin"
        >
          <Trash2 size={13} strokeWidth={1.8} />
        </Pressable>
      </div>
    </article>
  );
}




