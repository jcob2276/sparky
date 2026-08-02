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
});
