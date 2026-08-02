// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { GroupedList, GroupedListRow } from './GroupedList';

describe('GroupedList', () => {
  it('renders one semantic surface with rows', () => {
    render(
      <GroupedList aria-label="Plan dnia">
        <GroupedListRow>Pierwsze zadanie</GroupedListRow>
        <GroupedListRow>Drugie zadanie</GroupedListRow>
      </GroupedList>,
    );

    expect(screen.getByRole('list', { name: 'Plan dnia' })).toHaveAttribute('data-ui', 'grouped-list');
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('allows a full-width separator when inset is disabled', () => {
    render(<GroupedListRow inset={false}>Wiersz</GroupedListRow>);
    expect(screen.getByRole('listitem')).not.toHaveAttribute('data-inset');
  });
});
