import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { LIFE_OBLIGATION_KIND_LABELS, type LifeObligationKind } from '@vanguard/domain';
import EmptyState from '../ui/EmptyState';
import Button from '../ui/Button';
import { TerminyObligationCard } from './TerminyObligationCard';
import { filterByKind, type DerivedObligation } from './terminyDerived';

const KIND_EMOJI: Record<LifeObligationKind, string> = {
  people: '🎂',
  vehicle: '🚗',
  document: '📄',
  home: '🏠',
  finance: '💳',
  health_admin: '🩺',
};

interface Props {
  kind: LifeObligationKind;
  rows: DerivedObligation[];
  onDelete: (id: string, title: string) => void;
  onEdit: (id: string) => void;
  onComplete: (row: DerivedObligation) => void;
  onConvertToTodo: (row: DerivedObligation) => void;
  onAddToCalendar?: (row: DerivedObligation) => void;
  onExportICS?: (row: DerivedObligation) => void;
  searchQuery?: string;
  onOpenAdd: () => void;
}

export function TerminyVault({
  kind,
  rows,
  searchQuery,
  onDelete,
  onEdit,
  onComplete,
  onConvertToTodo,
  onAddToCalendar,
  onExportICS,
  onOpenAdd,
}: Props) {
  const reduceMotion = useReducedMotion();
  const filtered = filterByKind(rows, kind);

  if (filtered.length === 0) {
    if (searchQuery && searchQuery.trim()) {
      return (
        <div className="space-y-4">
          <EmptyState
            icon="🔍"
            label={`Brak pozycji w "${LIFE_OBLIGATION_KIND_LABELS[kind]}" pasujących do "${searchQuery.trim()}".`}
          />
        </div>
      );
    }
    return (
      <div className="space-y-4">
        <EmptyState
          icon={KIND_EMOJI[kind] || '📄'}
          label={`Brak pozycji w: ${LIFE_OBLIGATION_KIND_LABELS[kind]}`}
          action={{ label: 'Dodaj', onClick: onOpenAdd }}
        />
        <div className="flex justify-center">
          <Button variant="ghost" onClick={onOpenAdd}>Dodaj termin</Button>
        </div>
      </div>
    );
  }

  return (
    <ul className="space-y-2.5">
      <AnimatePresence initial={false}>
        {filtered.map((row, index) => (
          <motion.li
            key={row.item.id}
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -6, scale: 0.97 }}
            transition={{
              duration: 0.2,
              delay: reduceMotion ? 0 : Math.min(index, 8) * 0.035,
              ease: [0.25, 0.1, 0.25, 1],
            }}
          >
            <TerminyObligationCard
              row={row}
              onDelete={() => onDelete(row.item.id, row.item.title)}
              onEdit={() => onEdit(row.item.id)}
              onComplete={() => onComplete(row)}
              onConvertToTodo={() => onConvertToTodo(row)}
              onAddToCalendar={onAddToCalendar}
              onExportICS={onExportICS}
            />
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}



