/**
 * @component KeepHeader
 * @role Pasek góry: wyszukiwanie + przełącznik widoku siatka/podział.
 * @usedBy Keep
 */
import { Grid3X3, List, Download, LockKeyhole, Search, SquarePen, X } from 'lucide-react';
import { WorkspaceHeader } from '../shared/WorkspaceHeader';
import { ControlInput, Pressable } from '../ui/ControlPrimitives';
import NoteViewOptions from './NoteViewOptions';
import type { NoteCollectionPreferences } from '../../lib/noteOrganization';

interface KeepHeaderProps {
  onBack: () => void;
  viewMode: 'list' | 'gallery';
  setViewMode: (value: 'list' | 'gallery') => void;
  search: string;
  setSearch: (value: string) => void;
  onExport: () => void;
  onNewNote: () => void;
  exporting: boolean;
  showLockNow?: boolean;
  onLockNow?: () => void;
  preferences: NoteCollectionPreferences;
  onPreferencesChange: (value: NoteCollectionPreferences) => void;
}

export default function KeepHeader({
  onBack, viewMode, setViewMode, search, setSearch, onExport, onNewNote, exporting, showLockNow, onLockNow,
  preferences, onPreferencesChange,
}: KeepHeaderProps) {
  return (
    <WorkspaceHeader
      title="Notatki"
      onBack={onBack}
      center={(
        <div className="keep-search-wrap">
          <Search size={14} className="keep-search-icon" />
          <ControlInput
            value={search}
            onChange={event => setSearch(event.target.value)}
            className="keep-search"
            placeholder="Szukaj w notatkach…"
            aria-label="Szukaj w notatkach"
          />
          {search && (
            <Pressable variant="ghost" size="sm" className="keep-search-clear" onClick={() => setSearch('')} aria-label="Wyczyść wyszukiwanie">
              <X size={12} />
            </Pressable>
          )}
        </div>
      )}
      actions={<>
        <NoteViewOptions value={preferences} onChange={onPreferencesChange} />
        <Pressable variant="primary" size="sm" onClick={onNewNote} aria-label="Nowa notatka">
          <SquarePen size={15} />
          <span className="hidden lg:inline">Nowa notatka</span>
        </Pressable>
        {showLockNow && <Pressable variant="ghost" size="sm" onClick={onLockNow} title="Zablokuj teraz"><LockKeyhole size={15} /></Pressable>}
        <Pressable variant="ghost" size="sm" onClick={onExport} disabled={exporting} title="Eksportuj wszystkie notatki">
          <Download size={15} />
          <span className="hidden lg:inline">{exporting ? 'Eksportowanie…' : 'Eksport'}</span>
        </Pressable>
      </>}
      tabs={{
        items: [
          { key: 'list', label: 'Lista', icon: <List size={14} /> },
          { key: 'gallery', label: 'Galeria', icon: <Grid3X3 size={14} /> },
        ],
        active: viewMode,
        onChange: (key) => setViewMode(key as 'list' | 'gallery'),
      }}
    />
  );
}
