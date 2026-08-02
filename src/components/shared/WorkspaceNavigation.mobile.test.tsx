// @vitest-environment happy-dom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import WorkspaceNavigation from './WorkspaceNavigation';

describe('WorkspaceNavigation on mobile', () => {
  it('keeps the note action in a working bottom dock', () => {
    const onCreate = vi.fn();
    render(
      <WorkspaceNavigation
        active="keep"
        orientation="horizontal"
        primaryAction={{ label: 'Notatka', onClick: onCreate }}
      />,
    );

    const dock = screen.getByRole('navigation');
    expect(dock).toHaveStyle({ position: 'fixed', bottom: '12px', left: '50%', transform: 'translateX(-50%)' });

    fireEvent.click(screen.getByRole('button', { name: 'Notatka' }));
    expect(onCreate).toHaveBeenCalledOnce();
  });
});
