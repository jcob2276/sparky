// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import NumberTicker from './NumberTicker';

describe('NumberTicker', () => {
  it('renders numeric value with accessible aria-label', () => {
    render(<NumberTicker value={120} />);
    const container = screen.getByLabelText('120');
    expect(container).toBeInTheDocument();
  });

  it('renders formatted time string with colon', () => {
    render(<NumberTicker value="01:30" />);
    const container = screen.getByLabelText('01:30');
    expect(container).toBeInTheDocument();
    expect(screen.getByText(':')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<NumberTicker value={42} className="text-primary font-black" />);
    const container = screen.getByLabelText('42');
    expect(container).toHaveClass('text-primary');
    expect(container).toHaveClass('font-black');
  });
});
