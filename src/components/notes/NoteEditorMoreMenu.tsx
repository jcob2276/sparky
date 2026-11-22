import { useEffect, useState } from 'react';
import {
  Archive,
  Download,
  FileText,
  ListTodo,
  Lock,
  MoreHorizontal,
  Pin,
  Share2,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { Pressable } from '../ui/ControlPrimitives';
import Sheet from '../ui/Sheet';
import { COLORS } from './keepUtils';

interface Props {
  pinned: boolean;
  color: string;
  isMobile?: boolean;
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
  const [isMobileWidth, setIsMobileWidth] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < 768 : false));

  useEffect(() => {
    const onResize = () => setIsMobileWidth(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const useSheet = props.isMobile ?? isMobileWidth;

  useEffect(() => {
    if (!open || useSheet) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [open, useSheet]);

  const run = (action: () => void) => {
    setOpen(false);
    action();
  };

  const selectedColorLabel = COLORS.find(c => c.id === props.color)?.label || 'Domyślny';

  return (
    <div className="relative">
      <Pressable
        variant="ghost"
        size="sm"
        onClick={() => setOpen(value => !value)}
        aria-label="Więcej czynności"
        className="text-inherit hover:bg-text-primary/5"
      >
        <MoreHorizontal size={18} />
      </Pressable>

      {/* Widok na telefonie: natywny iOS Bottom Sheet */}
      {useSheet ? (
        <Sheet
          open={open}
          onOpenChange={setOpen}
          side="bottom"
          compact
          title="Czynności notatki"
          handleDragOnly
        >
          <div className="space-y-4 pb-2" role="menu" aria-label="Czynności notatki">
            {/* Paleta kolorów */}
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-2xs font-bold uppercase tracking-wider text-text-muted">Kolor notatki</span>
                <span className="text-2xs text-text-muted">{selectedColorLabel}</span>
              </div>
              <div className="flex items-center justify-between gap-1.5 px-0.5 py-1 overflow-x-auto" role="group" aria-label="Wybierz kolor">
                {COLORS.map(c => {
                  const isSelected = props.color === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => props.onColor(c.id)}
                      title={c.label}
                      aria-label={c.label}
                      className={`h-8 w-8 rounded-full border border-black/10 dark:border-white/10 transition-transform active:scale-90 flex items-center justify-center shrink-0 ${
                        isSelected ? 'ring-2 ring-primary ring-offset-2 ring-offset-surface-solid scale-110 shadow-xs' : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: c.dot }}
                    >
                      {isSelected && <div className="h-2 w-2 rounded-full bg-text-primary/70" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Grupa: Organizacja i ochrona */}
            <div className="space-y-1 rounded-2xl border border-border-custom/40 bg-surface-2/40 p-1.5">
              <SheetActionRow
                icon={<Pin size={18} className={props.pinned ? 'text-primary fill-primary/20' : 'text-text-muted'} />}
                label={props.pinned ? 'Odepnij notatkę' : 'Przypnij notatkę'}
                hint={props.pinned ? 'Przypięta' : 'Góra listy'}
                onClick={() => run(props.onPin)}
              />
              {props.onLock && (
                <SheetActionRow
                  icon={<Lock size={18} className="text-text-muted" />}
                  label="Zablokuj notatkę"
                  hint="Hasło / PIN"
                  onClick={() => run(props.onLock!)}
                />
              )}
              <SheetActionRow
                icon={<Archive size={18} className="text-text-muted" />}
                label="Archiwizuj notatkę"
                hint="Przenieś do archiwum"
                onClick={() => run(props.onArchive)}
              />
            </div>

            {/* Grupa: Inteligentne narzędzia AI */}
            <div className="space-y-1 rounded-2xl border border-border-custom/40 bg-surface-2/40 p-1.5">
              <SheetActionRow
                icon={<Sparkles size={18} className="text-amber-500" />}
                label="Podsumuj przez AI"
                hint="Synteza tekstu"
                onClick={() => run(props.onSummarize)}
              />
              <SheetActionRow
                icon={<ListTodo size={18} className="text-primary" />}
                label="Wyciągnij zadania"
                hint="Dodaj do Listy zadań"
                onClick={() => run(props.onExtractTasks)}
              />
            </div>

            {/* Grupa: Udostępnianie i Eksport */}
            {(props.onShare || props.onExport || props.onExportPdf) && (
              <div className="space-y-1 rounded-2xl border border-border-custom/40 bg-surface-2/40 p-1.5">
                {props.onShare && (
                  <SheetActionRow
                    icon={<Share2 size={18} className="text-text-muted" />}
                    label="Udostępnij kopię"
                    onClick={() => run(props.onShare!)}
                  />
                )}
                {props.onExportPdf && (
                  <SheetActionRow
                    icon={<FileText size={18} className="text-text-muted" />}
                    label="Eksportuj jako PDF"
                    onClick={() => run(props.onExportPdf!)}
                  />
                )}
                {props.onExport && (
                  <SheetActionRow
                    icon={<Download size={18} className="text-text-muted" />}
                    label="Eksportuj Markdown"
                    onClick={() => run(props.onExport!)}
                  />
                )}
              </div>
            )}

            {/* Grupa: Strefa usuwania */}
            <div className="pt-1">
              <Pressable
                variant="ghost"
                onClick={() => run(props.onDelete)}
                className="w-full flex items-center justify-center gap-2 rounded-2xl border border-danger/25 bg-danger/5 py-3 text-sm font-semibold text-danger transition-colors hover:bg-danger/10 active:bg-danger/15"
              >
                <Trash2 size={16} />
                <span>Usuń notatkę</span>
              </Pressable>
            </div>
          </div>
        </Sheet>
      ) : (
        /* Widok na komputerze: precyzyjny popover zakotwiczony pod przyciskiem */
        open && (
          <>
            <Pressable
              className="fixed inset-0 z-[var(--z-overlay)] bg-black/20 backdrop-blur-[2px] transition-opacity duration-150"
              onClick={() => setOpen(false)}
              aria-label="Zamknij menu"
            />
            <div
              role="menu"
              aria-label="Czynności notatki"
              style={{ transformOrigin: 'top right' }}
              className="keep-more-menu absolute right-0 top-10 z-[calc(var(--z-overlay)+10)] w-64 max-h-[min(540px,calc(100dvh-5rem))] overflow-y-auto rounded-2xl border border-border-custom/50 bg-surface-solid py-1.5 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
            >
              <DesktopMenuItem icon={<Pin size={16} />} label={props.pinned ? 'Odepnij notatkę' : 'Przypnij notatkę'} onClick={() => run(props.onPin)} />
              {props.onLock && <DesktopMenuItem icon={<Lock size={16} />} label="Zablokuj notatkę" onClick={() => run(props.onLock!)} />}
              <DesktopDivider />
              <DesktopMenuItem icon={<Sparkles size={16} className="text-amber-500" />} label="Podsumuj przez AI" onClick={() => run(props.onSummarize)} />
              <DesktopMenuItem icon={<ListTodo size={16} className="text-primary" />} label="Wyciągnij zadania" onClick={() => run(props.onExtractTasks)} />
              {(props.onShare || props.onExport || props.onExportPdf) && <DesktopDivider />}
              {props.onShare && <DesktopMenuItem icon={<Share2 size={16} />} label="Udostępnij kopię" onClick={() => run(props.onShare!)} />}
              {props.onExport && <DesktopMenuItem icon={<Download size={16} />} label="Eksportuj Markdown" onClick={() => run(props.onExport!)} />}
              {props.onExportPdf && <DesktopMenuItem icon={<FileText size={16} />} label="Eksportuj PDF" onClick={() => run(props.onExportPdf!)} />}
              <DesktopDivider />
              <div className="flex items-center gap-2 px-4 py-2.5" role="group" aria-label="Kolor notatki">
                {COLORS.map(color => (
                  <button
                    key={color.id}
                    type="button"
                    className={`h-6 w-6 rounded-full border border-border-custom/40 transition-transform active:scale-95 ${props.color === color.id ? 'ring-2 ring-primary ring-offset-1' : ''}`}
                    style={{ backgroundColor: color.dot }}
                    onClick={() => props.onColor(color.id)}
                    title={color.label}
                    aria-label={color.label}
                  />
                ))}
              </div>
              <DesktopDivider />
              <DesktopMenuItem icon={<Archive size={16} />} label="Archiwizuj" onClick={() => run(props.onArchive)} />
              <DesktopMenuItem danger icon={<Trash2 size={16} />} label="Usuń notatkę" onClick={() => run(props.onDelete)} />
            </div>
          </>
        )
      )}
    </div>
  );
}

function SheetActionRow({
  icon,
  label,
  hint,
  onClick,
  danger = false,
}: {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable
      role="menuitem"
      haptic="selection"
      onClick={onClick}
      className={`group flex min-h-[46px] w-full items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-left transition-colors active:bg-text-primary/10 ${
        danger ? 'text-danger font-medium hover:bg-danger/10' : 'text-text-primary hover:bg-text-primary/[0.06]'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className="flex w-5 shrink-0 justify-center">{icon}</span>
        <span className="truncate text-sm font-medium">{label}</span>
      </div>
      {hint && <span className="text-2xs text-text-muted shrink-0">{hint}</span>}
    </Pressable>
  );
}

function DesktopDivider() {
  return <div className="my-1 border-t border-border-custom/25" role="separator" />;
}

function DesktopMenuItem({ icon, label, onClick, danger = false }: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable
      role="menuitem"
      haptic="none"
      className={`todo-instant flex min-h-11 w-full items-center gap-3 px-4 text-left text-sm transition-colors hover:bg-text-primary/[0.06] active:bg-text-primary/[0.1] ${danger ? 'text-danger font-medium' : 'text-text-primary'}`}
      onClick={onClick}
    >
      <span className="flex w-5 shrink-0 justify-center">{icon}</span>{label}
    </Pressable>
  );
}
