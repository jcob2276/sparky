import { useState } from 'react';
import { Pressable } from '../ui/ControlPrimitives';
import { Archive, CheckCheck, FolderInput, Palette, Pin, Trash2, X } from 'lucide-react';
import NoteColorPicker from './NoteColorPicker';
import type { NoteFolder } from '../../lib/noteFoldersApi';

interface KeepBulkActionBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onSelectAll: () => void;
  onBulkPin: () => void;
  onBulkArchive: () => void;
  onBulkDelete: () => void;
  onBulkColor: (color: string) => void;
  onBulkMoveFolder?: (folderId: string | null) => void;
  busy?: boolean;
  folders?: NoteFolder[];
}

export default function KeepBulkActionBar({
  selectedCount,
  onClearSelection,
  onSelectAll,
  onBulkPin,
  onBulkArchive,
  onBulkDelete,
  onBulkColor,
  onBulkMoveFolder,
  busy = false,
  folders = [],
}: KeepBulkActionBarProps) {
  const [showPalette, setShowPalette] = useState(false);
  const [showFolderMenu, setShowFolderMenu] = useState(false);

  if (selectedCount === 0) return null;

  return (
    <aside
      aria-label="Pasek masowych akcji notatek"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[var(--z-floating-bar)] flex flex-col items-center gap-2"
    >
      {showPalette && (
        <div className="rounded-2xl border border-border-custom bg-background/95 p-2 shadow-xl backdrop-blur-md animate-in fade-in zoom-in-95">
          <NoteColorPicker
            currentColor=""
            onSelectColor={(col) => {
              onBulkColor(col);
              setShowPalette(false);
            }}
          />
        </div>
      )}

      {showFolderMenu && onBulkMoveFolder && (
        <div className="max-h-48 overflow-y-auto rounded-2xl border border-border-custom bg-background/95 p-1.5 shadow-xl backdrop-blur-md min-w-[160px] animate-in fade-in zoom-in-95">
          <Pressable
            onClick={() => {
              onBulkMoveFolder(null);
              setShowFolderMenu(false);
            }}
            className="w-full text-left px-3 py-1.5 text-xs rounded-lg hover:bg-surface-solid text-text-primary"
          >
            Bez folderu
          </Pressable>
          {folders.map((f) => (
            <Pressable
              key={f.id}
              onClick={() => {
                onBulkMoveFolder(f.id);
                setShowFolderMenu(false);
              }}
              className="w-full text-left px-3 py-1.5 text-xs rounded-lg hover:bg-surface-solid text-text-primary truncate"
            >
              {f.name}
            </Pressable>
          ))}
        </div>
      )}

      <div className="flex items-center gap-1.5 rounded-2xl border border-border-custom/50 bg-background/95 px-3 py-2 shadow-2xl backdrop-blur-xl ring-1 ring-border-custom/20">
        <span className="flex items-center gap-1 px-1.5 py-0.5 text-xs font-bold text-text-primary">
          <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary text-on-accent text-3xs font-black px-1">
            {selectedCount}
          </span>
          <span className="hidden sm:inline">wybranych</span>
        </span>

        <div className="h-4 w-px bg-border-custom/40 mx-0.5" />

        <Pressable
          onClick={onSelectAll}
          disabled={busy}
          className="flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-text-secondary hover:bg-surface-solid hover:text-text-primary transition-colors btn-press cursor-pointer"
          title="Zaznacz wszystkie"
        >
          <CheckCheck size={14} />
          <span className="hidden md:inline">Wszystkie</span>
        </Pressable>

        <Pressable
          onClick={onBulkPin}
          disabled={busy}
          className="flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-text-secondary hover:bg-surface-solid hover:text-text-primary transition-colors btn-press cursor-pointer"
          title="Przypnij lub odepnij"
        >
          <Pin size={14} />
          <span className="hidden md:inline">Przypnij</span>
        </Pressable>

        <Pressable
          onClick={() => {
            setShowPalette(!showPalette);
            setShowFolderMenu(false);
          }}
          disabled={busy}
          className="flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-text-secondary hover:bg-surface-solid hover:text-text-primary transition-colors btn-press cursor-pointer"
          title="Zmień kolor"
        >
          <Palette size={14} />
          <span className="hidden md:inline">Kolor</span>
        </Pressable>

        {onBulkMoveFolder && (
          <Pressable
            onClick={() => {
              setShowFolderMenu(!showFolderMenu);
              setShowPalette(false);
            }}
            disabled={busy}
            className="flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-text-secondary hover:bg-surface-solid hover:text-text-primary transition-colors btn-press cursor-pointer"
            title="Przenieś do folderu"
          >
            <FolderInput size={14} />
            <span className="hidden md:inline">Folder</span>
          </Pressable>
        )}

        <Pressable
          onClick={onBulkArchive}
          disabled={busy}
          className="flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-text-secondary hover:bg-surface-solid hover:text-text-primary transition-colors btn-press cursor-pointer"
          title="Archiwizuj"
        >
          <Archive size={14} />
          <span className="hidden md:inline">Archiwum</span>
        </Pressable>

        <Pressable
          onClick={onBulkDelete}
          disabled={busy}
          className="flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-danger hover:bg-danger/10 transition-colors btn-press cursor-pointer"
          title="Usuń wybrane"
        >
          <Trash2 size={14} />
          <span className="hidden md:inline">Usuń</span>
        </Pressable>

        <div className="h-4 w-px bg-border-custom/40 mx-0.5" />

        <Pressable
          onClick={onClearSelection}
          disabled={busy}
          className="p-1.5 rounded-xl text-text-muted hover:bg-surface-solid hover:text-text-primary transition-colors btn-press cursor-pointer"
          title="Anuluj wybór (Esc)"
          aria-label="Wyczyść zaznaczenie"
        >
          <X size={14} />
        </Pressable>
      </div>
    </aside>
  );
}
