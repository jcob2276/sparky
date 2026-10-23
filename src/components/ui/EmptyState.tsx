import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';
import Button from './Button';

interface EmptyStateAction {
  label: string;
  onClick: () => void;
}

export interface EmptyStateProps {
  /** Lucide icon element (preferred). A plain string (legacy emoji) is still rendered as-is. Defaults to `Inbox`. */
  icon?: ReactNode;
  label: string;
  /** Optional second line with a hint or the reason the list is empty. */
  description?: ReactNode;
  action?: EmptyStateAction;
  /** Tighter variant for empty states inside cards, rows and sheets. */
  compact?: boolean;
  className?: string;
}

export default function EmptyState({ icon, label, description, action, compact = false, className = '' }: EmptyStateProps) {
  const glyph = icon ?? <Inbox size={compact ? 18 : 22} strokeWidth={1.75} aria-hidden="true" />;
  return (
    <div
      className={`mx-0 my-3 flex flex-col items-center rounded-[var(--radius-hero)] border border-dashed border-border-custom bg-surface-2 text-center ${compact ? 'gap-2 px-4 py-5' : 'gap-3 px-6 py-8'} ${className}`}
    >
      <div
        className={`flex items-center justify-center rounded-full bg-surface-3 text-text-muted ${compact ? 'h-10 w-10 text-lg' : 'h-12 w-12 text-2xl'}`}
        aria-hidden={typeof icon === 'string' ? undefined : true}
      >
        {glyph}
      </div>
      <div className="max-w-xs space-y-1">
        <p className="text-sm font-semibold leading-snug text-text-primary">{label}</p>
        {description && <p className="text-xs leading-relaxed text-text-muted">{description}</p>}
      </div>
      {action && (
        <Button variant="tonal" size="sm" onClick={action.onClick} className="mt-1 min-h-[44px] !rounded-full !px-5">
          {action.label}
        </Button>
      )}
    </div>
  );
}
