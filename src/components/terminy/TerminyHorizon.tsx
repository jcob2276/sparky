import { motion, useReducedMotion } from 'framer-motion';
import { LIFE_OBLIGATION_KIND_LABELS } from '@vanguard/domain';
import { Sparkles, Calendar, Plus } from 'lucide-react';
import Button from '../ui/Button';
import EmptyState from '../ui/EmptyState';
import { Pressable } from '../ui/ControlPrimitives';
import { formatLongDateWarsaw } from '../../lib/date';
import { TerminyObligationCard } from './TerminyObligationCard';
import {
  STARTER_TEMPLATES,
  URGENCY_BUCKET_LABELS,
  bucketMap,
  countdownLabel,
  type DerivedObligation,
  type StarterTemplate,
  type UrgencyBucket,
} from './terminyDerived';

const BUCKET_ORDER: UrgencyBucket[] = ['today', 'week', 'month', 'later'];

const EMPTY_STARTERS = ['birthday', 'vehicle-inspection', 'insurance-policy']
  .map((id) => STARTER_TEMPLATES.find((t) => t.id === id))
  .filter((t): t is StarterTemplate => Boolean(t));

interface Props {
  rows: DerivedObligation[];
  onDelete: (id: string, title: string) => void;
  onEdit: (id: string) => void;
  onComplete: (row: DerivedObligation) => void;
  onConvertToTodo: (row: DerivedObligation) => void;
  onOpenAdd: (template?: StarterTemplate | null) => void;
}

export function TerminyHorizon({
  rows,
  onDelete,
  onEdit,
  onComplete,
  onConvertToTodo,
  onOpenAdd,
}: Props) {
  const reduceMotion = useReducedMotion();
  const buckets = bucketMap(rows);
  const next = rows[0] ?? null;

  if (rows.length === 0) {
    return (
      <div className="space-y-6">
        <EmptyState
          icon="📅"
          label="Brak terminów — dodaj urodziny, przegląd albo polisę."
          action={{ label: 'Dodaj termin', onClick: () => onOpenAdd(null) }}
        />
        <div className="grid gap-3.5 sm:grid-cols-3">
          {EMPTY_STARTERS.map((tpl) => (
            <Pressable
              key={tpl.id}
              onClick={() => onOpenAdd(tpl)}
              className="group relative flex flex-col justify-between rounded-[22px] border border-border-custom/30 bg-surface-solid/60 backdrop-blur-md p-4.5 text-left transition-all duration-200 ease-out hover:border-border-custom/60 hover:bg-surface-2/80 hover:shadow-md active:scale-[0.98]"
            >
              <div>
                <span className="block text-3xs font-bold uppercase tracking-wider text-text-muted">
                  {LIFE_OBLIGATION_KIND_LABELS[tpl.kind]}
                </span>
                <span className="mt-1 block text-sm font-semibold tracking-tight text-text-primary">
                  {tpl.title}
                </span>
                <span className="mt-1 block text-xs leading-relaxed text-text-muted">
                  {tpl.blurb}
                </span>
              </div>
              <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-primary">
                <Plus size={14} strokeWidth={2.2} />
                <span>Dodaj ten termin</span>
              </div>
            </Pressable>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {next && (
        <section
          role="button"
          tabIndex={0}
          onClick={() => onEdit(next.item.id)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onEdit(next.item.id);
            }
          }}
          className="group relative cursor-pointer overflow-hidden rounded-[28px] border border-white/20 dark:border-white/10 bg-gradient-to-br from-primary/20 via-surface-solid/90 to-surface-2/80 backdrop-blur-xl p-6.5 shadow-lg transition-all duration-200 ease-out active:scale-[0.98] hover:shadow-xl md:p-8"
        >
          {/* Subtle Apple gradient ambient highlight */}
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/20 blur-3xl" />

          <div className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="space-y-1.5">
              <p className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary ring-1 ring-primary/30">
                <Sparkles size={13} strokeWidth={2.2} />
                Najbliższy termin
              </p>
              <h2 className="text-2xl font-bold tracking-tight text-text-primary md:text-3xl">
                {next.item.title}
              </h2>
              <p className="flex items-center gap-2 text-xs font-medium text-text-secondary">
                <span>{LIFE_OBLIGATION_KIND_LABELS[next.item.kind]}</span>
                {next.item.related_name && <span>· {next.item.related_name}</span>}
                <span>·</span>
                <span className="inline-flex items-center gap-1 text-text-primary">
                  <Calendar size={13} strokeWidth={2} />
                  {formatLongDateWarsaw(next.nextDate)}
                </span>
              </p>
            </div>

            <div className="shrink-0 text-right md:text-right">
              <p className="text-3xl font-extrabold tracking-tight text-text-primary md:text-4xl">
                {countdownLabel(next.daysLeft)}
              </p>
              <p className="mt-0.5 text-2xs font-medium text-text-muted">
                Kliknij, aby edytować
              </p>
            </div>
          </div>
        </section>
      )}

      {BUCKET_ORDER.map((bucket) => {
        const list = buckets[bucket];
        if (list.length === 0) return null;
        return (
          <section key={bucket} className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">
                {URGENCY_BUCKET_LABELS[bucket]}
              </h3>
              <span className="rounded-full bg-surface-3/60 px-2 py-0.5 text-2xs font-semibold text-text-muted">
                {list.length}
              </span>
            </div>
            <ul className="space-y-2.5">
              {list.map((row, index) => (
                <motion.li
                  key={row.item.id}
                  initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.2,
                    delay: reduceMotion ? 0 : Math.min(index, 8) * 0.03,
                    ease: [0.25, 0.1, 0.25, 1],
                  }}
                >
                  <TerminyObligationCard
                    row={row}
                    onDelete={() => onDelete(row.item.id, row.item.title)}
                    onEdit={() => onEdit(row.item.id)}
                    onComplete={() => onComplete(row)}
                    onConvertToTodo={() => onConvertToTodo(row)}
                  />
                </motion.li>
              ))}
            </ul>
          </section>
        );
      })}

      <div className="flex justify-center pt-2">
        <Button variant="tonal" onClick={() => onOpenAdd(null)} className="rounded-full px-6">
          <Plus size={16} strokeWidth={2.2} className="mr-1.5" />
          Dodaj nowy termin
        </Button>
      </div>
    </div>
  );
}




