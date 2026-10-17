import type { SavedLink } from '../../../lib/linksApi';
import type { useLinksInboxData } from './useLinksInboxData';
import { LinksInboxRow } from './LinksInboxRow';
import { LinksInboxCard } from './LinksInboxCard';
import { LinksExpandedDetails } from './LinksExpandedDetails';

interface LinksInboxItemProps {
  link: SavedLink;
  d: ReturnType<typeof useLinksInboxData>;
  haptic: (pattern: number | number[]) => void;
  isSelectMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  onOpenReader?: (link: SavedLink) => void;
}

export function LinksInboxItem({
  link,
  d,
  haptic,
  isSelectMode = false,
  isSelected = false,
  onToggleSelect,
  onOpenReader,
}: LinksInboxItemProps) {
  const isExpanded = d.expandedLinkId === link.id;
  const isDeleting = d.deletingIds.has(link.id);

  return (
    <div
      className={`transition-all duration-[var(--ds-duration-250ms)] ease-[var(--spring)] ${
        isDeleting ? 'opacity-0 scale-95 -translate-y-2 pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {d.viewMode === 'list' ? (
        <LinksInboxRow
          link={link}
          isExpanded={isExpanded}
          onToggleExpand={() => d.setExpandedLinkId((p) => (p === link.id ? null : link.id))}
          onToggleRead={() => d.toggleReadStatus(link.id, link.status)}
          onDelete={() => d.deleteLink(link.id)}
          onOpenReader={onOpenReader ? () => onOpenReader(link) : undefined}
          bouncing={d.bouncingIds.has(link.id)}
          isSelectMode={isSelectMode}
          isSelected={isSelected}
          onToggleSelect={onToggleSelect}
          haptic={haptic}
        />
      ) : (
        <LinksInboxCard
          link={link}
          isExpanded={isExpanded}
          onToggleExpand={() => d.setExpandedLinkId((p) => (p === link.id ? null : link.id))}
          onToggleRead={() => d.toggleReadStatus(link.id, link.status)}
          onDelete={() => d.deleteLink(link.id)}
          onOpenReader={onOpenReader ? () => onOpenReader(link) : undefined}
          bouncing={d.bouncingIds.has(link.id)}
          isSelectMode={isSelectMode}
          isSelected={isSelected}
          onToggleSelect={onToggleSelect}
          haptic={haptic}
        />
      )}

      {/* Expandable Details */}
      <div className={`grid-expand-wrapper ${isExpanded ? 'expanded' : ''}`}>
        <div className="grid-expand-content">
          <LinksExpandedDetails
            link={link}
            notesDraft={d.notesDrafts[link.id]}
            savedNoteId={d.savedNoteId}
            convertingLinkId={d.convertingLinkId}
            onUpdateCategory={d.updateLinkCategory}
            onSaveNotes={d.saveNotes}
            onChangeNotesDraft={(id, val) => d.setNotesDrafts((prev) => ({ ...prev, [id]: val }))}
            onConvertToTodo={d.handleLinkToTodo}
            onConvertToNote={d.handleLinkToNote}
          />
        </div>
      </div>
    </div>
  );
}
