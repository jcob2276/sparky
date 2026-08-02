// @vitest-environment happy-dom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import TagFilterControl from './TagFilterControl';

describe('TagFilterControl', () => {
  it('selects multiple tags and switches match mode', () => {
    const onChange = vi.fn();
    render(<TagFilterControl
      tags={['pilne', 'praca']}
      value={{ tags: [], mode: 'all' }}
      onChange={onChange}
    />);
    fireEvent.click(screen.getByRole('checkbox', { name: '#pilne' }));
    expect(onChange).toHaveBeenCalledWith({ tags: ['pilne'], mode: 'all' });
  });
});
