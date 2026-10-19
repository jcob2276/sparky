import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ListTodo, Search } from 'lucide-react';
import { DashboardFastCaptureMenu } from './DashboardFastCapture';

describe('DashboardFastCaptureMenu', () => {
  beforeEach(() => window.localStorage.clear());

  it('uses the canonical dialog and closes after an action', () => {
    const action = vi.fn();
    const onClose = vi.fn();
    render(
      <DashboardFastCaptureMenu
        show
        onClose={onClose}
        items={[{ label: 'Jedzenie', emoji: '🍎', color: 'red', action }]}
        tools={[{ label: 'Szukaj', icon: Search, action: vi.fn() }]}
      />,
    );

    expect(screen.getByRole('dialog', { name: 'Szybkie akcje' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Jedzenie' }));
    expect(action).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });


  it('separates logging from navigation and shows an urgent counter on the matching tile', () => {
    render(
      <DashboardFastCaptureMenu
        show
        onClose={vi.fn()}
        items={[{ label: 'Trening', emoji: '', color: 'red', action: vi.fn() }]}
        tools={[{ label: 'Zadania', icon: ListTodo, action: vi.fn(), route: 'todo' }]}
        badges={{ todo: 3 }}
      />,
    );
    expect(screen.getByRole('region', { name: 'Zaloguj' })).toHaveTextContent('Trening');
    expect(screen.getByRole('region', { name: 'Przejdź do' })).toHaveTextContent('Zadania');
    expect(screen.getByRole('button', { name: 'Zadania, 3 pilnych' })).toHaveTextContent('3');
  });
});
