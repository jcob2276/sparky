// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react';
import { CalendarDays, House } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import { DashboardNavBar } from './DashboardNavBar';

describe('DashboardNavBar Functional iOS contract', () => {
  it('exposes a floating navigation layer and the current destination', () => {
    render(
      <DashboardNavBar
        view="dzis"
        navigateTo={() => undefined}
        urgentTodoCount={0}
        navItems={[
          { id: 'dzis', icon: House, label: 'Dzisiaj' },
          { id: 'plan', icon: CalendarDays, label: 'Plan' },
        ]}
        tabOrder={['dzis', 'plan']}
      />,
    );

    const navigation = screen.getByRole('navigation', { name: 'Główna nawigacja' });
    expect(navigation).toHaveAttribute('data-material', 'floating');
    expect(navigation).toHaveClass('ui-floating-nav');
    expect(screen.getByRole('button', { name: 'Dzisiaj' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('button', { name: 'Plan' })).not.toHaveAttribute('aria-current');
  });
});
