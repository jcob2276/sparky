import { Pressable } from '../../ui/ControlPrimitives';
import {
  Check,
  ChevronDown,
  ExternalLink,
  Trash2,
  BookOpen,
} from 'lucide-react';
import type { SavedLink } from '../../../lib/linksApi';

export interface LinksCardActionsProps {
  link: SavedLink;
  validUrl: string;
  isExpanded: boolean;
  bouncing: boolean;
  onToggleExpand: () => void;
  onToggleRead: () => void;
  onDelete: () => void;
  onOpenReader?: () => void;
  haptic: (pattern: number | number[]) => void;
}

export function LinksCardActions({
  link,
  validUrl,
  isExpanded,
  bouncing,
  onToggleExpand,
  onToggleRead,
  onDelete,
  onOpenReader,
  haptic,
}: LinksCardActionsProps) {
  return (
    <div className="flex items-center gap-1 shrink-0 pt-0.5">
      {onOpenReader && (
        <Pressable
          onClick={(e) => {
            e.stopPropagation();
            onOpenReader();
          }}
          className="btn-press h-8 w-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-solid transition-colors cursor-pointer"
          title="Otwórz czytnik"
          aria-label="Otwórz czytnik"
        >
          <BookOpen size={15} />
        </Pressable>
      )}

      <Pressable
        onClick={(e) => {
          e.stopPropagation();
          onToggleRead();
        }}
        className={`btn-press h-8 w-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
          link.status === 'read'
            ? 'bg-success/15 text-success hover:bg-success/25'
            : 'text-text-muted hover:text-text-primary hover:bg-surface-solid'
        }`}
        title={link.status === 'unread' ? 'Oznacz jako przeczytane' : 'Oznacz jako nieprzeczytane'}
        aria-label={link.status === 'unread' ? 'Oznacz jako przeczytane' : 'Oznacz jako nieprzeczytane'}
      >
        <Check size={15} className={bouncing ? 'animate-pop-check' : ''} />
      </Pressable>

      <a
        href={validUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => {
          e.stopPropagation();
          haptic([6]);
        }}
        className="btn-press h-8 w-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-solid transition-colors cursor-pointer"
        title="Otwórz w nowej karcie"
        aria-label="Otwórz link w nowej karcie"
      >
        <ExternalLink size={15} />
      </a>

      <Pressable
        onClick={(e) => {
          e.stopPropagation();
          onToggleExpand();
        }}
        className={`btn-press h-8 w-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
          isExpanded
            ? 'bg-primary/10 text-primary'
            : 'text-text-muted hover:text-text-primary hover:bg-surface-solid'
        }`}
        title={isExpanded ? 'Zwiń szczegóły' : 'Pokaż notatki i opcje'}
        aria-label={isExpanded ? 'Zwiń szczegóły' : 'Pokaż notatki i opcje'}
        aria-expanded={isExpanded}
      >
        <ChevronDown size={15} className={`transition-transform duration-[var(--motion-fast)] ${isExpanded ? 'rotate-180' : ''}`} />
      </Pressable>

      <Pressable
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="btn-press h-8 w-8 rounded-lg flex items-center justify-center text-text-muted hover:text-danger hover:bg-danger/10 transition-colors cursor-pointer"
        title="Usuń link"
        aria-label="Usuń link"
      >
        <Trash2 size={15} />
      </Pressable>
    </div>
  );
}
