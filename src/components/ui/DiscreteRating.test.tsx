// @vitest-environment happy-dom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import DiscreteRating, { type RatingOption } from './DiscreteRating';

const options: readonly RatingOption[] = Array.from({ length: 10 }, (_, index) => ({
  value: index + 1,
  label: String(index + 1),
  tone: index < 3 ? 'critical' : index < 6 ? 'warning' : index < 8 ? 'info' : 'success',
}));

describe('DiscreteRating', () => {
  it('selects directly and moves with arrow keys', () => {
    const onChange = vi.fn();
    render(
      <DiscreteRating
        label="Wynik dnia"
        value={7}
        max={10}
        options={options}
        onChange={onChange}
      />,
    );

    const seven = screen.getByRole('radio', { name: /7 z 10/ });
    fireEvent.keyDown(seven, { key: 'ArrowRight' });
    expect(onChange).toHaveBeenCalledWith(8);

    fireEvent.click(screen.getByRole('radio', { name: /10 z 10/ }));
    expect(onChange).toHaveBeenCalledWith(10);
  });

  it('uses roving focus and supports Home and End', () => {
    const onChange = vi.fn();
    render(
      <DiscreteRating
        label="Wynik dnia"
        value={7}
        max={10}
        options={options}
        onChange={onChange}
      />,
    );

    const seven = screen.getByRole('radio', { name: /7 z 10/ });
    const six = screen.getByRole('radio', { name: /6 z 10/ });
    expect(seven).toHaveAttribute('tabindex', '0');
    expect(six).toHaveAttribute('tabindex', '-1');

    fireEvent.keyDown(seven, { key: 'Home' });
    expect(onChange).toHaveBeenCalledWith(1);
    fireEvent.keyDown(seven, { key: 'End' });
    expect(onChange).toHaveBeenCalledWith(10);
  });

  it('does not emit a duplicate selection', () => {
    const onChange = vi.fn();
    render(
      <DiscreteRating
        label="Wynik dnia"
        value={7}
        max={10}
        options={options}
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByRole('radio', { name: /7 z 10/ }));
    expect(onChange).not.toHaveBeenCalled();
  });
});
