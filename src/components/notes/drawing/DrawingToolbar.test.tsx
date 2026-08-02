// @vitest-environment happy-dom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import DrawingToolbar from './DrawingToolbar';

describe('DrawingToolbar', () => {
  it('offers Markup tools and changes the selected tool', () => {
    const onToolChange = vi.fn();
    render(<DrawingToolbar
      tool="pen"
      color="#000000"
      width={4}
      opacity={1}
      onToolChange={onToolChange}
      onColorChange={vi.fn()}
      onWidthChange={vi.fn()}
      onOpacityChange={vi.fn()}
      onUndo={vi.fn()}
      onRedo={vi.fn()}
      ruler={false}
      onRulerChange={vi.fn()}
    />);
    fireEvent.click(screen.getByRole('button', { name: 'Ołówek' }));
    expect(onToolChange).toHaveBeenCalledWith('pencil');
    expect(screen.getByRole('button', { name: 'Lasso' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Gumka obiektowa' })).toBeVisible();
  });
});
