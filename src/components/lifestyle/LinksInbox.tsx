import { useRef } from 'react';
import { Pressable, ControlInput } from '../ui/ControlPrimitives';
import {
  CheckCheck,
  Grid3X3,
  Inbox,
  LayoutList,
  Plus,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
/**
 * @component LinksInbox
 * @role Share-target PWA — zapisywanie, czytnik i triage linków z przeglądarki.
 * @composes LinksTriagePanel, links/LinksInboxItem, links/LinksFilterPills, links/LinksQuickCapture, links/LinksBulkActionBar, links/LinkReaderModal
 * @folders links/ = useLinksInboxData, LinksInboxItem, LinksBulkActionBar, LinksFilterPills, LinksQuickCapture, LinkReaderModal
 */
import Spinner from '../ui/Spinner';
import { useHaptics } from '../../hooks/useHaptics';
import { useLinksInboxData } from './links/useLinksInboxData';
import { LinksTriagePanel } from './LinksTriagePanel';
import { LinksInboxItem } from './links/LinksInboxItem';
import { LinksFilterPills } from './links/LinksFilterPills';
import { LinksQuickCapture } from './links/LinksQuickCapture';
import { LinksBulkActionBar } from './links/LinksBulkActionBar';
import { LinkReaderModal } from './links/LinkReaderModal';
import { useLinksKeyboardShortcuts } from './links/hooks/useLinksKeyboardShortcuts';
import { CATEGORIES, CATEGORY_DOTS } from './links/linksUtils';
import WorkspaceNavigation from '../shared/WorkspaceNavigation';
import { WorkspaceHeader } from '../shared/WorkspaceHeader';
import WorkspaceSidebar from '../shared/WorkspaceSidebar';
import SidebarSection from '../shared/SidebarSection';

const STATUS_TABS: { id: 'unread' | 'read' | 'all'; label: string }[] = [
  { id: 'unread', label: 'Nieprzeczytane' },
  { id: 'read',   label: 'Przeczytane' },
  { id: 'all',    label: 'Wszystkie' },
];

export default function LinksInbox({ onBack, onNavigateTo }: { onBack: () => void; onNavigateTo?: (dest: string) => void }) {
  const haptics = useHaptics();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const haptic = (pattern: number | number[]) => {
    haptics.vibrate(pattern);
  };
  const d = useLinksInboxData(haptic);

  useLinksKeyboardShortcuts({
    onFocusSearch: () => searchInputRef.current?.focus(),
    onToggleCapture: () => d.setShowAddForm((prev) => !prev),
    onSetQuickFilter: (f) => d.setQuickFilter(f),
    onClearSelection: () => {
      d.bulk.clearSelection();
      d.bulk.setIsSelectMode(false);
      d.setReaderLink(null);
    },
    isSelectMode: d.bulk.isSelectMode,
    selectedCount: d.bulk.selectedIds.size,
  });

  return (
    <div className="flex h-dvh overflow-hidden bg-background text-text-primary">
      <style>{`
        @keyframes pop-check {
          0%   { transform: scale(1); }
          30%  { transform: scale(0.88); }
          65%  { transform: scale(1.12); }
          85%  { transform: scale(0.97); }
          100% { transform: scale(1); }
        }
        @keyframes pop-delete {
          0%   { transform: scale(1); }
          40%  { transform: scale(0.80); }
          70%  { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
        .animate-pop-check { animation: pop-check 0.38s cubic-bezier(0.36, 0.07, 0.19, 0.97) both; }
        .animate-pop-delete { animation: pop-delete 0.25s cubic-bezier(0.36, 0.07, 0.19, 0.97) both; }
        .btn-press { -webkit-tap-highlight-color: transparent; touch-action: manipulation; }
      `}</style>

      {/* Sidebar */}
      <WorkspaceSidebar>
        <WorkspaceNavigation active="links" onNavigate={onNavigateTo} />

        {CATEGORIES.length > 0 && (
          <>
            <div className="keep-sidebar-separator" />
            <SidebarSection
              label="Kategorie"
              items={CATEGORIES.map(cat => ({
                id: cat,
                label: cat,
                active: d.categoryFilter === cat,
                colorDot: CATEGORY_DOTS[cat] ?? CATEGORY_DOTS.Inne,
                onClick: () => d.setCategoryFilter(p => p === cat ? null : cat),
              }))}
            />
          </>
        )}
      </WorkspaceSidebar>

      {/* Main column */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <WorkspaceHeader
          title="Pocket"
          subtitle={d.unreadCount > 0 ? `${d.unreadCount} nieprzeczytanych` : 'Wszystko przeczytane'}
          onBack={onBack}
          center={
            <div className="keep-search-wrap">
              <Search size={14} className="keep-search-icon" />
              <ControlInput
                ref={searchInputRef}
                value={d.search}
                onChange={(e) => d.setSearch(e.target.value)}
                className="keep-search"
                placeholder="Szukaj w linkach (tytuł, domena, wnioski)…"
                aria-label="Szukaj w linkach"
              />
              {d.search && (
                <Pressable
                  variant="ghost"
                  size="sm"
                  className="keep-search-clear"
                  onClick={() => d.setSearch('')}
                  aria-label="Wyczyść wyszukiwanie"
                >
                  <X size={12} />
                </Pressable>
              )}
            </div>
          }
          actions={
            <>
              <Pressable
                variant={d.bulk.isSelectMode ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => d.bulk.setIsSelectMode(!d.bulk.isSelectMode)}
                title={d.bulk.isSelectMode ? 'Zakończ zaznaczanie (Esc)' : 'Zaznacz wiele linków'}
                className={d.bulk.isSelectMode ? '!bg-primary/15 !text-primary border border-primary/30' : ''}
                aria-label={d.bulk.isSelectMode ? 'Zakończ zaznaczanie' : 'Zaznacz linki'}
              >
                <CheckCheck size={15} />
                <span className="hidden lg:inline">{d.bulk.isSelectMode ? 'Gotowe' : 'Zaznacz'}</span>
              </Pressable>

              <Pressable
                variant="ghost"
                size="sm"
                onClick={() => d.setViewMode(v => v === 'card' ? 'list' : 'card')}
                aria-label={d.viewMode === 'card' ? 'Widok listy' : 'Widok kart'}
                title={d.viewMode === 'card' ? 'Przełącz na listę' : 'Przełącz na kafelki'}
              >
                {d.viewMode === 'card' ? <LayoutList size={16} /> : <Grid3X3 size={16} />}
              </Pressable>

              <Pressable
                variant="ghost"
                size="sm"
                onClick={d.handleAiTriage}
                title="Automatyczny Triage AI"
                icon={<Sparkles size={15} />}
              />

              <Pressable
                variant="tonal"
                size="sm"
                onClick={() => { d.setShowAddForm(p => !p); d.setAddUrl(''); }}
                aria-label={d.showAddForm ? 'Zamknij formularz dodawania linku' : 'Dodaj link'}
                icon={d.showAddForm ? <X size={15} /> : <Plus size={15} />}
              />
            </>
          }
          tabs={{
            items: STATUS_TABS.map((tab) => ({ key: tab.id, label: tab.label })),
            active: (d.quickFilter === 'read' || d.quickFilter === 'unread' || d.quickFilter === 'all') ? d.quickFilter : 'all',
            onChange: (key) => {
              haptic([4]);
              d.setQuickFilter(key as 'unread' | 'read' | 'all');
            },
          }}
        />

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-[var(--ds-maxw-640px)] mx-auto px-5 py-4 pb-24 space-y-3.5">
            {/* Quick Capture Bar & Smart Filter Pills */}
            <div className="space-y-2.5 pb-1">
              <LinksQuickCapture
                onAddLink={async (url) => { await d.handleAddLink(url); }}
                loading={d.addLoading}
              />
              <LinksFilterPills
                activeFilter={d.quickFilter}
                onChangeFilter={d.setQuickFilter}
                counts={d.filterCounts}
              />
            </div>

            {d.sharingStatus && (
              <div className="flex items-center gap-3 px-4 py-3 bg-primary/10 text-primary text-sm font-semibold rounded-[var(--radius-md)] animate-pulse">
                <Spinner size="sm" className="shrink-0" />
                {d.sharingStatus}
              </div>
            )}

            {/* Links List */}
            {d.loading ? (
              <div className="flex min-h-[var(--ds-h-240px)] items-center justify-center">
                <Spinner size="md" />
              </div>
            ) : d.filteredLinks.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-[var(--ds-h-280px)] text-center rounded-[var(--radius-xl)] bg-surface shadow-xs p-6">
                <Inbox size={32} className="text-text-muted/40 mb-3" />
                <p className="text-base font-bold text-text-secondary">Brak linków w tym widoku</p>
                <p className="text-xs text-text-muted mt-1 max-w-[240px] leading-relaxed">
                  Zmień filtry, wyszukaj coś innego lub wklej nowy link ze schowka.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {d.filteredLinks.map(link => (
                  <LinksInboxItem
                    key={link.id}
                    link={link}
                    d={d}
                    haptic={haptic}
                    isSelectMode={d.bulk.isSelectMode}
                    isSelected={d.bulk.selectedIds.has(link.id)}
                    onToggleSelect={() => d.bulk.toggleSelectId(link.id)}
                    onOpenReader={(l) => d.setReaderLink(l)}
                  />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Floating Bulk Action Bar */}
      <LinksBulkActionBar
        selectedCount={d.bulk.selectedIds.size}
        onClearSelection={d.bulk.clearSelection}
        onSelectAll={() => d.bulk.selectAll(d.filteredLinks.map((l) => l.id))}
        onBulkMarkRead={d.bulk.handleBulkMarkRead}
        onBulkCategory={d.bulk.handleBulkCategory}
        onBulkDelete={d.bulk.handleBulkDelete}
        onBulkToTodo={d.bulk.handleBulkToTodo}
        busy={d.bulk.bulkBusy}
      />

      {/* Reader Modal */}
      <LinkReaderModal
        link={d.readerLink}
        onClose={() => d.setReaderLink(null)}
        onToggleRead={d.toggleReadStatus}
        onSaveNotes={d.saveNotes}
        onConvertToTodo={d.handleLinkToTodo}
        onConvertToNote={d.handleLinkToNote}
        onUpdateLink={d.updateLinkData}
      />


      {/* AI Triage Suggestions Modal */}
      <LinksTriagePanel
        showTriagePanel={d.showTriagePanel}
        setShowTriagePanel={d.setShowTriagePanel}
        triageLoading={d.triageLoading}
        triageSuggestions={d.triageSuggestions}
        setTriageSuggestions={d.setTriageSuggestions}
        links={d.links}
        applyTriageSuggestion={d.applyTriageSuggestion}
      />
    </div>
  );
}
