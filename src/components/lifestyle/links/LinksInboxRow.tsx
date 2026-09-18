import { Pressable } from '../../ui/ControlPrimitives';
import {
  Check,
  ExternalLink,
  Trash2,
  BookOpen,
} from 'lucide-react';
import type { SavedLink } from '../../../lib/linksApi';
import { CATEGORY_COLORS, formatDomainName } from './linksUtils';

interface LinksInboxRowProps {
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

export function LinksInboxRow({
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
}: LinksInboxRowProps) {
  const catStyle = CATEGORY_COLORS[link.category] || CATEGORY_COLORS['Inne'];
  const domainClean = formatDomainName(link.domain);

  return (
    <div
      className={`flex items-center justify-between gap-3 border rounded-2xl px-4 py-3 ui-interactive duration-[var(--motion-medium)] select-none ${
        isSelected
          ? 'bg-primary/10 border-primary/40 ring-1 ring-primary/30'
          : link.status === 'read'
          ? 'border-border-custom/30 bg-surface/30 opacity-70 hover:opacity-100 hover:bg-surface-solid/40'
          : 'border-border-custom/50 bg-surface/60 hover:bg-surface-solid/70 hover:border-border-custom'
      }`}
    >
      {/* Selection Checkbox */}
      {isSelectMode && (
        <Pressable
          onClick={onToggleSelect}
          className={`h-4 w-4 rounded-md border shrink-0 flex items-center justify-center ui-interactive cursor-pointer ${
            isSelected
              ? 'bg-primary border-primary text-on-accent shadow-xs'
              : 'border-border-custom bg-surface-solid'
          }`}
        >
          {isSelected && <Check size={11} strokeWidth={3} />}
        </Pressable>
      )}

      {/* Main Clickable Content */}
      <Pressable
        onClick={isSelectMode ? onToggleSelect : onToggleExpand}
        className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer text-left"
        aria-expanded={isExpanded}
      >
        <img
          src={`https://www.google.com/s2/favicons?sz=32&domain=${link.domain}`}
          alt=""
          className="w-4 h-4 rounded-sm object-contain shrink-0"
          onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
        />
        <div className="min-w-0 flex-1">
          <h3
            className={`text-sm font-semibold truncate leading-tight tracking-tight ${
              link.status === 'read' ? 'text-text-secondary line-through' : 'text-text-primary'
            }`}
          >
            {link.title}
          </h3>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <span className="text-3xs text-text-muted font-medium">{domainClean}</span>
            <span className={`rounded-full px-1.5 py-0.2 text-3xs font-bold ${catStyle.pill}`}>
              {link.category}
            </span>
          </div>
        </div>
      </Pressable>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        {onOpenReader && (
          <Pressable
            onClick={onOpenReader}
            className="btn-press rounded-full p-1.5 text-text-muted/60 hover:text-text-primary hover:bg-surface-solid/60 transition-colors cursor-pointer"
            title="Tryb czytnika"
          >
            <BookOpen size={13} />
          </Pressable>
        )}

        <Pressable
          onClick={onToggleRead}
          className={`btn-press rounded-full p-1.5 ui-interactive cursor-pointer ${
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
          title="Otwórz link"
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
  );
}
