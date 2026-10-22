// @vitest-environment happy-dom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_NOTE_COLLECTION_PREFERENCES } from '../../lib/noteOrganization';
import NoteViewOptions from './NoteViewOptions';

describe('NoteViewOptions', () => {
  it('keeps the date grouping choice when title sorting is selected, so it returns with date sorting', () => {
    const onChange = vi.fn();
    render(<NoteViewOptions value={DEFAULT_NOTE_COLLECTION_PREFERENCES} onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Opcje widoku' }));
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'Tytuł' }));

    expect(onChange).toHaveBeenCalledWith({
      ...DEFAULT_NOTE_COLLECTION_PREFERENCES,
      sortField: 'title',
      groupByDate: true,
    });
  });
});
