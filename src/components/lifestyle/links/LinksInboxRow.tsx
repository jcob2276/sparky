import { Pressable } from '../../ui/ControlPrimitives';
import {
  Check,
  ChevronDown,
  ExternalLink,
  Trash2,
  BookOpen,
} from 'lucide-react';
import type { SavedLink } from '../../../lib/linksApi';
import { CATEGORY_COLORS, formatDomainName, toValidUrl } from './linksUtils';

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

interface LinksRowActionsProps {
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

function LinksRowActions({
  link,
  validUrl,
  isExpanded,
  bouncing,
  onToggleExpand,
  onToggleRead,
  onDelete,
  onOpenReader,
  haptic,
}: LinksRowActionsProps) {
  return (
    <div className="flex items-center gap-1 shrink-0">
      {onOpenReader && (
        <Pressable
          onClick={(e) => {
            e.stopPropagation();
            onOpenReader();
          }}
          className="btn-press h-8 w-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-solid transition-colors cursor-pointer"
          title="Tryb czytnika"
          aria-label="Tryb czytnika"
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
        title="Otwórz link w nowej karcie"
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
  const validUrl = toValidUrl(link.url);

  return (
    <div
      className={`flex items-center justify-between gap-3 border rounded-2xl px-4 py-3 transition-all duration-[var(--motion-medium)] select-none ${
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
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect?.();
          }}
          className={`h-4 w-4 rounded-md border shrink-0 flex items-center justify-center transition-all cursor-pointer ${
            isSelected
              ? 'bg-primary border-primary text-on-accent shadow-xs'
              : 'border-border-custom bg-surface-solid'
          }`}
        >
          {isSelected && <Check size={11} strokeWidth={3} />}
        </Pressable>
      )}

      {/* Main Clickable Content */}
      {isSelectMode ? (
        <Pressable
          onClick={onToggleSelect}
          className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer text-left"
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
              <span className="text-2xs text-text-muted font-medium">{domainClean}</span>
              <span className={`rounded-full px-1.5 py-0.2 text-2xs font-bold ${catStyle.pill}`}>
                {link.category}
              </span>
            </div>
          </div>
        </Pressable>
      ) : (
        <a
          href={validUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => haptic([6])}
          className="group/row flex items-center gap-3 min-w-0 flex-1 cursor-pointer text-left"
        >
          <img
            src={`https://www.google.com/s2/favicons?sz=32&domain=${link.domain}`}
            alt=""
            className="w-4 h-4 rounded-sm object-contain shrink-0"
            onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
          />
          <div className="min-w-0 flex-1">
            <h3
              className={`text-sm font-semibold truncate leading-tight tracking-tight group-hover/row:text-primary transition-colors ${
                link.status === 'read' ? 'text-text-secondary line-through' : 'text-text-primary'
              }`}
            >
              {link.title}
            </h3>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <span className="text-2xs text-text-muted font-medium">{domainClean}</span>
              <span className={`rounded-full px-1.5 py-0.2 text-2xs font-bold ${catStyle.pill}`}>
                {link.category}
              </span>
            </div>
          </div>
        </a>
      )}

      <LinksRowActions
        link={link}
        validUrl={validUrl}
        isExpanded={isExpanded}
        bouncing={bouncing}
        onToggleExpand={onToggleExpand}
        onToggleRead={onToggleRead}
        onDelete={onDelete}
        onOpenReader={onOpenReader}
        haptic={haptic}
      />
    </div>
  );
}
