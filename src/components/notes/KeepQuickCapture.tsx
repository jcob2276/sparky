import { Pressable, ControlInput, ControlTextarea } from '../ui/ControlPrimitives';
import { CheckSquare, Palette, Plus, SquarePen } from 'lucide-react';
import NoteColorPicker from './NoteColorPicker';
import { getColor } from './keepUtils';
import { useKeepQuickCapture } from './useKeepQuickCapture';

interface KeepQuickCaptureProps {
  onCreate: (note: { title: string; content: string; color?: string; tags?: string[]; is_pinned?: boolean }) => Promise<string | void> | void;
}

export default function KeepQuickCapture({ onCreate }: KeepQuickCaptureProps) {
  const {
    expanded, setExpanded,
    title, setTitle,
    content, setContent,
    color, setColor,
    isChecklist, setIsChecklist,
    showColorPicker, setShowColorPicker,
    containerRef,
    handleSave,
    handleStartChecklist,
    handleCancel,
  } = useKeepQuickCapture({ onCreate });

  const c = getColor(color);

  return (
    <div
      ref={containerRef}
      style={{ backgroundColor: c.bg, borderColor: c.border }}
      className={`mx-auto w-full max-w-2xl rounded-2xl border ui-interactive duration-[var(--motion-medium)] shadow-sm ${
        expanded ? 'p-4 shadow-md' : 'px-4 py-2.5 hover:border-border-custom'
      }`}
    >
      {!expanded ? (
        <div className="flex items-center justify-between gap-3 cursor-text" onClick={() => setExpanded(true)}>
          <div className="flex items-center gap-2.5 text-text-muted flex-1 text-sm font-medium">
            <Plus size={16} className="text-primary" />
            <span>Zanotuj myśl...</span>
          </div>
          <Pressable
            onClick={(e) => {
              e.stopPropagation();
              handleStartChecklist();
            }}
            className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-solid rounded-xl transition-colors cursor-pointer"
            title="Nowa lista zadań"
            aria-label="Nowa lista zadań"
          >
            <CheckSquare size={16} />
          </Pressable>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          <ControlInput
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Tytuł"
            className="w-full bg-transparent text-sm font-bold text-text-primary placeholder:text-text-muted/60 border-none outline-none ring-0 p-0"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                containerRef.current?.querySelector('textarea')?.focus();
              }
            }}
          />

          <ControlTextarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={isChecklist ? 'Wpisz pozycje listy (każda w nowej linii)...' : 'Treść notatki...'}
            rows={3}
            className="w-full bg-transparent text-xs text-text-primary placeholder:text-text-muted/60 border-none outline-none ring-0 p-0 resize-none font-sans"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleSave();
              }
            }}
          />

          {showColorPicker && (
            <div className="pt-1">
              <NoteColorPicker currentColor={color} onSelectColor={(col) => setColor(col)} />
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-border-custom/20">
            <div className="flex items-center gap-1">
              <Pressable
                onClick={() => setShowColorPicker(!showColorPicker)}
                className="p-1 text-text-muted hover:text-text-primary rounded-lg transition-colors cursor-pointer"
                title="Wybierz kolor"
              >
                <Palette size={15} />
              </Pressable>
              <Pressable
                onClick={() => setIsChecklist(!isChecklist)}
                className={`p-1 rounded-lg transition-colors cursor-pointer ${
                  isChecklist ? 'text-primary bg-primary/10' : 'text-text-muted hover:text-text-primary'
                }`}
                title="Lista zadań"
              >
                <CheckSquare size={15} />
              </Pressable>
            </div>

            <div className="flex items-center gap-1.5">
              <Pressable
                onClick={handleCancel}
                className="px-3 py-1 text-xs font-semibold text-text-muted hover:text-text-primary rounded-xl cursor-pointer"
              >
                Zamknij
              </Pressable>
              <Pressable
                onClick={handleSave}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-primary text-on-accent text-xs font-bold hover:bg-primary-hover transition-colors shadow-2xs btn-press cursor-pointer"
              >
                <SquarePen size={13} />
                <span>Zapisz</span>
              </Pressable>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
