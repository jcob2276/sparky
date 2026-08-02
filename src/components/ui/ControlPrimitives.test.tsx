// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ControlInput, ControlSelect, ControlTextarea } from './ControlPrimitives';

describe('ControlPrimitives', () => {
  it('uses the shared control surface for text entry', () => {
    render(<ControlTextarea aria-label="Reflection" />);
    const textarea = screen.getByRole('textbox', { name: 'Reflection' });
    expect(textarea).toHaveAttribute('data-ui', 'control-textarea');
    expect(textarea).toHaveClass('ui-control');
  });

  it('keeps native input and select semantics', () => {
    render(
      <>
        <ControlInput aria-label="Search" />
        <ControlSelect aria-label="Category"><option>All</option></ControlSelect>
      </>,
    );
    expect(screen.getByRole('textbox', { name: 'Search' })).toHaveAttribute('data-ui', 'control-input');
    expect(screen.getByRole('combobox', { name: 'Category' })).toHaveAttribute('data-ui', 'control-select');
  });
});
