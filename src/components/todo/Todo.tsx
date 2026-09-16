import { useEffect, useState, lazy, Suspense } from 'react';

import Skeleton from '../ui/Skeleton';
import Spinner from '../ui/Spinner';
import { createTodoSection, renameTodoSection, archiveTodoSection } from '../../lib/todo/todo';
import DragGhost from './DragGhost';
import TodoSidebar, { type TodoNavDest } from './TodoSidebar';
import TodoScanTextModal from './TodoScanTextModal';
const EisenhowerMatrix = lazy(() => import('./EisenhowerMatrix'));
const KanbanView = lazy(() => import('./KanbanView'));
import TodayEventsPanel from './TodayEventsPanel';
import { useTodoData } from './useTodoData';
import type { TodoItemRow } from './useTodoData';

import { TodoContext, useTodoContext } from './context/TodoContext';
import './todo.css';
import { useTodoQuickAdd } from './hooks/useTodoQuickAdd';
import TodoContextMenuConnected from './TodoContextMenuConnected';
import TodoHeader, { type TodoViewMode } from './TodoHeader';
import TodoSearchBar from './TodoSearchBar';
import TodoListView from './TodoListView';
import WorkspaceNavigation from '../shared/WorkspaceNavigation';
import { useTodoViewSwipe } from './hooks/useTodoViewSwipe';
import { useTodoBulkActions } from './hooks/useTodoBulkActions';
import { TodoBulkActionBar } from './TodoBulkActionBar';

function TodoInner({ onBack, onNavigateTo }: { onBack: () => void; onNavigateTo?: (dest: string) => void }) {
  const todoData = useTodoContext();
  const {
    userId, loading,
    setExpandedId,
    activeFilterSection, setActiveFilterSection,
    quickCaptureRef,
    draggingItem, dragPosRef,
    today,
    run,
    isSelectMode, setIsSelectMode,
    selectedIds, setSelectedIds,
    selectAll, clearSelection,
  } = todoData;

  const [todoView, setTodoView] = useState<TodoViewMode>('lista');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [navDest, setNavDest] = useState<TodoNavDest>('overview');

  const viewSwipe = useTodoViewSwipe(todoView, setTodoView);

  const {
    bulkBusy,
    handleBulkComplete,
    handleBulkDelete,
    handleBulkSetToday,
    handleBulkSetTomorrow,
    handleBulkSetPriority,
  } = useTodoBulkActions({
    selectedIds,
    setSelectedIds,
    setIsSelectMode,
    setItems: todoData.setItems,
    today,
  });

  const {
    activeAddSectionId, scanTextOpen, setScanTextOpen,
    openQuickAdd,
    renderInlineQuickCapture, renderAddTodoButton,
  } = useTodoQuickAdd();

  useEffect(() => {
    const taskId = new URLSearchParams(window.location.search).get('task');
    if (!taskId || !todoData.items.some((item) => item.id === taskId)) return;
    window.history.replaceState({}, '', window.location.pathname);
    window.setTimeout(() => {
      setTodoView('lista');
      setNavDest('overview');
      setActiveFilterSection(null);
      setExpandedId(taskId);
      document.querySelector(`[data-todo-id="${CSS.escape(taskId)}"]`)?.scrollIntoView({
        behavior: 'smooth', block: 'center',
      });
    }, 50);
  }, [todoData.items, setActiveFilterSection, setExpandedId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable;
      if (isInput) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        todoData.setIsExpanded(true);
        quickCaptureRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => quickCaptureRef.current?.querySelector('input')?.focus(), 50);
      } else if (e.key === 'Escape') {
        if (isSelectMode) {
          clearSelection();
        } else {
          setExpandedId(null);
        }
      } else if (e.key === '1') {
        setTodoView('lista');
      } else if (e.key === '2') {
        setTodoView('kanban');
      } else if (e.key === '3') {
        setTodoView('eisenhower');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [clearSelection, isSelectMode, quickCaptureRef, setExpandedId, todoData]);

  if (loading) {
    return (
      <div className="todoist-theme flex h-dvh overflow-hidden bg-background text-text-primary">
        <div className="w-64 border-r border-border-custom/40 p-4 space-y-4 hidden md:block">
          <Skeleton lines={4} className="opacity-60" />
          <Skeleton variant="card" lines={3} className="opacity-40" />
        </div>
        <div className="flex-1 p-6 space-y-4 max-w-3xl overflow-y-auto">
          <div className="h-8 w-48 rounded-xl bg-surface-solid/70 animate-pulse mb-6" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 rounded-2xl border border-border-custom/20 bg-surface-solid/40 animate-pulse" />
            ))}
          </div>
          <Skeleton variant="card" lines={4} className="opacity-70" />
          <Skeleton variant="card" lines={3} className="opacity-50" />
        </div>
      </div>
    );
  }

  return (
    <div className="todoist-theme flex h-dvh overflow-hidden bg-background text-text-primary">
      {draggingItem && <DragGhost item={draggingItem} posRef={dragPosRef} />}

      <TodoContextMenuConnected />

      <TodoSidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        navDest={navDest}
        onNavDest={(d) => { setNavDest(d); setActiveFilterSection(null); }}
        inboxCount={todoData.inboxItems.length}
        todayCount={todoData.todayItems.length}
        upcomingCount={todoData.upcomingItems.length}
        sections={todoData.sections}
        activeSectionId={activeFilterSection}
        onSelectSection={(id) => { setNavDest('overview'); setActiveFilterSection(id); }}
        onAddSection={(name) => run(() => createTodoSection(userId, name))}
        onRenameSection={(id, name) => run(() => renameTodoSection(id, name))}
        onDeleteSection={(id) => { setActiveFilterSection(null); run(() => archiveTodoSection(id)); }}
        onQuickAdd={() => {
          todoData.setIsExpanded(true);
          quickCaptureRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setTimeout(() => quickCaptureRef.current?.querySelector('input')?.focus(), 50);
        }}
        onNavigateTo={onNavigateTo}
      />

      <div
        className="flex flex-1 flex-col min-w-0 overflow-hidden"
        onTouchStart={viewSwipe.onTouchStart}
        onTouchEnd={viewSwipe.onTouchEnd}
      >
        <TodoHeader
          onBack={onBack}
          todoView={todoView}
          setTodoView={setTodoView}
          sidebarCollapsed={sidebarCollapsed}
          setSidebarCollapsed={setSidebarCollapsed}
          isSelectMode={isSelectMode}
          onToggleSelectMode={() => {
            setIsSelectMode(!isSelectMode);
            if (isSelectMode) setSelectedIds(new Set());
          }}
        />

        <TodoSearchBar />

        {todoView === 'eisenhower' && (
          <main className="flex-1 overflow-y-auto" onClick={() => setExpandedId(null)}>
            <Suspense fallback={<div className="flex h-64 items-center justify-center"><Spinner size="md" /></div>}>
              <EisenhowerMatrix items={todoData.items} setItems={(fn) => todoData.setItems((prev) => fn(prev) as TodoItemRow[])} />
            </Suspense>
          </main>
        )}

        {todoView === 'kanban' && (
          <main className="flex-1 overflow-hidden">
            <Suspense fallback={<div className="flex h-64 items-center justify-center"><Spinner size="md" /></div>}>
              <KanbanView
                items={todoData.items}
                sections={todoData.sections}
                setItems={(fn) => todoData.setItems((prev) => fn(prev) as TodoItemRow[])}
                today={today}
              />
            </Suspense>
          </main>
        )}

        {todoView === 'lista' && (
          <TodoListView
            navDest={navDest}
            onSelectNavDest={(d) => { setNavDest(d); setActiveFilterSection(null); }}
            renderInlineQuickCapture={renderInlineQuickCapture}
            renderAddTodoButton={renderAddTodoButton}
          />
        )}
      </div>

      <TodoBulkActionBar
        selectedCount={selectedIds.size}
        onClearSelection={clearSelection}
        onSelectAll={() => {
          const allOpen = todoData.items.filter((i) => i.status !== 'done').map((i) => i.id);
          selectAll(allOpen);
        }}
        onBulkComplete={handleBulkComplete}
        onBulkDelete={handleBulkDelete}
        onBulkSetToday={handleBulkSetToday}
        onBulkSetTomorrow={handleBulkSetTomorrow}
        onBulkSetPriority={handleBulkSetPriority}
        busy={bulkBusy}
      />

      {/* Desktop: today's calendar events panel */}
      <TodayEventsPanel userId={userId} today={today} />

      {/* Mobile bottom nav */}
      <WorkspaceNavigation
        active="todo"
        orientation="horizontal"
        onNavigate={onNavigateTo}
        primaryAction={{ label: 'Zadanie', onClick: () => {
          setTodoView('lista');
          setNavDest('overview');
          setActiveFilterSection(null);
          openQuickAdd('today');
        } }}
        className="md:hidden fixed bottom-0 inset-x-0 z-[var(--z-overlay)] border-t border-border-custom bg-background/95 backdrop-blur-[var(--blur-xl)]"
      />

      {scanTextOpen && (
        <TodoScanTextModal
          userId={userId}
          sectionId={['today', 'inbox', 'upcoming', null].includes(activeAddSectionId) ? null : activeAddSectionId}
          onClose={() => setScanTextOpen(false)}
          onCreated={(created) => todoData.setItems((prev) => [...created, ...prev])}
        />
      )}
    </div>
  );
}

export default function Todo({ onBack, onNavigateTo }: { onBack: () => void; onNavigateTo?: (dest: string) => void }) {
  const todoData = useTodoData();
  return (
    <TodoContext.Provider value={todoData}>
      <TodoInner onBack={onBack} onNavigateTo={onNavigateTo} />
    </TodoContext.Provider>
  );
}
