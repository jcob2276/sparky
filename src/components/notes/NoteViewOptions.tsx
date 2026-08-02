import { ArrowDown, ArrowUp, Check, SlidersHorizontal } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { NoteCollectionPreferences, NoteSortField } from '../../lib/noteOrganization';
import { Pressable } from '../ui/ControlPrimitives';

interface NoteViewOptionsProps {
  value: NoteCollectionPreferences;
  onChange: (value: NoteCollectionPreferences) => void;
}

const FIELDS: Array<{ value: NoteSortField; label: string }> = [
  { value: 'updated_at', label: 'Data edycji' },
  { value: 'created_at', label: 'Data utworzenia' },
  { value: 'title', label: 'Tytuł' },
];

export default function NoteViewOptions({ value, onChange }: NoteViewOptionsProps) {
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
        <div className="keep-view-options-menu" role="menu" aria-label="Sortowanie notatek">
          <p className="keep-view-options-label">Sortuj według</p>
          {FIELDS.map(field => (
            <Pressable
              key={field.value}
              type="button"
              role="menuitemradio"
              aria-checked={value.sortField === field.value}
              onClick={() => selectField(field.value)}
            >
              <span>{field.label}</span>
              {value.sortField === field.value && <Check size={15} />}
            </Pressable>
          ))}
          <div className="keep-view-options-separator" />
          <Pressable
            type="button"
            role="menuitemradio"
            aria-checked={value.direction === 'desc'}
            onClick={() => onChange({ ...value, direction: value.direction === 'desc' ? 'asc' : 'desc' })}
          >
            {value.direction === 'desc' ? <ArrowDown size={15} /> : <ArrowUp size={15} />}
            <span>{value.direction === 'desc' ? 'Najnowsze najpierw' : 'Najstarsze najpierw'}</span>
          </Pressable>
          {value.sortField !== 'title' && (
            <Pressable
              type="button"
              role="menuitemcheckbox"
              aria-checked={value.groupByDate}
              onClick={() => onChange({ ...value, groupByDate: !value.groupByDate })}
            >
              <span>Grupuj według daty</span>
              {value.groupByDate && <Check size={15} />}
            </Pressable>
          )}
        </div>
      )}
    </div>
  );
}
