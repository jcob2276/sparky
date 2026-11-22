import { Check, ChevronDown, Folder, Plus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Pressable } from '../ui/ControlPrimitives';
import Sheet from '../ui/Sheet';
import { notify, promptDialog } from '../../lib/notify';
import type { NoteFolder } from '../../lib/noteFoldersApi';

interface NoteFolderPickerProps {
  folderId: string | null;
  folders: NoteFolder[];
  isMobile?: boolean;
  onSelectFolder: (id: string | null) => void;
  onCreateFolder?: (name: string, parentId?: string | null) => Promise<NoteFolder | null | void>;
}

export default function NoteFolderPicker({
  folderId,
  folders,
  isMobile,
  onSelectFolder,
  onCreateFolder,
}: NoteFolderPickerProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const [isMobileWidth, setIsMobileWidth] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < 768 : false));

  useEffect(() => {
    const onResize = () => setIsMobileWidth(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const useSheet = isMobile ?? isMobileWidth;

  useEffect(() => {
    if (!open || useSheet) return;
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
  }, [open, useSheet]);

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
    <div className="relative inline-flex items-center" ref={rootRef}>
      <Pressable
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Folder notatki: ${activeLabel}`}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border-custom/30 bg-surface-solid/70 hover:bg-surface-solid text-2xs font-semibold text-text-primary shadow-2xs transition-[color,background-color,border-color,box-shadow,opacity,transform] active:scale-[0.96]"
      >
        <Folder size={12} className="text-warning shrink-0" />
        <span className="truncate max-w-[120px]">{activeLabel}</span>
        <ChevronDown size={11} className={`text-text-muted transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </Pressable>

      {/* Widok na telefonie: natywny iOS Bottom Sheet */}
      {useSheet ? (
        <Sheet
          open={open}
          onOpenChange={setOpen}
          side="bottom"
          compact
          title="Folder notatki"
          handleDragOnly
        >
          <div className="space-y-4 pb-2" role="listbox" aria-label="Wybierz folder">
            <div className="space-y-1 rounded-2xl border border-border-custom/40 bg-surface-2/40 p-1.5">
              <Pressable
                type="button"
                role="option"
                aria-selected={!folderId}
                onClick={() => handleSelect(null)}
                className={`w-full flex min-h-[48px] items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  !folderId
                    ? 'bg-primary/15 text-primary font-bold shadow-2xs'
                    : 'text-text-primary hover:bg-text-primary/[0.06] active:bg-text-primary/10'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Folder size={18} className={!folderId ? 'text-primary' : 'text-text-muted'} />
                  <span className="truncate">Bez folderu</span>
                </div>
                {!folderId && <Check size={16} className="shrink-0 text-primary" />}
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
                    className={`w-full flex min-h-[48px] items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      isSelected
                        ? 'bg-primary/15 text-primary font-bold shadow-2xs'
                        : 'text-text-primary hover:bg-text-primary/[0.06] active:bg-text-primary/10'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Folder size={18} className={isSelected ? 'text-primary' : 'text-warning'} />
                      <span className="truncate">{folder.name}</span>
                    </div>
                    {isSelected && <Check size={16} className="shrink-0 text-primary" />}
                  </Pressable>
                );
              })}
            </div>

            {onCreateFolder && (
              <div className="pt-1">
                <Pressable
                  type="button"
                  variant="ghost"
                  onClick={() => { void handleCreateNew(); }}
                  className="w-full flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-border-custom/40 bg-surface-solid py-3 text-sm font-semibold text-primary transition-colors hover:bg-surface-2 active:scale-[0.98]"
                >
                  <Plus size={16} className="text-primary" />
                  <span>Utwórz nowy folder…</span>
                </Pressable>
              </div>
            )}
          </div>
        </Sheet>
      ) : (
        /* Widok na komputerze: precyzyjny popover zakotwiczony pod przyciskiem */
        open && (
          <>
            <Pressable
              className="fixed inset-0 z-[var(--z-overlay)] bg-black/20 backdrop-blur-[2px] transition-opacity duration-150"
              onClick={() => setOpen(false)}
              aria-label="Zamknij"
            />
            <div
              role="listbox"
              className="absolute left-0 top-full mt-1.5 z-[calc(var(--z-overlay)+10)] min-w-[220px] max-w-[280px] rounded-2xl border border-border-custom/50 bg-surface-solid p-1.5 shadow-2xl animate-in fade-in zoom-in-95 duration-100"
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
          </>
        )
      )}
    </div>
  );
}
