import { useEffect, useState } from 'react';
import { Archive, Download, FileText, ListTodo, Lock, MoreHorizontal, Pin, Share2, Sparkles, Trash2 } from 'lucide-react';
import { Pressable } from '../ui/ControlPrimitives';
import { COLORS } from './keepUtils';

interface Props {
  pinned: boolean;
  color: string;
  onPin: () => void;
  onArchive: () => void;
  onExport?: () => void;
  onExportPdf?: () => void;
  onShare?: () => void;
  onLock?: () => void;
  onDelete: () => void;
  onSummarize: () => void;
  onExtractTasks: () => void;
  onColor: (color: string) => void;
}

export default function NoteEditorMoreMenu(props: Props) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [open]);
  const run = (action: () => void) => {
    setOpen(false);
    action();
  };

  return (
    <div className="relative">
      <Pressable variant="ghost" size="sm" onClick={() => setOpen(value => !value)} aria-label="Więcej czynności">
        <MoreHorizontal size={18} />
      </Pressable>
      {open && (
        <>
          <Pressable className="ios-popover-dismiss-layer" onClick={() => setOpen(false)} aria-label="Zamknij menu" />
          <div role="menu" aria-label="Czynności notatki" style={{ transformOrigin: 'top right' }}
            className="ios-glass ios-glass-pop keep-more-menu absolute right-0 top-10 w-64 overflow-hidden !rounded-2xl py-1.5">
            <MenuItem icon={<Pin size={16} />} label={props.pinned ? 'Odepnij notatkę' : 'Przypnij notatkę'} onClick={() => run(props.onPin)} />
            {props.onLock && <MenuItem icon={<Lock size={16} />} label="Zablokuj notatkę" onClick={() => run(props.onLock!)} />}
            <Divider />
            <MenuItem icon={<Sparkles size={16} />} label="Podsumuj przez AI" onClick={() => run(props.onSummarize)} />
            <MenuItem icon={<ListTodo size={16} />} label="Wyciągnij zadania" onClick={() => run(props.onExtractTasks)} />
            {(props.onShare || props.onExport || props.onExportPdf) && <Divider />}
            {props.onShare && <MenuItem icon={<Share2 size={16} />} label="Udostępnij kopię" onClick={() => run(props.onShare!)} />}
            {props.onExport && <MenuItem icon={<Download size={16} />} label="Eksportuj Markdown" onClick={() => run(props.onExport!)} />}
            {props.onExportPdf && <MenuItem icon={<FileText size={16} />} label="Eksportuj PDF" onClick={() => run(props.onExportPdf!)} />}
            <Divider />
            <div className="flex items-center gap-2 px-4 py-2.5" role="group" aria-label="Kolor notatki">
              {COLORS.map(color => (
                <Pressable
                  key={color.id}
                  haptic="none"
                  className={`h-6 w-6 rounded-full border border-border-custom/40 ${props.color === color.id ? 'ring-2 ring-primary ring-offset-1' : ''}`}
                  style={{ backgroundColor: color.dot }}
                  onClick={() => props.onColor(color.id)}
                  title={color.label}
                  aria-label={color.label}
                />
              ))}
            </div>
            <Divider />
            <MenuItem icon={<Archive size={16} />} label="Archiwizuj" onClick={() => run(props.onArchive)} />
            <MenuItem danger icon={<Trash2 size={16} />} label="Usuń notatkę" onClick={() => run(props.onDelete)} />
          </div>
        </>
      )}
    </div>
  );
}

function Divider() {
  return <div className="ios-glass-divider" role="separator" />;
}

function MenuItem({ icon, label, onClick, danger = false }: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable
      role="menuitem"
      haptic="none"
      className={`todo-instant flex min-h-11 w-full items-center gap-3 px-4 text-left text-sm hover:bg-text-primary/[0.06] ${danger ? 'text-danger' : 'text-text-primary'}`}
      onClick={onClick}
    >
      <span className="flex w-5 shrink-0 justify-center">{icon}</span>{label}
    </Pressable>
  );
}
