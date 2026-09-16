import { useState } from 'react';
import type { NoteFolder } from '../../lib/noteFoldersApi';
import type { SmartFolderRuleV1 } from '../../lib/noteSmartFolders';
import { Pressable, ControlInput, ControlSelect } from '../ui/ControlPrimitives';

interface SmartFolderEditorProps {
  allTags: string[];
  folders: NoteFolder[];
  initialName?: string;
  initialRule?: SmartFolderRuleV1;
  onCancel: () => void;
  onSave: (name: string, rule: SmartFolderRuleV1) => void;
}

const DEFAULT_RULE: SmartFolderRuleV1 = {
  version: 1,
  tags: [],
  tagMode: 'all',
  folderId: null,
  includeDescendants: false,
  hasAttachments: null,
  isLocked: null,
  updatedWithinDays: null,
};

export default function SmartFolderEditor({
  allTags,
  folders,
  initialName = '',
  initialRule = DEFAULT_RULE,
  onCancel,
  onSave,
}: SmartFolderEditorProps) {
  const [name, setName] = useState(initialName);
  const [rule, setRule] = useState<SmartFolderRuleV1>(initialRule);
  const toggleTag = (tag: string) => setRule(current => ({
    ...current,
    tags: current.tags.includes(tag)
      ? current.tags.filter(t => t !== tag)
      : [...current.tags, tag],
  }));

  return (
    <div role="dialog" aria-modal="true" aria-label="Smart Folder" className="keep-smart-folder-editor">
      <h2>Smart Folder</h2>
      <label>Nazwa Smart Folderu<ControlInput value={name} onChange={event => setName(event.target.value)} /></label>
      <fieldset>
        <legend>Tagi</legend>
        <div className="keep-smart-folder-tags">
          {allTags.map(tag => <label key={tag}><ControlInput type="checkbox" checked={rule.tags.includes(tag)} onChange={() => toggleTag(tag)} />{tag}</label>)}
        </div>
        <label><ControlInput type="radio" name="tag-mode" checked={rule.tagMode === 'all'} onChange={() => setRule({ ...rule, tagMode: 'all' })} />Wszystkie wybrane tagi</label>
        <label><ControlInput type="radio" name="tag-mode" checked={rule.tagMode === 'any'} onChange={() => setRule({ ...rule, tagMode: 'any' })} />Dowolny wybrany tag</label>
      </fieldset>
      <label>Folder bazowy
        <ControlSelect value={rule.folderId ?? ''} onChange={event => setRule({ ...rule, folderId: event.target.value || null })}>
          <option value="">Wszystkie foldery</option>
          {folders.map(folder => <option key={folder.id} value={folder.id}>{folder.name}</option>)}
        </ControlSelect>
      </label>
      <label><ControlInput type="checkbox" checked={rule.includeDescendants} disabled={!rule.folderId} onChange={event => setRule({ ...rule, includeDescendants: event.target.checked })} />Uwzględnij podfoldery</label>
      <label>Załączniki
        <ControlSelect value={rule.hasAttachments === null ? '' : String(rule.hasAttachments)} onChange={event => setRule({ ...rule, hasAttachments: event.target.value === '' ? null : event.target.value === 'true' })}>
          <option value="">Dowolnie</option><option value="true">Ma załączniki</option><option value="false">Bez załączników</option>
        </ControlSelect>
      </label>
      <label>Aktualizowane w ostatnich dniach<ControlInput type="number" min="1" value={rule.updatedWithinDays ?? ''} onChange={event => setRule({ ...rule, updatedWithinDays: event.target.value ? Number(event.target.value) : null })} /></label>
      <label>Ochrona notatki
        <ControlSelect value={rule.isLocked === null ? '' : String(rule.isLocked)} onChange={event => setRule({ ...rule, isLocked: event.target.value === '' ? null : event.target.value === 'true' })}>
          <option value="">Dowolnie</option><option value="true">Tylko zablokowane</option><option value="false">Tylko odblokowane</option>
        </ControlSelect>
      </label>
      <div className="keep-smart-folder-actions">
        <Pressable type="button" onClick={onCancel}>Anuluj</Pressable>
        <Pressable type="button" disabled={!name.trim()} onClick={() => onSave(name.trim(), rule)}>Zapisz Smart Folder</Pressable>
      </div>
    </div>
  );
}
