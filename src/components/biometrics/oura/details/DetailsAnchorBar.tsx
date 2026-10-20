import Button from '../../../ui/Button';
import type { DetailsAnchor } from '../ouraTabs';
import { ANCHORS } from './useDetailsAnchor';

interface Props {
  active: DetailsAnchor;
  onSelect: (id: DetailsAnchor) => void;
}

/** Lepki pasek kotwic: skok do sekcji zakładki Szczegóły. */
export function DetailsAnchorBar({ active, onSelect }: Props) {
  return (
    <nav
      aria-label="Sekcje szczegółów"
      className="sticky top-0 z-[var(--z-sticky)] -mx-4 mb-6 no-scrollbar overflow-x-auto bg-[var(--background)]/90 px-4 py-2 backdrop-blur-[var(--blur-md)] sm:-mx-6 sm:px-6"
    >
      <ul className="flex min-w-max gap-2">
        {ANCHORS.map(({ id, label }) => {
          const current = active === id;
          return (
            <li key={id}>
              <Button
                variant="ghost"
                aria-current={current ? 'true' : undefined}
                onClick={() => onSelect(id)}
                className={`!min-h-11 !rounded-full !border !px-4 ${
                  current
                    ? '!border-info/40 !bg-info/15 !text-text-primary'
                    : '!border-white/10 !bg-surface-1 !text-text-secondary'
                }`}
              >
                {label}
              </Button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
