import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import KeepHeader from './KeepHeader';
import { DEFAULT_NOTE_COLLECTION_PREFERENCES } from '../../lib/noteOrganization';

const viewOptions = {
  preferences: DEFAULT_NOTE_COLLECTION_PREFERENCES,
  onPreferencesChange: vi.fn(),
};

describe('KeepHeader', () => {
  it('offers Apple Notes list and gallery views', () => {
    render(
      <KeepHeader
        onBack={vi.fn()}
        viewMode="list"
        setViewMode={vi.fn()}
        search=""
        setSearch={vi.fn()}
        onExport={vi.fn()}
        onNewNote={vi.fn()}
        exporting={false}
        {...viewOptions}
      />,
    );

    expect(screen.getByText('Lista')).toBeInTheDocument();
    expect(screen.getByText('Galeria')).toBeInTheDocument();
    expect(screen.queryByText('Podział')).not.toBeInTheDocument();
  });

  it('lets desktop users create a note from the header', () => {
    const onNewNote = vi.fn();
    render(
      <KeepHeader
        onBack={vi.fn()}
        viewMode="list"
        setViewMode={vi.fn()}
        search=""
        setSearch={vi.fn()}
        onExport={vi.fn()}
        onNewNote={onNewNote}
        exporting={false}
        {...viewOptions}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Nowa notatka' }));
    expect(onNewNote).toHaveBeenCalledOnce();
  });
});
