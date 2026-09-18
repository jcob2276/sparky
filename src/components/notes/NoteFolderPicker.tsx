import { Check, ChevronDown, Folder, Plus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Pressable } from '../ui/ControlPrimitives';
import { notify, promptDialog } from '../../lib/notify';
import type { NoteFolder } from '../../lib/noteFoldersApi';

interface NoteFolderPickerProps {
  folderId: string | null;
  folders: NoteFolder[];
  onSelectFolder: (id: string | null) => void;
  onCreateFolder?: (name: string, parentId?: string | null) => Promise<NoteFolder | null | void>;
}

export default function NoteFolderPicker({
  folderId,
  folders,
  onSelectFolder,
  onCreateFolder,
}: NoteFolderPickerProps) {
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

  const activeFolder = folders.find((f) => f.id === folderId);
  const activeLabel = activeFolder ? activeFolder.name : 'Bez folderu';

  const handleSelect = (id: string | null) => {
    onSelectFolder(id);
    setOpen(false);
  };

  const handleCreateNew = async () => {
    setOpen(false);
    const name = await promptDialog('Podaj nazwę nowego folderu:');
    if (name && name.trim()) {
      try {
        const created = await onCreateFolder?.(name.trim());
        if (created && typeof created === 'object' && 'id' in created) {
          onSelectFolder(created.id);
          notify(`Utworzono folder "${name.trim()}"`, 'success');
        }
      } catch (err: unknown) {
        notify(err instanceof Error ? err.message : 'Błąd tworzenia folderu', 'error');
      }
    }
  };

  return (
    <div className="relative inline-block pt-2" ref={rootRef}>
      <Pressable
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border-custom/35 bg-surface-solid/65 hover:bg-surface-solid text-xs font-semibold text-text-primary shadow-2xs transition-all active:scale-[0.97]"
      >
        <Folder size={13} className="text-warning shrink-0" />
        <span className="truncate max-w-[140px]">{activeLabel}</span>
        <ChevronDown size={12} className={`text-text-muted transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </Pressable>

      {open && (
        <div
          role="listbox"
          className="absolute left-0 top-full mt-1.5 z-[var(--z-popover)] min-w-[210px] max-w-[280px] rounded-2xl border border-border-custom/40 bg-surface-solid p-1.5 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
        >
          <div className="max-h-56 overflow-y-auto space-y-0.5">
            <Pressable
              type="button"
              role="option"
              aria-selected={!folderId}
              onClick={() => handleSelect(null)}
              className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                !folderId
                  ? 'bg-primary/15 text-primary font-bold shadow-2xs'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-2'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Folder size={13} className={!folderId ? 'text-primary' : 'text-text-muted'} />
                <span className="truncate">Bez folderu</span>
              </div>
              {!folderId && <Check size={13} className="shrink-0 text-primary" />}
            </Pressable>

            {folders.map((folder) => {
              const isSelected = folderId === folder.id;
              return (
                <Pressable
                  key={folder.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(folder.id)}
                  className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    isSelected
                      ? 'bg-primary/15 text-primary font-bold shadow-2xs'
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface-2'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Folder size={13} className={isSelected ? 'text-primary' : 'text-warning'} />
                    <span className="truncate">{folder.name}</span>
                  </div>
                  {isSelected && <Check size={13} className="shrink-0 text-primary" />}
                </Pressable>
              );
            })}
          </div>

          <div className="border-t border-border-custom/25 my-1" />

          <Pressable
            type="button"
            onClick={() => { void handleCreateNew(); }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-primary hover:bg-primary/10 transition-colors"
          >
            <Plus size={13} className="shrink-0" />
            <span>Utwórz nowy folder…</span>
          </Pressable>
        </div>
      )}
    </div>
  );
}
