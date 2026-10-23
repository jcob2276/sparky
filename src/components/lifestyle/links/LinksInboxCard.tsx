import { Pressable } from '../../ui/ControlPrimitives';
import { Check, PenLine } from 'lucide-react';
import type { SavedLink } from '../../../lib/linksApi';
import { CATEGORY_COLORS, formatDomainName, toValidUrl } from './linksUtils';
import { LinksCardActions } from './LinksCardActions';

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

interface LinksCardThumbnailProps {
  thumbnailUrl: string;
  title: string;
  validUrl: string;
  isSelectMode: boolean;
  isSelected: boolean;
  onToggleSelect?: () => void;
  haptic: (pattern: number | number[]) => void;
}

function LinksCardThumbnail({
  thumbnailUrl,
  title,
  validUrl,
  isSelectMode,
  isSelected,
  onToggleSelect,
  haptic,
}: LinksCardThumbnailProps) {
  return (
    <div className="relative -mx-4 -mt-4 mb-3 rounded-t-[var(--ds-arbitrary-24px)] overflow-hidden">
      {isSelectMode ? (
        <Pressable
          onClick={onToggleSelect}
          className="w-full block cursor-pointer"
        >
          <img
            src={thumbnailUrl}
            alt={title}
            className="w-full aspect-video object-cover"
            loading="lazy"
          />
        </Pressable>
      ) : (
        <a
          href={validUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => haptic([6])}
          className="w-full block cursor-pointer transition-opacity"
        >
          <img
            src={thumbnailUrl}
            alt={title}
            className="w-full aspect-video object-cover"
            loading="lazy"
          />
        </a>
      )}
      {isSelectMode && (
        <Pressable
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect?.();
          }}
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
  );
}

interface LinksCardContentProps {
  title: string;
  description?: string;
  validUrl: string;
  isRead: boolean;
  isSelectMode: boolean;
  onToggleSelect?: () => void;
  haptic: (pattern: number | number[]) => void;
}

function LinksCardContent({
  title,
  description,
  validUrl,
  isRead,
  isSelectMode,
  onToggleSelect,
  haptic,
}: LinksCardContentProps) {
  if (isSelectMode) {
    return (
      <Pressable
        onClick={onToggleSelect}
        className="block w-full text-left cursor-pointer"
      >
        <h3 className={`text-sm font-semibold leading-snug tracking-tight ${isRead ? 'text-text-secondary line-through' : 'text-text-primary'}`}>
          {title}
        </h3>
        {description && (
          <p className="mt-1 text-xs text-text-muted leading-relaxed line-clamp-2 font-normal">
            {description}
          </p>
        )}
      </Pressable>
    );
  }

  return (
    <a
      href={validUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => haptic([6])}
      className="group/title block w-full text-left cursor-pointer"
    >
      <h3 className={`text-sm font-semibold leading-snug tracking-tight group-hover/title:text-primary transition-colors ${isRead ? 'text-text-secondary line-through' : 'text-text-primary'}`}>
        {title}
      </h3>
      {description && (
        <p className="mt-1 text-xs text-text-muted leading-relaxed line-clamp-2 font-normal">
          {description}
        </p>
      )}
    </a>
  );
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
  const validUrl = toValidUrl(link.url);

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
      {link.thumbnail_url && (
        <LinksCardThumbnail
          thumbnailUrl={link.thumbnail_url}
          title={link.title}
          validUrl={validUrl}
          isSelectMode={isSelectMode}
          isSelected={isSelected}
          onToggleSelect={onToggleSelect}
          haptic={haptic}
        />
      )}

      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            {isSelectMode && !link.thumbnail_url && (
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

            {isSelectMode ? (
              <div className="flex items-center gap-1 select-none">
                <img
                  src={`https://www.google.com/s2/favicons?sz=32&domain=${link.domain}`}
                  alt=""
                  className="w-3.5 h-3.5 rounded-sm object-contain"
                  onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                />
                <span className="text-2xs text-text-muted">{link.channel_name || domainClean}</span>
              </div>
            ) : (
              <a
                href={validUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => haptic([6])}
                className="flex items-center gap-1 select-none hover:text-text-primary transition-colors cursor-pointer"
              >
                <img
                  src={`https://www.google.com/s2/favicons?sz=32&domain=${link.domain}`}
                  alt=""
                  className="w-3.5 h-3.5 rounded-sm object-contain"
                  onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                />
                <span className="text-2xs text-text-muted hover:underline">{link.channel_name || domainClean}</span>
              </a>
            )}

            <span className={`rounded-full px-2 py-0.5 text-2xs font-semibold ${catStyle.pill}`}>
              {link.category}
            </span>

            {link.notes && (
              <Pressable
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleExpand();
                }}
                className="flex items-center gap-0.5 text-2xs text-text-muted/70 hover:text-text-primary transition-colors cursor-pointer"
                title="Zawiera notatki (kliknij, aby rozwinąć)"
              >
                <PenLine size={10} />
              </Pressable>
            )}
          </div>

          <LinksCardContent
            title={link.title}
            description={link.description}
            validUrl={validUrl}
            isRead={link.status === 'read'}
            isSelectMode={isSelectMode}
            onToggleSelect={onToggleSelect}
            haptic={haptic}
          />
        </div>

        <LinksCardActions
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
    </div>
  );
}
