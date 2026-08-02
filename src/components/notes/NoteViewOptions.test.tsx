// @vitest-environment happy-dom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_NOTE_COLLECTION_PREFERENCES } from '../../lib/noteOrganization';
import NoteViewOptions from './NoteViewOptions';

describe('NoteViewOptions', () => {
  it('turns date grouping off when title sorting is selected', () => {
    const onChange = vi.fn();
    render(<NoteViewOptions value={DEFAULT_NOTE_COLLECTION_PREFERENCES} onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Opcje widoku' }));
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'Tytuł' }));

    expect(onChange).toHaveBeenCalledWith({
      ...DEFAULT_NOTE_COLLECTION_PREFERENCES,
      sortField: 'title',
      groupByDate: false,
    });
  });
});
