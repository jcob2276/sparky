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

export default function TagFilterControl({ tags, value, onChange, onRename, onDelete }: TagFilterControlProps) {
  const toggle = (tag: string) => onChange({
    ...value,
    tags: value.tags.includes(tag)
      ? value.tags.filter(item => item !== tag)
      : [...value.tags, tag],
  });

  return (
    <div className="keep-tag-filter" aria-label="Filtr tagów">
      <div className="keep-tag-filter-mode">
        <label><input type="radio" checked={value.mode === 'all'} onChange={() => onChange({ ...value, mode: 'all' })} /> Wszystkie</label>
        <label><input type="radio" checked={value.mode === 'any'} onChange={() => onChange({ ...value, mode: 'any' })} /> Dowolny</label>
      </div>
      <div className="keep-tag-filter-list">
        {tags.map(tag => (
          <div key={tag} className="keep-tag-filter-row">
            <label>
              <input type="checkbox" checked={value.tags.includes(tag)} onChange={() => toggle(tag)} />
              <span>#{tag}</span>
            </label>
            {onRename && <Pressable type="button" aria-label={`Zmień nazwę tagu ${tag}`} onClick={() => onRename(tag)}>Zmień</Pressable>}
            {onDelete && <Pressable type="button" aria-label={`Usuń tag ${tag}`} onClick={() => onDelete(tag)}>Usuń</Pressable>}
          </div>
        ))}
      </div>
    </div>
  );
}
