import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { SidebarProvider } from '../ui/sidebar';
import { TodoContext, type TodoContextType } from './context/TodoContext';
import TodoHeader from './TodoHeader';
import TodoSidebar from './TodoSidebar';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it('opens mobile navigation and closes it after choosing Studia', async () => {
  vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(390);
  const selectSection = vi.fn();

  render(
    <TodoContext.Provider value={{ push: { isSupported: false }, pushSubscribed: false } as TodoContextType}>
      <SidebarProvider>
        <TodoSidebar
          collapsed={false} onToggleCollapse={vi.fn()}
          navDest="overview" onNavDest={vi.fn()}
          inboxCount={0} todayCount={0} upcomingCount={0}
          sections={[{ id: 'studia', name: 'Studia' }]}
          activeSectionId={null} onSelectSection={selectSection}
          onAddSection={vi.fn()} onRenameSection={vi.fn()}
          onDeleteSection={vi.fn()} onQuickAdd={vi.fn()}
        />
        <TodoHeader
          onBack={vi.fn()} todoView="lista" setTodoView={vi.fn()}
          sidebarCollapsed={false} setSidebarCollapsed={vi.fn()}
        />
      </SidebarProvider>
    </TodoContext.Provider>,
  );

  fireEvent.click(screen.getByRole('button', { name: 'Otwórz nawigację zadań' }));
  const navigation = await screen.findByRole('dialog', { name: 'Zadania' });
  fireEvent.click(within(navigation).getByText('Studia'));

  expect(selectSection).toHaveBeenCalledWith('studia');
  await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Zadania' })).toBeNull());
});
