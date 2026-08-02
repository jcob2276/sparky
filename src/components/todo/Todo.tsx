import { useEffect, useState } from 'react';

import DataStateNotice from '../core/DataStateNotice';
import { createTodoSection, renameTodoSection, archiveTodoSection, setTodoStatus, deleteTodoItem, updateTodoItem } from '../../lib/todo/todo';
import DragGhost from './DragGhost';
import TodoSidebar, { type TodoNavDest } from './TodoSidebar';
import TodoScanTextModal from './TodoScanTextModal';
import EisenhowerMatrix from './EisenhowerMatrix';
import KanbanView from './KanbanView';
import TodayEventsPanel from './TodayEventsPanel';
import { useTodoData, type TodoItemRow } from './useTodoData';

import { TodoContext, useTodoContext } from './context/TodoContext';
import './todo.css';
import { useTodoQuickAdd } from './hooks/useTodoQuickAdd';
import TodoContextMenuConnected from './TodoContextMenuConnected';
import TodoHeader, { type TodoViewMode } from './TodoHeader';
import TodoSearchBar from './TodoSearchBar';
import TodoListView from './TodoListView';
import WorkspaceNavigation from '../shared/WorkspaceNavigation';
import { useTodoViewSwipe } from './hooks/useTodoViewSwipe';

import { TodoBulkActionBar } from './TodoBulkActionBar';
import { addDays } from '../calendar/calendarHelpers';

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
  } = todoData;

  const [todoView, setTodoView] = useState<TodoViewMode>('lista');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [navDest, setNavDest] = useState<TodoNavDest>('overview');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);

  const viewSwipe = useTodoViewSwipe(todoView, setTodoView);

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

  const {
    activeAddSectionId, scanTextOpen, setScanTextOpen,
    openQuickAdd,
    renderInlineQuickCapture, renderAddTodoButton,
  } = useTodoQuickAdd();

  const handleBulkComplete = async () => {
    if (selectedIds.size === 0) return;
    setBulkBusy(true);
    try {
      const ids = Array.from(selectedIds);
      todoData.setItems((prev) =>
        prev.map((i) => (selectedIds.has(i.id) ? { ...i, status: 'done', completed_at: new Date().toISOString() } : i))
      );
      await Promise.all(ids.map((id) => setTodoStatus({ id }, 'done')));
      setSelectedIds(new Set());
      setIsSelectMode(false);
    } finally {
      setBulkBusy(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setBulkBusy(true);
    try {
      const ids = Array.from(selectedIds);
      todoData.setItems((prev) => prev.filter((i) => !selectedIds.has(i.id)));
      await Promise.all(ids.map((id) => deleteTodoItem(id)));
      setSelectedIds(new Set());
      setIsSelectMode(false);
    } finally {
      setBulkBusy(false);
    }
  };

  const handleBulkSetToday = async () => {
    if (selectedIds.size === 0) return;
    setBulkBusy(true);
    try {
      const ids = Array.from(selectedIds);
      const patch = { due_date: today, ai_bucket: 'today' };
      todoData.setItems((prev) =>
        prev.map((i) => (selectedIds.has(i.id) ? { ...i, ...patch } : i))
      );
      await Promise.all(ids.map((id) => updateTodoItem(id, patch)));
      setSelectedIds(new Set());
      setIsSelectMode(false);
    } finally {
      setBulkBusy(false);
    }
  };

  const handleBulkSetTomorrow = async () => {
    if (selectedIds.size === 0) return;
    setBulkBusy(true);
    try {
      const ids = Array.from(selectedIds);
      const tomorrow = addDays(today, 1);
      const patch = { due_date: tomorrow, ai_bucket: null };
      todoData.setItems((prev) =>
        prev.map((i) => (selectedIds.has(i.id) ? { ...i, ...patch } : i))
      );
      await Promise.all(ids.map((id) => updateTodoItem(id, patch)));
      setSelectedIds(new Set());
      setIsSelectMode(false);
    } finally {
      setBulkBusy(false);
    }
  };

  const handleBulkSetPriority = async (priority: 'urgent' | 'high' | 'normal' | 'low') => {
    if (selectedIds.size === 0) return;
    setBulkBusy(true);
    try {
      const ids = Array.from(selectedIds);
      todoData.setItems((prev) =>
        prev.map((i) => (selectedIds.has(i.id) ? { ...i, priority } : i))
      );
      await Promise.all(ids.map((id) => updateTodoItem(id, { priority })));
      setSelectedIds(new Set());
      setIsSelectMode(false);
    } finally {
      setBulkBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <DataStateNotice tone="loading" title="Zadania się ładują" detail="Pobieram otwarte zadania." />
      </div>
    );
  }

  return (
    <div className="todoist-theme flex h-screen overflow-hidden bg-background text-text-primary">
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
            <EisenhowerMatrix items={todoData.items} setItems={(fn) => todoData.setItems((prev) => fn(prev) as TodoItemRow[])} />
          </main>
        )}

        {todoView === 'kanban' && (
          <main className="flex-1 overflow-hidden">
            <KanbanView
              items={todoData.items}
              sections={todoData.sections}
              setItems={(fn) => todoData.setItems((prev) => fn(prev) as TodoItemRow[])}
              today={today}
            />
          </main>
        )}

        {todoView === 'lista' && (
          <TodoListView
            navDest={navDest}
            onSelectNavDest={(d) => { setNavDest(d); setActiveFilterSection(null); }}
            renderInlineQuickCapture={renderInlineQuickCapture}
            renderAddTodoButton={renderAddTodoButton}
            isSelectMode={isSelectMode}
            selectedIds={selectedIds}
            onToggleId={(id) => {
              const next = new Set(selectedIds);
              if (next.has(id)) next.delete(id);
              else next.add(id);
              setSelectedIds(next);
            }}
          />
        )}
      </div>

      <TodoBulkActionBar
        selectedCount={selectedIds.size}
        onClearSelection={() => { setSelectedIds(new Set()); setIsSelectMode(false); }}
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
