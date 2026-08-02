// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Note } from '../../lib/notesApi';
import type { NoteSection } from '../../lib/noteOrganization';
import NoteCollectionSections from './NoteCollectionSections';

const note = (id: string): Note => ({
  id, user_id: 'u1', title: id, content: '', tags: [], color: 'default',
  is_pinned: false, is_archived: false, is_locked: false, deleted_at: null,
  folder_id: null, locked_payload: null, lock_salt: null, lock_iv: null,
  created_at: '2026-08-01T10:00:00Z', updated_at: '2026-08-01T10:00:00Z',
});

const sections: NoteSection[] = [
  { key: 'today', label: 'Dzisiaj', notes: [note('Pierwsza'), note('Druga')] },
];

describe('NoteCollectionSections', () => {
  it('renders named date sections with every note', () => {
    render(<NoteCollectionSections
      sections={sections}
      collectionView="list"
      activeNoteId={null}
      onSelectNote={vi.fn()}
      onLongPress={vi.fn()}
    />);

    expect(screen.getByRole('heading', { name: 'Dzisiaj' })).toBeVisible();
    expect(screen.getByText('Pierwsza')).toBeVisible();
    expect(screen.getByText('Druga')).toBeVisible();
  });
});
