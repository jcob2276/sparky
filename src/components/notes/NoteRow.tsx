/**
 * @component NoteRow
 * @role Wiersz notatki w widoku split (odpowiednik NoteCard dla trybu list).
 * @usedBy SplitNotesView
 */
import { Pressable } from '../ui/ControlPrimitives';
import { Check, LockKeyhole, Pin } from 'lucide-react';
import { useRef } from 'react';
import { Note, getColor, noteListDate, getPlainText } from './keepUtils';
import { useHaptics } from '../../hooks/useHaptics';
import { stripMarkdown } from './markdownLite';
import { highlightText, snippetAround } from './searchSnippet';

interface NoteRowProps {
  note: Note;
  isActive: boolean;
  onClick: () => void;
  onLongPress: (point?: { x: number; y: number }) => void;
  isSelectMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  search?: string;
}

export default function NoteRow({
  note,
  isActive,
  onClick,
  onLongPress,
  isSelectMode = false,
  isSelected = false,
  onToggleSelect,
  search = '',
}: NoteRowProps) {
  const pressTimer = useRef<number | null>(null);
  const longPressed = useRef(false);
  const plainText = stripMarkdown(getPlainText(note.content));
  const trimmedTitle = note.title.trim();
  const bodyText = (trimmedTitle && plainText.startsWith(trimmedTitle))
    ? plainText.slice(trimmedTitle.length).trim()
    : plainText;
  const snippet = note.is_locked ? 'Wymaga hasła' : bodyText ? snippetAround(bodyText, search, 180) : trimmedTitle ? '' : 'Brak dodatkowej treści';
  const dateStr = noteListDate(note.updated_at || note.created_at);
  const color = getColor(note.color);
  const { light } = useHaptics();
  const cancelLongPress = () => {
    if (pressTimer.current) window.clearTimeout(pressTimer.current);
    pressTimer.current = null;
  };

  const startLongPress = (event: React.PointerEvent) => {
    longPressed.current = false;
    const point = { x: event.clientX, y: event.clientY };
    pressTimer.current = window.setTimeout(() => {
      longPressed.current = true;
      light();
      onLongPress(point);
    }, 500);
  };

  return (
    <Pressable
      onClick={() => {
        if (isSelectMode) {
          onToggleSelect?.();
        } else if (!longPressed.current) {
          onClick();
        }
        longPressed.current = false;
      }}
      onPointerDown={!isSelectMode ? startLongPress : undefined}
      onPointerUp={!isSelectMode ? cancelLongPress : undefined}
      onPointerCancel={!isSelectMode ? cancelLongPress : undefined}
      onPointerLeave={!isSelectMode ? cancelLongPress : undefined}
      onPointerMove={!isSelectMode ? cancelLongPress : undefined}
      onContextMenu={event => {
        event.preventDefault();
        cancelLongPress();
        onLongPress({ x: event.clientX, y: event.clientY });
      }}
      className={`note-list-row relative mx-1.5 flex w-[calc(100%-0.75rem)] select-none flex-col gap-0.5 rounded-xl px-3 py-2.5 text-left transition-colors ${
        isSelected
          ? 'bg-primary/10 ring-1 ring-inset ring-primary/25'
          : isActive
          ? 'bg-text-primary/[0.09] text-text-primary'
          : 'bg-transparent text-text-primary hover:bg-text-primary/[0.04]'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          {isSelectMode && (
            <div
              className={`h-4 w-4 rounded-md border shrink-0 mt-0.5 flex items-center justify-center ui-interactive ${
                isSelected
                  ? 'bg-primary border-primary text-on-accent shadow-xs'
                  : 'border-border-custom bg-surface-solid'
              }`}
            >
              {isSelected && <Check size={11} strokeWidth={3} />}
            </div>
          )}
          <span className="block flex-1 truncate text-sm font-semibold leading-snug tracking-[var(--tracking-note-title)] text-text-primary">
            {highlightText(note.title.trim(), search) || 'Bez tytułu'}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
          {note.is_pinned && (
            <span className="text-[var(--color-warning)]" title="Przypięta">
              <Pin size={12} fill="currentColor" />
            </span>
          )}
          {note.is_locked && (
            <span className="text-text-muted" title="Zablokowana">
              <LockKeyhole size={12} />
            </span>
          )}
        </div>
      </div>

      <div className="flex items-baseline gap-2 text-xs leading-snug text-text-muted">
        <span className="shrink-0 text-text-secondary">{dateStr}</span>
        {snippet && <span className="min-w-0 flex-1 truncate">{highlightText(snippet, search)}</span>}
      </div>

      {note.color !== 'default' && !isActive && (
        <span
          className="absolute bottom-2.5 right-3 h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: color.dot }}
        />
      )}
    </Pressable>
  );
}
