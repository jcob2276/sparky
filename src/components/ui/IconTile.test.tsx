// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react';
import { Sunrise } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import IconTile from './IconTile';

describe('IconTile', () => {
  it('maps an icon to one semantic colour role', () => {
    render(<IconTile tone="direction" icon={<Sunrise />} label="Kierunek" />);
    const tile = screen.getByRole('img', { name: 'Kierunek' });
    expect(tile).toHaveAttribute('data-ui', 'icon-tile');
    expect(tile).toHaveAttribute('data-tone', 'direction');
  });

  it('stays decorative when it has no label', () => {
    const { container } = render(<IconTile tone="action" icon={<Sunrise />} />);
    expect(container.querySelector('[data-ui="icon-tile"]')).toHaveAttribute('aria-hidden', 'true');
  });
});
