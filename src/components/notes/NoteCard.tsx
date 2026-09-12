/**
 * @component NoteCard
 * @role Kafelek notatki w widoku grid.
 * @usedBy MasonryGrid
 */
import { Pressable } from '../ui/ControlPrimitives';
import { useRef, useState } from 'react';
import { Archive, Check, ListTodo, LockKeyhole, Palette, Pin, Trash2 } from 'lucide-react';
import { getColor, relativeDate, sanitizeHtml, Note, highlightHtml } from './keepUtils';
import { getPlainText } from '../../lib/noteText';
import NoteColorPicker from './NoteColorPicker';

export default function NoteCard({
  note,
  onDelete,
  onTogglePin,
  onUpdate,
  busy,
  isEditing,
  onOpen,
  onDragStart,
  onDragEnter,
  onDragEnd,
  onDragOver,
  isDragOver,
  onClickTag,
  onConvertToTodo,
  search = '',
  isSelectMode = false,
  isSelected = false,
  onToggleSelect,
}: {
  note: Note;
  onDelete: (id: string) => void;
  onTogglePin: (note: Note) => void;
  onUpdate: (id: string, patch: Partial<Note>) => void;
  busy: boolean;
  isEditing: boolean;
  onOpen: (id: string) => void;
  onDragStart: (id: string) => void;
  onDragEnter: (id: string) => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent) => void;
  isDragOver: boolean;
  onClickTag?: (tag: string) => void;
  onConvertToTodo?: (note: Note) => void;
  search?: string;
  isSelectMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [showColorPopover, setShowColorPopover] = useState(false);
  const c = getColor(note.color);

  return (
    <div
      ref={ref}
      className={`keep-card ${note.is_pinned ? 'pinned' : ''} ${isDragOver ? 'drag-over' : ''} ${
        isSelected ? 'ring-2 ring-primary shadow-md !border-primary' : ''
      }`}
      style={{
        backgroundColor: c.bg,
        borderColor: isDragOver ? 'var(--color-theme-hex-6366f1)' : c.border,
        opacity: 'var(--opacity-100)',
      }}
      onClick={() => {
        if (isSelectMode) {
          onToggleSelect?.();
        } else {
          onOpen(note.id);
        }
      }}
      draggable={!isEditing && !isSelectMode}
      onDragStart={() => onDragStart(note.id)}
      onDragEnter={() => onDragEnter(note.id)}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
    >
      {/* Select Mode Checkbox */}
      {isSelectMode && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect?.();
          }}
          className="absolute top-2.5 left-2.5 z-10 cursor-pointer"
        >
          <div
            className={`h-4 w-4 rounded-md border flex items-center justify-center transition-all ${
              isSelected
                ? 'bg-primary border-primary text-on-accent shadow-xs'
                : 'border-border-custom bg-surface-solid hover:border-primary/50'
            }`}
          >
            {isSelected && <Check size={11} strokeWidth={3} />}
          </div>
        </div>
      )}

      {/* Pin badge */}
      {note.is_pinned && !isSelectMode && (
        <div className="keep-pin-badge">
          <Pin size={9} fill="currentColor" />
        </div>
      )}
      {note.is_locked && (
        <div className="absolute right-3 top-3 text-text-muted" title="Zablokowana notatka">
          <LockKeyhole size={13} />
        </div>
      )}

      {/* Drag handle — shows on hover */}
      {!isSelectMode && (
        <div className="keep-drag-handle" title="Przeciągnij aby przenieść">
          <span />
          <span />
          <span />
        </div>
      )}

      {note.title && (
        <h3
          className="keep-card-title"
          style={{ color: c.text }}
          dangerouslySetInnerHTML={{ __html: highlightHtml(sanitizeHtml(note.title), search) }}
        />
      )}
      {note.content && (
        <div
          className="keep-card-content"
          style={{ color: c.textSub }}
          dangerouslySetInnerHTML={{ __html: highlightHtml(sanitizeHtml(note.content), search) }}
          onClick={(e) => {
            const target = e.target as HTMLElement;
            if (target.classList.contains('keep-todo-checkbox')) {
              e.stopPropagation();
              e.preventDefault();
              // Clone from the live DOM (not the `note.content` prop closure) so a
              // second rapid toggle can't overwrite an in-flight first toggle with
              // stale content before React re-renders with the updated note.
              const container = document.createElement('div');
              container.innerHTML = e.currentTarget.innerHTML;
              const checkboxes = Array.from(e.currentTarget.querySelectorAll('.keep-todo-checkbox'));
              const index = checkboxes.indexOf(target);
              if (index !== -1) {
                const docCheckboxes = container.querySelectorAll('.keep-todo-checkbox');
                const targetCheckbox = docCheckboxes[index] as HTMLElement;
                if (targetCheckbox) {
                  const isChecked = targetCheckbox.classList.toggle('checked');
                  const sibling = targetCheckbox.nextElementSibling as HTMLElement;
                  if (sibling) {
                    sibling.classList.toggle('completed', isChecked);
                  }
                  onUpdate(note.id, { content: container.innerHTML });
                }
              }
            }
          }}
        />
      )}
      {!note.title && !getPlainText(note.content) && note.drawing_preview_path && (
        <div className="keep-card-content" style={{ color: c.textSub }}>Rysunek</div>
      )}
      {note.tags.length > 0 && (
        <div className="keep-card-tags">
          {note.tags.map((t, i) => (
            <span
              key={i}
              onClick={(e) => {
                e.stopPropagation();
                onClickTag?.(t);
              }}
              className="keep-tag cursor-pointer hover:opacity-[var(--opacity-80)] active:scale-95 transition-all"
              style={{ background: c.tagBg, color: c.tagText, borderColor: 'transparent' }}
            >
              {t}
            </span>
          ))}
        </div>
      )}
      <div className="keep-card-footer" style={{ borderTopColor: 'var(--color-theme-hex-ba255255255008)' }}>
        <span className="keep-card-date" style={{ color: c.textSub, opacity: 'var(--ds-inline-style-0-6)' }}>
          {relativeDate(note.updated_at || note.created_at)}
        </span>
         <div className="keep-card-actions">
          {!note.is_archived && onConvertToTodo && (
            <Pressable
              type="button"
              onClick={e => { e.stopPropagation(); onConvertToTodo(note); }}
              className="keep-icon-btn"
              title="Dodaj do zadań"
            >
              <ListTodo size={14} />
            </Pressable>
          )}
          <Pressable
            type="button"
            onClick={e => { e.stopPropagation(); onTogglePin(note); }}
            className={`keep-icon-btn ${note.is_pinned ? 'active' : ''}`}
            title={note.is_pinned ? 'Odepnij' : 'Przypnij'}
          >
            <Pin size={14} fill={note.is_pinned ? 'currentColor' : 'none'} />
          </Pressable>
          <div className="relative">
            <Pressable
              type="button"
              onClick={e => {
                e.stopPropagation();
                setShowColorPopover(!showColorPopover);
              }}
              className="keep-icon-btn"
              title="Zmień kolor"
            >
              <Palette size={14} />
            </Pressable>
            {showColorPopover && (
              <div
                className="absolute bottom-full right-0 mb-1 z-30 rounded-xl border border-border-custom bg-background/95 p-1 shadow-xl backdrop-blur-md"
                onClick={e => e.stopPropagation()}
              >
                <NoteColorPicker
                  currentColor={note.color}
                  onSelectColor={col => {
                    onUpdate(note.id, { color: col });
                    setShowColorPopover(false);
                  }}
                />
              </div>
            )}
          </div>
          <Pressable
            type="button"
            onClick={e => { e.stopPropagation(); onUpdate(note.id, { is_archived: !note.is_archived, is_pinned: false }); }}
            className={`keep-icon-btn ${note.is_archived ? 'active' : ''}`}
            title={note.is_archived ? 'Przywróć z archiwum' : 'Archiwizuj'}
          >
            <Archive size={14} fill={note.is_archived ? 'currentColor' : 'none'} />
          </Pressable>
          <Pressable
            type="button"
            onClick={e => { e.stopPropagation(); onDelete(note.id); }}
            disabled={busy}
            className="keep-icon-btn danger"
            title="Usuń"
          >
            <Trash2 size={14} />
          </Pressable>
        </div>
      </div>
    </div>
  );
}
