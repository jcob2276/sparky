// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SplitNotesView from './SplitNotesView';
import type { Note } from './keepUtils';

vi.mock('./MasonryGrid', () => ({ default: () => <div>Galeria kafelkow</div> }));
vi.mock('./InlineEditor', () => ({ default: () => <div>Pelny edytor</div> }));

const note = {
  id: 'note-1', user_id: 'user-1', title: 'Notatka', content: '<p>Tresc</p>', tags: [],
  color: 'white', is_pinned: false, is_archived: false, is_locked: false,
  deleted_at: null, folder_id: null, locked_payload: null, lock_salt: null, lock_iv: null,
  created_at: '2026-08-01T10:00:00Z', updated_at: '2026-08-01T10:00:00Z',
} satisfies Note;

const renderView = (activeNoteId: string | null) => render(
  <SplitNotesView
    notes={[note]} filtered={[note]} pinned={[]} others={[note]}
    activeNoteId={activeNoteId} onSelectNote={vi.fn()} onCloseNote={vi.fn()}
    onUpdate={vi.fn()} onDelete={vi.fn()} onTogglePin={vi.fn()} busy={false}
    allTags={[]} onCreate={vi.fn()} search="" activeTag={null}
    collectionView="gallery"
    gridProps={{
      onDelete: vi.fn(), onTogglePin: vi.fn(), onUpdate: vi.fn(), onReorder: vi.fn(),
      busy: false, columns: 3, editingId: activeNoteId, onOpenCard: vi.fn(),
    }}
  />,
);

describe('SplitNotesView gallery', () => {
  it('uses the full view for the gallery instead of reserving half for an editor', () => {
    renderView(null);
    expect(screen.getByRole('region', { name: 'Galeria notatek' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Edytor notatki' })).not.toBeInTheDocument();
  });

  it('opens a gallery note as a full view instead of a split pane', () => {
    renderView(note.id);
    expect(screen.getByRole('region', { name: 'Edytor notatki' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Galeria notatek' })).not.toBeInTheDocument();
  });
});
