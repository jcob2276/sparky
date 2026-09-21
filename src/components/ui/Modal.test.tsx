// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Modal from './Modal';

describe('Modal floating material', () => {
  it('reserves the floating material for the dialog layer', () => {
    render(
      <Modal isOpen onClose={() => undefined} title="Szczegóły">
        Treść
      </Modal>,
    );

    const dialog = screen.getByRole('dialog', { name: 'Szczegóły' });
    expect(dialog).toHaveAttribute('data-material', 'floating');
    expect(dialog).toHaveClass('ui-floating-layer');
  });

  it('adds ios-sheet-active to documentElement when open and removes on close', () => {
    const { rerender } = render(
      <Modal isOpen onClose={() => undefined} title="Widok">
        Treść
      </Modal>,
    );
    expect(document.documentElement.classList.contains('ios-sheet-active')).toBe(true);

    rerender(
      <Modal isOpen={false} onClose={() => undefined} title="Widok">
        Treść
      </Modal>,
    );
    expect(document.documentElement.classList.contains('ios-sheet-active')).toBe(false);
  });
});
