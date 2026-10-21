import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import type { NoteTagMode } from '../../lib/noteOrganization';
import { Pressable } from '../ui/ControlPrimitives';

export interface TagFilterValue {
  tags: string[];
  mode: NoteTagMode;
}

interface TagFilterControlProps {
  tags: string[];
  value: TagFilterValue;
  onChange: (value: TagFilterValue) => void;
  onRename?: (tag: string) => void;
  onDelete?: (tag: string) => void;
}

const COLLAPSED_COUNT = 8;
const MODES: Array<{ mode: NoteTagMode; label: string }> = [
  { mode: 'all', label: 'Wszystkie' },
  { mode: 'any', label: 'Dowolny' },
];

/** Tagi jako chipy: wybrane na górze, reszta zwinięta; zarządzanie (zmiana nazwy/usuwanie) dopiero na życzenie. */
export default function TagFilterControl({ tags, value, onChange, onRename, onDelete }: TagFilterControlProps) {
  const [expanded, setExpanded] = useState(false);
  const [managing, setManaging] = useState(false);
  const canManage = Boolean(onRename || onDelete);
  const selected = new Set(value.tags);
  const ordered = [...tags.filter(tag => selected.has(tag)), ...tags.filter(tag => !selected.has(tag))];
  const visible = expanded ? ordered : ordered.slice(0, Math.max(COLLAPSED_COUNT, value.tags.length));
  const hiddenCount = ordered.length - visible.length;

  const toggle = (tag: string) => onChange({
    ...value,
    tags: selected.has(tag) ? value.tags.filter(item => item !== tag) : [...value.tags, tag],
  });

  return (
    <div className="flex flex-col gap-2 px-2 pb-2 pt-1" aria-label="Filtr tagów">
      {value.tags.length > 1 && (
        <div className="flex gap-1 rounded-full bg-surface-2 p-0.5 text-3xs font-semibold" role="radiogroup" aria-label="Dopasowanie tagów">
          {MODES.map(({ mode, label }) => (
            <Pressable
              key={mode}
              type="button"
              role="radio"
              aria-checked={value.mode === mode}
              onClick={() => onChange({ ...value, mode })}
              className={`flex-1 rounded-full px-2 py-1 ${value.mode === mode ? 'bg-surface-solid text-text-primary shadow-xs' : 'text-text-muted'}`}
            >
              {label}
            </Pressable>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-1.5">
        {visible.map(tag => {
          const isOn = selected.has(tag);
          return (
            <span
              key={tag}
              className={`inline-flex items-center gap-0.5 rounded-full text-xs font-medium ui-interactive ${
                isOn ? 'bg-primary text-on-accent' : 'bg-surface-2/70 text-text-secondary hover:bg-surface-2'
              }`}
            >
              <Pressable
                type="button"
                role="checkbox"
                aria-checked={isOn}
                aria-label={`#${tag}`}
                onClick={() => toggle(tag)}
                className="rounded-full px-2.5 py-1"
              >
                #{tag}
              </Pressable>
              {managing && onRename && (
                <Pressable type="button" aria-label={`Zmień nazwę tagu ${tag}`} onClick={() => onRename(tag)} className="p-1 hover:text-text-primary">
                  <Pencil size={11} />
                </Pressable>
              )}
              {managing && onDelete && (
                <Pressable type="button" aria-label={`Usuń tag ${tag}`} onClick={() => onDelete(tag)} className="p-1 pr-2 hover:text-text-primary">
                  <Trash2 size={11} />
                </Pressable>
              )}
            </span>
          );
        })}
      </div>
      {(hiddenCount > 0 || expanded || canManage) && (
        <div className="flex items-center justify-between text-3xs font-semibold text-text-muted">
          {(hiddenCount > 0 || expanded) ? (
            <Pressable type="button" onClick={() => setExpanded(!expanded)} className="hover:text-text-primary">
              {expanded ? 'Mniej' : `Pokaż wszystkie (${tags.length})`}
            </Pressable>
          ) : <span />}
          {canManage && (
            <Pressable type="button" onClick={() => setManaging(!managing)} className="hover:text-text-primary" aria-pressed={managing}>
              {managing ? 'Gotowe' : 'Zarządzaj'}
            </Pressable>
          )}
        </div>
      )}
    </div>
  );
}
