import { Pressable } from '../../ui/ControlPrimitives';
import {
  Check,
  ExternalLink,
  PenLine,
  Trash2,
  BookOpen,
} from 'lucide-react';
import type { SavedLink } from '../../../lib/linksApi';
import { CATEGORY_COLORS, formatDomainName } from './linksUtils';

interface LinksInboxCardProps {
  link: SavedLink;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onToggleRead: () => void;
  onDelete: () => void;
  onOpenReader?: () => void;
  bouncing?: boolean;
  isSelectMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  haptic: (pattern: number | number[]) => void;
}

export function LinksInboxCard({
  link,
  isExpanded,
  onToggleExpand,
  onToggleRead,
  onDelete,
  onOpenReader,
  bouncing = false,
  isSelectMode = false,
  isSelected = false,
  onToggleSelect,
  haptic,
}: LinksInboxCardProps) {
  const catStyle = CATEGORY_COLORS[link.category] || CATEGORY_COLORS['Inne'];
  const domainClean = formatDomainName(link.domain);

  return (
    <div
      className={`pocket-card group relative transition-all duration-[var(--motion-medium)] select-none ${
        isSelected
          ? 'bg-primary/10 border-primary/40 ring-1 ring-primary/30'
          : link.status === 'read'
          ? 'opacity-70 hover:opacity-100 hover:bg-surface-solid/60'
          : 'hover:bg-surface-solid/70'
      }`}
    >
      {/* Thumbnail */}
      {link.thumbnail_url && (
        <div className="relative -mx-4 -mt-4 mb-3 rounded-t-[var(--ds-arbitrary-24px)] overflow-hidden">
          <img
            src={link.thumbnail_url}
            alt={link.title}
            className="w-full aspect-video object-cover"
            loading="lazy"
          />
          {isSelectMode && (
            <Pressable
              onClick={onToggleSelect}
              className={`absolute top-3 left-3 h-5 w-5 rounded-md border flex items-center justify-center transition-all cursor-pointer backdrop-blur-md ${
                isSelected
                  ? 'bg-primary border-primary text-on-accent shadow-xs'
                  : 'border-border-custom bg-background/80 text-transparent'
              }`}
            >
              {isSelected && <Check size={12} strokeWidth={3} />}
            </Pressable>
          )}
        </div>
      )}

      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            {isSelectMode && !link.thumbnail_url && (
              <Pressable
                onClick={onToggleSelect}
                className={`h-4 w-4 rounded-md border shrink-0 flex items-center justify-center transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-primary border-primary text-on-accent shadow-xs'
                    : 'border-border-custom bg-surface-solid'
                }`}
              >
                {isSelected && <Check size={11} strokeWidth={3} />}
              </Pressable>
            )}

            <div className="flex items-center gap-1 select-none">
              <img
                src={`https://www.google.com/s2/favicons?sz=32&domain=${link.domain}`}
                alt=""
                className="w-3.5 h-3.5 rounded-sm object-contain"
                onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
              />
              <span className="text-3xs text-text-muted">{link.channel_name || domainClean}</span>
            </div>

            <span className={`rounded-full px-2 py-0.5 text-3xs font-semibold ${catStyle.pill}`}>
              {link.category}
            </span>

            {link.notes && (
              <span className="flex items-center gap-0.5 text-3xs text-text-muted/70" title="Zawiera notatki">
                <PenLine size={10} />
              </span>
            )}
          </div>

          <Pressable
            onClick={isSelectMode ? onToggleSelect : onToggleExpand}
            className="block w-full text-left cursor-pointer"
            aria-expanded={isExpanded}
          >
            <h3
              className={`text-sm font-semibold leading-snug tracking-tight ${
                link.status === 'read' ? 'text-text-secondary line-through' : 'text-text-primary'
              }`}
            >
              {link.title}
            </h3>
            {link.description && (
              <p className="mt-1 text-xs text-text-muted leading-relaxed line-clamp-2 font-normal">
                {link.description}
              </p>
            )}
          </Pressable>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1 shrink-0 pt-0.5">
          {onOpenReader && (
            <Pressable
              onClick={onOpenReader}
              className="btn-press rounded-full p-1.5 text-text-muted/60 hover:text-text-primary hover:bg-surface-solid/60 transition-colors cursor-pointer"
              title="Otwórz czytnik"
            >
              <BookOpen size={13} />
            </Pressable>
          )}

          <Pressable
            onClick={onToggleRead}
            className={`btn-press rounded-full p-1.5 transition-all cursor-pointer ${
              link.status === 'read'
                ? 'bg-success/15 text-success'
                : 'text-text-muted/50 hover:text-text-primary hover:bg-surface-solid/60'
            }`}
            title={link.status === 'unread' ? 'Oznacz jako przeczytane' : 'Oznacz jako nieprzeczytane'}
          >
            <Check size={13} className={bouncing ? 'animate-pop-check' : ''} />
          </Pressable>

          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => haptic([6])}
            className="btn-press rounded-full p-1.5 text-text-muted/50 hover:text-text-primary hover:bg-surface-solid/60 transition-colors"
            title="Otwórz w nowej karcie"
          >
            <ExternalLink size={13} />
          </a>

          <Pressable
            onClick={onDelete}
            className="btn-press rounded-full p-1.5 text-text-muted/40 hover:text-danger hover:bg-danger/10 transition-colors cursor-pointer"
            title="Usuń link"
          >
            <Trash2 size={13} />
          </Pressable>
        </div>
      </div>
    </div>
  );
}
