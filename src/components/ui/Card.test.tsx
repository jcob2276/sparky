// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Card } from './Card';

describe('Card Functional iOS surfaces', () => {
  it('marks the hero as the saturated leading surface', () => {
    render(<Card variant="hero">Najbliższy ruch</Card>);
    const card = screen.getByText('Najbliższy ruch').closest('[data-ui="card"]');
    expect(card).toHaveAttribute('data-variant', 'hero');
    expect(card).toHaveClass('ui-card--hero');
  });

  it('passes semantic DOM attributes to the surface', () => {
    render(<Card variant="grouped" aria-label="Plan dnia">Plan</Card>);
    expect(screen.getByLabelText('Plan dnia')).toHaveAttribute('data-variant', 'grouped');
  });
});
