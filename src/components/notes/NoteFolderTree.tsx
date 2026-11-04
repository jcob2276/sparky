import { createPortal } from 'react-dom';
import { ChevronDown, ChevronRight, Folder, MoreHorizontal } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { NoteFolderNode } from '../../lib/noteFoldersApi';
import { Pressable } from '../ui/ControlPrimitives';

interface NoteFolderTreeProps {
  tree: NoteFolderNode[];
  activeFolderId: string | null;
  noteCounts: Record<string, number>;
  onSelect: (id: string) => void;
  onCreateChild: (folder: NoteFolderNode) => void;
  onRename: (folder: NoteFolderNode) => void;
  onMove: (folder: NoteFolderNode) => void;
  onReorder: (folder: NoteFolderNode, direction: 'up' | 'down') => void;
  onDelete: (folder: NoteFolderNode) => void;
}

interface FolderBranchProps extends Omit<NoteFolderTreeProps, 'tree'> {
  folder: NoteFolderNode;
  level: number;
}

function FolderBranch({
  folder,
  level,
  activeFolderId,
  noteCounts,
  onSelect,
  onCreateChild,
  onRename,
  onMove,
  onReorder,
  onDelete,
}: FolderBranchProps) {
  const [expanded, setExpanded] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);
  const hasChildren = folder.children.length > 0;

  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: PointerEvent) => {
      if (!(event.target as HTMLElement).closest('.keep-folder-menu, .keep-folder-actions')) setMenuOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [menuOpen]);

  const run = (action: (value: NoteFolderNode) => void) => {
    setMenuOpen(false);
    action(folder);
  };

  return (
    <li
      role="treeitem"
      aria-label={`${folder.name} ${noteCounts[folder.id] ?? 0}`}
      aria-expanded={hasChildren ? expanded : undefined}
      aria-selected={activeFolderId === folder.id}
      className="keep-folder-tree-item"
    >
      <div className={activeFolderId === folder.id ? 'keep-folder-row active' : 'keep-folder-row'} style={{ paddingLeft: `${0.35 + level * 0.9}rem` }}>
        <Pressable
          type="button"
          className="keep-folder-expand"
          aria-label={expanded ? `Zwiń ${folder.name}` : `Rozwiń ${folder.name}`}
          disabled={!hasChildren}
          onClick={() => setExpanded(value => !value)}
        >
          {hasChildren ? (expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />) : <span />}
        </Pressable>
        <Pressable type="button" className="keep-folder-select" onClick={() => onSelect(folder.id)}>
          <Folder size={14} />
          <span>{folder.name}</span>
          <small>{noteCounts[folder.id] ?? 0}</small>
        </Pressable>
        <div className="keep-folder-actions">
          <Pressable
            type="button"
            className="min-h-11 min-w-11"
            aria-label={`Akcje folderu ${folder.name}`}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={(event) => {
              event.stopPropagation();
              // Menu jest `fixed`, żeby panel boczny z przewijaniem go nie przycinał.
              const rect = event.currentTarget.getBoundingClientRect();
              setMenuPos({ top: rect.bottom + 4, right: Math.max(8, window.innerWidth - rect.right) });
              setMenuOpen(value => !value);
            }}
          >
            <MoreHorizontal size={14} />
          </Pressable>
          {menuOpen && createPortal(
            <>
              <div role="menu" className="keep-folder-menu" style={menuPos ? { position: 'fixed', top: menuPos.top, right: menuPos.right, left: 'auto' } : undefined}>
                <Pressable type="button" role="menuitem" onClick={() => run(onCreateChild)}>Nowy podfolder</Pressable>
                <Pressable type="button" role="menuitem" onClick={() => run(onRename)}>Zmień nazwę</Pressable>
                <Pressable type="button" role="menuitem" onClick={() => run(onMove)}>Przenieś</Pressable>
                <Pressable type="button" role="menuitem" onClick={() => { setMenuOpen(false); onReorder(folder, 'up'); }}>Przesuń wyżej</Pressable>
                <Pressable type="button" role="menuitem" onClick={() => { setMenuOpen(false); onReorder(folder, 'down'); }}>Przesuń niżej</Pressable>
                <Pressable type="button" role="menuitem" className="danger" onClick={() => run(onDelete)}>Usuń</Pressable>
              </div>
            </>,
            document.body,
          )}
        </div>
      </div>
      {hasChildren && expanded && (
        <ul role="group">
          {folder.children.map(child => (
            <FolderBranch
              key={child.id}
              folder={child}
              level={level + 1}
              activeFolderId={activeFolderId}
              noteCounts={noteCounts}
              onSelect={onSelect}
              onCreateChild={onCreateChild}
              onRename={onRename}
              onMove={onMove}
              onReorder={onReorder}
              onDelete={onDelete}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function NoteFolderTree(props: NoteFolderTreeProps) {
  return (
    <ul role="tree" aria-label="Foldery notatek" className="keep-folder-tree">
      {props.tree.map(folder => <FolderBranch key={folder.id} {...props} folder={folder} level={0} />)}
    </ul>
  );
}
