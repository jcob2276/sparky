import { useCallback, useEffect, useMemo, useState, lazy, Suspense } from 'react';

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
import { TODO_NAVIGATE_EVENT, type TodoNavigateDetail } from './todoPaletteNav';
import TodoContextMenuConnected from './TodoContextMenuConnected';
import TodoHeader from './TodoHeader';
import TodoSearchBar from './TodoSearchBar';
import TodoListView from './TodoListView';
import { useTodoViewSwipe } from './hooks/useTodoViewSwipe';
import { useTodoShell } from './hooks/useTodoShell';
import { isStudySubject } from '../../lib/todo/studySubjects';
import { SidebarProvider } from '../ui/sidebar';

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

  const [navDest, setNavDest] = useState<TodoNavDest>('overview');

  const focusQuickCapture = useCallback(() => {
    todoData.setIsExpanded(true);
    quickCaptureRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => quickCaptureRef.current?.querySelector('input')?.focus(), 50);
  }, [todoData, quickCaptureRef]);

  const { todoView, setTodoView, sidebarCollapsed, setSidebarCollapsed, visited } = useTodoShell(!loading, {
    onNewTask: () => { setTodoView('lista'); focusQuickCapture(); },
    onEscape: () => setExpandedId(null),
  });

  const viewSwipe = useTodoViewSwipe(todoView, setTodoView);

  const boardItems = useMemo(() => todoData.items.filter((item) => !isStudySubject(item)), [todoData.items]);
  const setBoardItems = useCallback(
    (fn: (prev: TodoItemRow[]) => object[]) => todoData.setItems((prev) => fn(prev) as TodoItemRow[]),
    [todoData],
  );

  const {
    activeAddSectionId, scanTextOpen, setScanTextOpen,
    openQuickAdd,
    renderInlineQuickCapture, renderAddTodoButton,
  } = useTodoQuickAdd();

  // Command palette navigation: this component owns navDest, so it handles the event directly.
  useEffect(() => {
    const onNavigate = (e: Event) => {
      const detail = (e as CustomEvent<TodoNavigateDetail>).detail;
      if (!detail) return;
      detail.handled = true;
      setTodoView('lista');
      setNavDest(detail.target);
      setActiveFilterSection(null);
    };
    window.addEventListener(TODO_NAVIGATE_EVENT, onNavigate);
    return () => window.removeEventListener(TODO_NAVIGATE_EVENT, onNavigate);
  }, [setTodoView, setActiveFilterSection]);

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
  }, [todoData.items, setActiveFilterSection, setExpandedId, setTodoView]);

  if (loading) {
    return (
      <div className="todoist-theme flex h-dvh overflow-hidden bg-background text-text-primary">
        <div className="w-64 border-r border-border-custom/40 p-4 space-y-4 hidden md:block">
          <Skeleton lines={4} className="opacity-60" />
          <Skeleton variant="card" lines={3} className="opacity-40" />
        </div>
        <div className="flex-1 p-6 space-y-4 max-w-3xl overflow-y-auto">
          <Skeleton variant="block" className="mb-6 h-8 w-48" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} variant="block" className="h-20" />
            ))}
          </div>
          <Skeleton variant="card" lines={4} className="opacity-70" />
          <Skeleton variant="card" lines={3} className="opacity-50" />
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider open={!sidebarCollapsed} onOpenChange={open => setSidebarCollapsed(!open)}>
    <div className="todoist-theme flex h-dvh overflow-hidden bg-background text-text-primary">
      {draggingItem && <DragGhost item={draggingItem} posRef={dragPosRef} />}

      <TodoContextMenuConnected />

      <TodoSidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        navDest={navDest}
        onNavDest={(d) => { setNavDest(d); setActiveFilterSection(null); }}
        inboxCount={todoData.navCounts.inbox}
        todayCount={todoData.navCounts.today}
        upcomingCount={todoData.navCounts.upcoming}
        sections={todoData.sections}
        activeSectionId={activeFilterSection}
        onSelectSection={(id) => { setNavDest('overview'); setActiveFilterSection(id); }}
        onAddSection={(name) => run(() => createTodoSection(userId, name))}
        onRenameSection={(id, name) => run(() => renameTodoSection(id, name))}
        onDeleteSection={(id) => { setActiveFilterSection(null); run(() => archiveTodoSection(id)); }}
        onQuickAdd={focusQuickCapture}
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
          onQuickAdd={() => {
            setTodoView('lista');
            setNavDest('overview');
            setActiveFilterSection(null);
            openQuickAdd('today');
          }}
        />

        <TodoSearchBar />

        {/* Views stay mounted once visited (pre-mounted when idle) and are only hidden: 0 ms switch. */}
        {visited.has('eisenhower') && (
          <main
            className={todoView === 'eisenhower' ? 'flex-1 overflow-y-auto pb-[env(safe-area-inset-bottom)]' : 'hidden'}
            onClick={() => setExpandedId(null)}
          >
            <Suspense fallback={<div className="flex h-64 items-center justify-center"><Spinner size="md" /></div>}>
              <EisenhowerMatrix items={boardItems} setItems={setBoardItems} />
            </Suspense>
          </main>
        )}

        {visited.has('kanban') && (
          <main className={todoView === 'kanban' ? 'flex-1 overflow-hidden pb-[env(safe-area-inset-bottom)]' : 'hidden'}>
            <Suspense fallback={<div className="flex h-64 items-center justify-center"><Spinner size="md" /></div>}>
              <KanbanView items={boardItems} sections={todoData.sections} setItems={setBoardItems} today={today} />
            </Suspense>
          </main>
        )}

        <div className={todoView === 'lista' ? 'flex min-h-0 flex-1 flex-col [--content-default:90rem]' : 'hidden'}>
          <TodoListView
            navDest={navDest}
            onSelectNavDest={(d) => { setNavDest(d); setActiveFilterSection(null); }}
            renderInlineQuickCapture={renderInlineQuickCapture}
            renderAddTodoButton={renderAddTodoButton}
          />
        </div>
      </div>

      {/* Desktop: today's calendar events panel */}
      <TodayEventsPanel userId={userId} today={today} />



      {scanTextOpen && (
        <TodoScanTextModal
          userId={userId}
          sectionId={['today', 'inbox', 'upcoming', null].includes(activeAddSectionId) ? null : activeAddSectionId}
          onClose={() => setScanTextOpen(false)}
          onCreated={(created) => todoData.setItems((prev) => [...created, ...prev])}
        />
      )}
    </div>
    </SidebarProvider>
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
