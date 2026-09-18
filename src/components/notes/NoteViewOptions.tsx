import { ArrowDown, ArrowUp, Check, Grid3X3, List, SlidersHorizontal } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { NoteCollectionPreferences, NoteSortField } from '../../lib/noteOrganization';
import { Pressable } from '../ui/ControlPrimitives';

interface NoteViewOptionsProps {
  value: NoteCollectionPreferences;
  onChange: (value: NoteCollectionPreferences) => void;
  viewMode?: 'list' | 'gallery';
  onViewModeChange?: (mode: 'list' | 'gallery') => void;
}

const FIELDS: Array<{ value: NoteSortField; label: string }> = [
  { value: 'updated_at', label: 'Data edycji' },
  { value: 'created_at', label: 'Data utworzenia' },
  { value: 'title', label: 'Tytuł' },
];

export default function NoteViewOptions({
  value,
  onChange,
  viewMode,
  onViewModeChange,
}: NoteViewOptionsProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  const selectField = (sortField: NoteSortField) => {
    onChange({ ...value, sortField, groupByDate: sortField === 'title' ? false : value.groupByDate });
    setOpen(false);
  };

  return (
    <div className="keep-view-options" ref={rootRef}>
      <Pressable
        type="button"
        className="keep-view-options-trigger"
        aria-label="Opcje widoku"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(current => !current)}
      >
        <SlidersHorizontal size={16} />
      </Pressable>
      {open && (
        <>
          <Pressable
            className="fixed inset-0 z-[var(--z-overlay)] bg-scrim/20 md:hidden"
            onClick={() => setOpen(false)}
            aria-label="Zamknij opcje widoku"
          />
          <div className="keep-view-options-menu" role="menu" aria-label="Opcje widoku notatek">
            {onViewModeChange && viewMode && (
              <>
                <p className="keep-view-options-label">Układ</p>
                <div className="flex gap-1 p-1 rounded-xl bg-surface-2/60 mb-1">
                  <Pressable
                    type="button"
                    role="menuitemradio"
                    aria-checked={viewMode === 'list'}
                    onClick={() => onViewModeChange('list')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 text-xs font-semibold rounded-lg transition-all ${
                      viewMode === 'list'
                        ? 'bg-surface-solid text-primary font-bold shadow-2xs'
                        : 'text-text-muted hover:text-text-primary'
                    }`}
                  >
                    <List size={13} />
                    <span>Lista</span>
                  </Pressable>
                  <Pressable
                    type="button"
                    role="menuitemradio"
                    aria-checked={viewMode === 'gallery'}
                    onClick={() => onViewModeChange('gallery')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 text-xs font-semibold rounded-lg transition-all ${
                      viewMode === 'gallery'
                        ? 'bg-surface-solid text-primary font-bold shadow-2xs'
                        : 'text-text-muted hover:text-text-primary'
                    }`}
                  >
                    <Grid3X3 size={13} />
                    <span>Galeria</span>
                  </Pressable>
                </div>
                <div className="keep-view-options-separator" />
              </>
            )}
            <p className="keep-view-options-label">Sortuj według</p>
            {FIELDS.map(field => (
              <Pressable
                key={field.value}
                type="button"
                role="menuitemradio"
                aria-checked={value.sortField === field.value}
                onClick={() => selectField(field.value)}
                className="flex items-center justify-between w-full"
              >
                <span>{field.label}</span>
                {value.sortField === field.value && <Check size={14} className="text-primary shrink-0" />}
              </Pressable>
            ))}
            <div className="keep-view-options-separator" />
            <Pressable
              type="button"
              role="menuitemradio"
              aria-checked={value.direction === 'desc'}
              onClick={() => onChange({ ...value, direction: value.direction === 'desc' ? 'asc' : 'desc' })}
              className="flex items-center gap-2.5 w-full text-left"
            >
              {value.direction === 'desc' ? <ArrowDown size={14} className="text-primary shrink-0" /> : <ArrowUp size={14} className="text-primary shrink-0" />}
              <span>{value.direction === 'desc' ? 'Najnowsze najpierw' : 'Najstarsze najpierw'}</span>
            </Pressable>
            {value.sortField !== 'title' && (
              <Pressable
                type="button"
                role="menuitemcheckbox"
                aria-checked={value.groupByDate}
                onClick={() => onChange({ ...value, groupByDate: !value.groupByDate })}
                className="flex items-center justify-between w-full"
              >
                <span>Grupuj według daty</span>
                {value.groupByDate && <Check size={14} className="text-primary shrink-0" />}
              </Pressable>
            )}
          </div>
        </>
      )}
    </div>
  );
}
