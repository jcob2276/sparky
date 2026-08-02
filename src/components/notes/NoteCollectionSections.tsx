import { Pin } from 'lucide-react';
import type { Note } from '../../lib/notesApi';
import MasonryGrid from './MasonryGrid';
import NoteRow from './NoteRow';
import type { NoteSection } from '../../lib/noteOrganization';
import SwipeableNoteRow from './SwipeableNoteRow';

interface NoteCollectionSectionsProps {
  sections: NoteSection[];
  collectionView: 'list' | 'gallery';
  activeNoteId: string | null;
  onSelectNote: (id: string) => void;
  onLongPress: (note: Note) => void;
  gridProps?: Omit<Parameters<typeof MasonryGrid>[0], 'notes'>;
  onTogglePin?: (note: Note) => void;
  onMove?: (note: Note) => void;
  onDelete?: (note: Note) => void;
}

export default function NoteCollectionSections({
  sections,
  collectionView,
  activeNoteId,
  onSelectNote,
  onLongPress,
  gridProps,
  onTogglePin,
  onMove,
  onDelete,
}: NoteCollectionSectionsProps) {
  return (
    <div className={collectionView === 'gallery' ? 'keep-note-sections gallery' : 'keep-note-sections'}>
      {sections.map(section => (
        <section key={section.key} className="keep-note-section" aria-labelledby={`note-section-${section.key}`}>
          <h2 id={`note-section-${section.key}`} className="keep-note-section-title">
            {section.key === 'pinned' && <Pin size={12} fill="currentColor" aria-hidden="true" />}
            {section.label}
          </h2>
          {collectionView === 'gallery' && gridProps ? (
            <MasonryGrid notes={section.notes} {...gridProps} />
          ) : (
            <div className="keep-note-section-surface">
              {section.notes.map((note, index) => (
                <div key={note.id}>
                  <SwipeableNoteRow
                    isPinned={note.is_pinned}
                    onTogglePin={() => onTogglePin?.(note)}
                    onMove={() => onMove?.(note)}
                    onDelete={() => onDelete?.(note)}
                  >
                    <NoteRow
                      note={note}
                      isActive={activeNoteId === note.id}
                      onClick={() => onSelectNote(note.id)}
                      onLongPress={() => onLongPress(note)}
                    />
                  </SwipeableNoteRow>
                  {index < section.notes.length - 1 && <div className="keep-note-section-divider" />}
                </div>
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
