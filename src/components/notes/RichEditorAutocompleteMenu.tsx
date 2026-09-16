import { Pressable } from '../ui/ControlPrimitives';
import { SlashCommand, WikiNoteItem } from './richEditorTypes';

interface RichEditorAutocompleteMenuProps {
  showSlashMenu: boolean;
  showWikiMenu: boolean;
  menuCoords: { top: number; left: number } | null;
  filteredSlashCommands: SlashCommand[];
  filteredWikiNotes: WikiNoteItem[];
  selectedMenuIndex: number;
  wikiSearchQuery: string;
  onSelectSlashCommand: (cmd: SlashCommand) => void;
  onSelectWikiNote: (note: WikiNoteItem) => void;
}

export default function RichEditorAutocompleteMenu({
  showSlashMenu,
  showWikiMenu,
  menuCoords,
  filteredSlashCommands,
  filteredWikiNotes,
  selectedMenuIndex,
  wikiSearchQuery,
  onSelectSlashCommand,
  onSelectWikiNote,
}: RichEditorAutocompleteMenuProps) {
  if (!menuCoords) return null;

  return (
    <>
      {showSlashMenu && filteredSlashCommands.length > 0 && (
        <div
          className="keep-autocomplete-menu"
          style={{ top: menuCoords.top, left: menuCoords.left }}
          onMouseDown={(e) => e.preventDefault()}
        >
          {filteredSlashCommands.map((cmd, i) => (
            <Pressable
              key={cmd.key}
              type="button"
              className={`keep-autocomplete-item ${i === selectedMenuIndex ? 'active' : ''}`}
              onMouseDown={(e) => {
                e.preventDefault();
                onSelectSlashCommand(cmd);
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--ds-inline-style-8-coll-3)' }}>
                <span
                  style={{
                    fontSize: 'var(--ds-inline-style-14)',
                    width: 'var(--ds-inline-style-20-coll-3)',
                    textAlign: 'center',
                    flexShrink: 0,
                  }}
                >
                  {cmd.icon}
                </span>
                <strong style={{ fontSize: 'var(--ds-inline-style-12)' }}>{cmd.label}</strong>
              </span>
              <span className="item-sub" style={{ marginLeft: 'var(--ds-inline-style-28-coll-2)' }}>
                {cmd.sub}
              </span>
            </Pressable>
          ))}
        </div>
      )}

      {showWikiMenu && (
        <div
          className="keep-autocomplete-menu"
          style={{ top: menuCoords.top, left: menuCoords.left }}
          onMouseDown={(e) => e.preventDefault()}
        >
          <div
            style={{
              padding: 'var(--ds-inline-style-6px-12px-4px)',
              fontSize: 'var(--ds-inline-style-9)',
              fontWeight: 'var(--ds-inline-style-700)',
              textTransform: 'uppercase',
              letterSpacing: 'var(--ds-inline-style-0-05em)',
              opacity: 'var(--ds-inline-style-0-5)',
            }}
          >
            Połącz notatkę
          </div>
          {filteredWikiNotes.length > 0 ? (
            filteredWikiNotes.map((note, i) => (
              <Pressable
                key={note.id}
                type="button"
                className={`keep-autocomplete-item ${i === selectedMenuIndex ? 'active' : ''}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onSelectWikiNote(note);
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--ds-inline-style-8-coll-3)' }}>
                  <span style={{ fontSize: 'var(--ds-inline-style-14)', flexShrink: 0 }}>📎</span>
                  <strong style={{ fontSize: 'var(--ds-inline-style-12)' }}>{note.title || '(Bez tytułu)'}</strong>
                </span>
              </Pressable>
            ))
          ) : (
            <div
              style={{
                padding: 'var(--ds-inline-style-10px-12px)',
                fontSize: 'var(--ds-inline-style-11)',
                opacity: 'var(--ds-inline-style-0-5)',
              }}
            >
              Brak notatek dla &quot;{wikiSearchQuery}&quot;
            </div>
          )}
        </div>
      )}
    </>
  );
}
