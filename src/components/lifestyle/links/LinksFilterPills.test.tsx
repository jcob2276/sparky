import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LinksFilterPills } from './LinksFilterPills';

describe('LinksFilterPills', () => {
  it('renders all filter pills with active state and counts', () => {
    const handleChange = vi.fn();
    const counts = {
      all: 10,
      unread: 4,
      read: 6,
      videos: 2,
      with_notes: 3,
      with_takeaways: 5,
    };

    render(
      <LinksFilterPills
        activeFilter="unread"
        onChangeFilter={handleChange}
        counts={counts}
      />
    );

    expect(screen.getByText('Wszystkie')).toBeInTheDocument();
    expect(screen.getByText('Nieprzeczytane')).toBeInTheDocument();
    expect(screen.getByText('Przeczytane')).toBeInTheDocument();
    expect(screen.getByText('Wideo')).toBeInTheDocument();
    expect(screen.getByText('Z notatkami')).toBeInTheDocument();
    expect(screen.getByText('Z wnioskami')).toBeInTheDocument();

    const unreadPill = screen.getByRole('tab', { name: /Nieprzeczytane/i });
    expect(unreadPill).toHaveAttribute('aria-selected', 'true');

    const videoPill = screen.getByRole('tab', { name: /Wideo/i });
    fireEvent.click(videoPill);
    expect(handleChange).toHaveBeenCalledWith('videos');
  });
});
