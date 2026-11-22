import { createPortal } from 'react-dom';
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, Folder, FolderInput, FolderPlus, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { NoteFolderNode } from '../../lib/noteFoldersApi';
import { Pressable } from '../ui/ControlPrimitives';
import PopoverScrim from '../ui/PopoverScrim';
import Sheet from '../ui/Sheet';

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

interface FolderSheetMenuProps extends Pick<NoteFolderTreeProps, 'onCreateChild' | 'onRename' | 'onMove' | 'onReorder' | 'onDelete'> {
  folder: NoteFolderNode;
  run: (action: (value: NoteFolderNode) => void) => void;
  closeMenu: () => void;
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
  const [isMobileWidth, setIsMobileWidth] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < 768 : false));

  useEffect(() => {
    const onResize = () => setIsMobileWidth(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const hasChildren = folder.children.length > 0;

  useEffect(() => {
    if (!menuOpen || isMobileWidth) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [menuOpen, isMobileWidth]);

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
              const rect = event.currentTarget.getBoundingClientRect();
              setMenuPos({ top: rect.bottom + 4, right: Math.max(8, window.innerWidth - rect.right) });
              setMenuOpen(value => !value);
            }}
          >
            <MoreHorizontal size={14} />
          </Pressable>

          {/* Na telefonie: natywny iOS Bottom Sheet */}
          {isMobileWidth ? (
            <Sheet
              open={menuOpen}
              onOpenChange={setMenuOpen}
              side="bottom"
              compact
              title={`Folder: ${folder.name}`}
              handleDragOnly
            >
              <FolderSheetMenu folder={folder} run={run} closeMenu={() => setMenuOpen(false)} onCreateChild={onCreateChild} onRename={onRename} onMove={onMove} onReorder={onReorder} onDelete={onDelete} />
            </Sheet>
          ) : (
            /* Na komputerze: popover z właściwym z-index i scrimem */
            menuOpen && createPortal(
              <>
                <PopoverScrim
                  className="z-[calc(var(--z-overlay)+49)] bg-black/10 backdrop-blur-xs"
                  onClick={() => setMenuOpen(false)}
                  label="Zamknij menu folderu"
                />
                <div
                  role="menu"
                  className="keep-folder-menu"
                  style={menuPos ? {
                    position: 'fixed',
                    top: menuPos.top,
                    right: menuPos.right,
                    left: 'auto',
                    zIndex: 'calc(var(--z-overlay) + 50)',
                  } : { zIndex: 'calc(var(--z-overlay) + 50)' }}
                >
                  <Pressable type="button" role="menuitem" onClick={() => run(onCreateChild)}>Nowy podfolder</Pressable>
                  <Pressable type="button" role="menuitem" onClick={() => run(onRename)}>Zmień nazwę</Pressable>
                  <Pressable type="button" role="menuitem" onClick={() => run(onMove)}>Przenieś</Pressable>
                  <Pressable type="button" role="menuitem" onClick={() => { setMenuOpen(false); onReorder(folder, 'up'); }}>Przesuń wyżej</Pressable>
                  <Pressable type="button" role="menuitem" onClick={() => { setMenuOpen(false); onReorder(folder, 'down'); }}>Przesuń niżej</Pressable>
                  <Pressable type="button" role="menuitem" className="danger" onClick={() => run(onDelete)}>Usuń</Pressable>
                </div>
              </>,
              document.body,
            )
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

function FolderSheetMenu({ folder, run, closeMenu, onCreateChild, onRename, onMove, onReorder, onDelete }: FolderSheetMenuProps) {
  return (
    <div className="space-y-3 pb-2" role="menu" aria-label={`Akcje folderu ${folder.name}`}>
      <div className="space-y-1 rounded-2xl border border-border-custom/40 bg-surface-2/40 p-1.5">
        <Pressable
          type="button"
          role="menuitem"
          onClick={() => run(onCreateChild)}
          className="w-full flex min-h-12 items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-text-primary hover:bg-text-primary/[0.06] active:bg-text-primary/10 transition-colors"
        >
          <FolderPlus size={18} className="text-text-muted" />
          <span>Nowy podfolder</span>
        </Pressable>
        <Pressable
          type="button"
          role="menuitem"
          onClick={() => run(onRename)}
          className="w-full flex min-h-12 items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-text-primary hover:bg-text-primary/[0.06] active:bg-text-primary/10 transition-colors"
        >
          <Pencil size={18} className="text-text-muted" />
          <span>Zmień nazwę</span>
        </Pressable>
        <Pressable
          type="button"
          role="menuitem"
          onClick={() => run(onMove)}
          className="w-full flex min-h-12 items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-text-primary hover:bg-text-primary/[0.06] active:bg-text-primary/10 transition-colors"
        >
          <FolderInput size={18} className="text-text-muted" />
          <span>Przenieś</span>
        </Pressable>
        <Pressable
          type="button"
          role="menuitem"
          onClick={() => { closeMenu(); onReorder(folder, 'up'); }}
          className="w-full flex min-h-12 items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-text-primary hover:bg-text-primary/[0.06] active:bg-text-primary/10 transition-colors"
        >
          <ArrowUp size={18} className="text-text-muted" />
          <span>Przesuń wyżej</span>
        </Pressable>
        <Pressable
          type="button"
          role="menuitem"
          onClick={() => { closeMenu(); onReorder(folder, 'down'); }}
          className="w-full flex min-h-12 items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-text-primary hover:bg-text-primary/[0.06] active:bg-text-primary/10 transition-colors"
        >
          <ArrowDown size={18} className="text-text-muted" />
          <span>Przesuń niżej</span>
        </Pressable>
      </div>

      <div className="pt-1">
        <Pressable
          type="button"
          role="menuitem"
          variant="ghost"
          onClick={() => run(onDelete)}
          className="w-full flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-danger/25 bg-danger/5 py-3 text-sm font-semibold text-danger transition-colors hover:bg-danger/10 active:bg-danger/15"
        >
          <Trash2 size={16} />
          <span>Usuń folder</span>
        </Pressable>
      </div>
    </div>
  );
}
