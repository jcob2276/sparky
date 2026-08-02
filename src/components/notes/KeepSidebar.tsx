/**
 * @component KeepSidebar
 * @role Nawigacja boczna: tagi + przełącznik notatki/archiwum.
 * @usedBy Keep
 */
import { Pressable } from '../ui/ControlPrimitives';
import { Archive, BrainCircuit, CheckSquare, Trash2 } from 'lucide-react';
import { Note } from '../../lib/notesApi';
import { buildFolderTree, type NoteFolder, type NoteFolderNode } from '../../lib/noteFoldersApi';
import WorkspaceNavigation from '../shared/WorkspaceNavigation';
import WorkspaceSidebar from '../shared/WorkspaceSidebar';
import SidebarSection from '../shared/SidebarSection';
import { useState } from 'react';
import { confirmDialog, notify, promptDialog } from '../../lib/notify';
import SidebarInlineCreate from './SidebarInlineCreate';
import NoteFolderTree from './NoteFolderTree';
import TagFilterControl, { type TagFilterValue } from './TagFilterControl';
import SmartFolderEditor from './SmartFolderEditor';
import type { NoteSmartFolder, SmartFolderRuleV1 } from '../../lib/noteSmartFolders';

interface KeepSidebarProps {
  notes: Note[];
  trashCount: number;
  folders: NoteFolder[];
  foldersLoading: boolean;
  smartFolders: NoteSmartFolder[];
  smartFoldersLoading: boolean;
  allTags: string[];
  sidebarTab: 'notes' | 'archive' | 'trash';
  setSidebarTab: (tab: 'notes' | 'archive' | 'trash') => void;
  activeTag: string | null;
  setActiveTag: (fn: (t: string | null) => string | null) => void;
  setSearch: (v: string) => void;
  activeFolderId: string | null;
  setActiveFolderId: (id: string | null) => void;
  onCreateFolder: (name: string, parentId?: string | null) => Promise<void>;
  onRenameFolder: (id: string, name: string) => Promise<void>;
  onMoveFolder: (id: string, parentId: string | null) => Promise<void>;
  onReorderFolder: (id: string, direction: 'up' | 'down') => Promise<void>;
  onDeleteFolder: (id: string) => Promise<void>;
  goTo: (dest: string) => void;
  onConfirmDeleteTag: (tag: string) => void;
  tagFilter: TagFilterValue;
  onTagFilterChange: (value: TagFilterValue) => void;
  onRenameTag: (oldTag: string, newTag: string) => Promise<void>;
  activeSmartFolderId: string | null;
  setActiveSmartFolderId: (id: string | null) => void;
  onCreateSmartFolder: (name: string, rule: SmartFolderRuleV1) => Promise<void>;
  onUpdateSmartFolder: (id: string, name: string, rule: SmartFolderRuleV1) => Promise<void>;
  onDeleteSmartFolder: (id: string) => Promise<void>;
}

// Navigation actions stay together so folder/tag menus share one consistent state.
// eslint-disable-next-line max-lines-per-function
export default function KeepSidebar({
  notes, trashCount, folders, foldersLoading, smartFolders, smartFoldersLoading, allTags, sidebarTab, setSidebarTab,
  activeTag, setActiveTag, setSearch, activeFolderId, setActiveFolderId,
  onCreateFolder, onRenameFolder, onMoveFolder, onReorderFolder, onDeleteFolder, goTo, onConfirmDeleteTag,
  tagFilter, onTagFilterChange, onRenameTag, activeSmartFolderId, setActiveSmartFolderId,
  onCreateSmartFolder, onUpdateSmartFolder, onDeleteSmartFolder,
}: KeepSidebarProps) {
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [editingSmartFolder, setEditingSmartFolder] = useState<NoteSmartFolder | 'new' | null>(null);
  const folderTree = buildFolderTree(folders);
  const noteCounts = Object.fromEntries(folders.map(folder => [
    folder.id,
    notes.filter(note => note.folder_id === folder.id).length,
  ]));

  const createChild = async (folder: NoteFolderNode) => {
    const name = await promptDialog(`Nazwa podfolderu w „${folder.name}”`);
    if (name?.trim()) await onCreateFolder(name, folder.id);
  };

  const renameFolder = async (folder: NoteFolderNode) => {
    const name = await promptDialog('Nowa nazwa folderu', folder.name);
    if (name?.trim() && name.trim() !== folder.name) await onRenameFolder(folder.id, name);
  };

  const moveFolder = async (folder: NoteFolderNode) => {
    const destination = await promptDialog('Przenieś do folderu (wpisz nazwę lub „Bez folderu”)', 'Bez folderu');
    if (destination === null) return;
    const normalized = destination.trim().toLocaleLowerCase('pl-PL');
    const parentId = normalized === 'bez folderu' || normalized === ''
      ? null
      : folders.find(item => item.name.toLocaleLowerCase('pl-PL') === normalized)?.id;
    if (parentId === undefined) {
      notify('Nie znaleziono folderu o tej nazwie', 'error');
      return;
    }
    await onMoveFolder(folder.id, parentId);
  };

  const deleteFolder = async (folder: NoteFolderNode) => {
    const destination = folder.parent_id
      ? folders.find(item => item.id === folder.parent_id)?.name ?? 'folder nadrzędny'
      : 'Bez folderu';
    const confirmed = await confirmDialog(`Usunąć „${folder.name}”? Notatki trafią do „${destination}”, a podfoldery przesuną się poziom wyżej.`);
    if (confirmed) await onDeleteFolder(folder.id);
  };

  const renameTag = async (tag: string) => {
    const name = await promptDialog('Nowa nazwa tagu', tag);
    if (name?.trim() && name.trim() !== tag) await onRenameTag(tag, name);
  };

  return (
    <WorkspaceSidebar>
      <WorkspaceNavigation active="keep" onNavigate={goTo} />
      <div className="keep-sidebar-separator" />

      <SidebarSection
        label="Notatki"
        items={[
          {
            id: 'notes',
            label: 'Notatki',
            icon: <CheckSquare size={15} />,
            count: notes.filter(n => !n.is_archived).length,
            active: sidebarTab === 'notes' && !activeTag && !activeFolderId && !activeSmartFolderId && !tagFilter.tags.length,
            onClick: () => { setSidebarTab('notes'); setActiveTag(() => null); onTagFilterChange({ tags: [], mode: tagFilter.mode }); setActiveFolderId(null); setActiveSmartFolderId(null); setSearch(''); },
          },
          {
            id: 'archive',
            label: 'Archiwum',
            icon: <Archive size={15} />,
            count: notes.filter(n => n.is_archived).length,
            active: sidebarTab === 'archive' && !activeTag,
            onClick: () => { setSidebarTab('archive'); setActiveTag(() => null); setActiveFolderId(null); setSearch(''); },
          },
          {
            id: 'trash',
            label: 'Kosz',
            icon: <Trash2 size={15} />,
            count: trashCount,
            active: sidebarTab === 'trash',
            onClick: () => { setSidebarTab('trash'); setActiveTag(() => null); setActiveFolderId(null); setSearch(''); },
          },
        ]}
      />

      <SidebarSection
        label="Smart Foldery"
        bordered
        isLoading={smartFoldersLoading}
        onAdd={() => setEditingSmartFolder('new')}
        addTitle="Dodaj Smart Folder"
        emptyLabel="brak Smart Folderów"
        items={smartFolders.map(folder => ({
          id: folder.id,
          label: folder.name,
          icon: <BrainCircuit size={13} />,
          active: activeSmartFolderId === folder.id,
          onClick: () => {
            setSidebarTab('notes');
            setActiveFolderId(null);
            setActiveTag(() => null);
            onTagFilterChange({ tags: [], mode: tagFilter.mode });
            setActiveSmartFolderId(folder.id);
          },
          actions: <>
            <Pressable size="sm" variant="ghost" onClick={event => { event.stopPropagation(); setEditingSmartFolder(folder); }}>Edytuj</Pressable>
            <Pressable size="sm" variant="ghost" className="text-danger" onClick={event => {
              event.stopPropagation();
              void confirmDialog(`Usunąć Smart Folder „${folder.name}”? Notatki pozostaną bez zmian.`).then(ok => {
                if (ok) void onDeleteSmartFolder(folder.id);
              });
            }}><Trash2 size={12} /></Pressable>
          </>,
        }))}
      />

      <SidebarSection
        label="Foldery"
        bordered
        isLoading={foldersLoading}
        onAdd={() => setCreatingFolder(true)}
        addTitle="Dodaj folder"
        trailingAdd={creatingFolder ? (
          <SidebarInlineCreate
            placeholder="Nazwa folderu"
            onCancel={() => setCreatingFolder(false)}
            onSubmit={async name => {
              try {
                await onCreateFolder(name);
                setCreatingFolder(false);
              } catch (error) {
                notify(error instanceof Error ? error.message : 'Nie udało się utworzyć folderu', 'error');
              }
            }}
          />
        ) : undefined}
        emptyLabel="brak folderów"
        items={[]}
      >
        {folderTree.length > 0 && (
          <NoteFolderTree
            tree={folderTree}
            activeFolderId={activeFolderId}
            noteCounts={noteCounts}
            onSelect={id => {
              setSidebarTab('notes');
              setActiveTag(() => null);
              setActiveFolderId(id);
              setSearch('');
            }}
            onCreateChild={folder => { void createChild(folder); }}
            onRename={folder => { void renameFolder(folder); }}
            onMove={folder => { void moveFolder(folder); }}
            onReorder={(folder, direction) => { void onReorderFolder(folder.id, direction); }}
            onDelete={folder => { void deleteFolder(folder); }}
          />
        )}
      </SidebarSection>

      <SidebarSection
        label="Tagi"
        bordered
        emptyLabel="brak tagów"
        items={[]}
      >
        {allTags.length > 0 && <TagFilterControl
          tags={allTags}
          value={tagFilter}
          onChange={value => { setSidebarTab('notes'); setActiveTag(() => null); setActiveFolderId(null); setActiveSmartFolderId(null); onTagFilterChange(value); }}
          onRename={tag => { void renameTag(tag); }}
          onDelete={onConfirmDeleteTag}
        />}
      </SidebarSection>

      {editingSmartFolder && (
        <SmartFolderEditor
          allTags={allTags}
          folders={folders}
          initialName={editingSmartFolder === 'new' ? '' : editingSmartFolder.name}
          initialRule={editingSmartFolder === 'new' ? undefined : editingSmartFolder.rule}
          onCancel={() => setEditingSmartFolder(null)}
          onSave={(name, rule) => {
            const action = editingSmartFolder === 'new'
              ? onCreateSmartFolder(name, rule)
              : onUpdateSmartFolder(editingSmartFolder.id, name, rule);
            void action.then(() => setEditingSmartFolder(null)).catch(error => notify(error instanceof Error ? error.message : 'Nie udało się zapisać Smart Folderu', 'error'));
          }}
        />
      )}
    </WorkspaceSidebar>
  );
}
