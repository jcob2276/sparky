import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Pressable } from '../ui/ControlPrimitives';
import type { Note } from './keepUtils';

interface Props {
  note: Note;
  /** Where the menu was invoked (right click / long press); without it the menu opens as a sheet. */
  point?: { x: number; y: number };
  onClose: () => void;
  onTogglePin: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onLock?: () => void;
  onShare?: () => void;
  onMove?: () => void;
}

const WIDTH = 252;
const MARGIN = 8;
const WIDE_MIN = 640;
const ITEM_BASE = 'todo-instant flex min-h-11 w-full items-center px-4 text-left text-sm hover:bg-text-primary/[0.06]';
const ITEM = `${ITEM_BASE} text-text-primary`;
const DANGER = `${ITEM_BASE} text-danger`;

/** Apple Notes-style context menu in liquid glass: grouped actions at the pointer, a bottom sheet on phones. */
export default function NoteQuickActions({ note, point, onClose, onTogglePin, onArchive, onDelete, onLock, onShare, onMove }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; });
  const sheet = !point || window.innerWidth < WIDE_MIN;
  const [pos, setPos] = useState<{ left: number; top: number }>({ left: point?.x ?? 0, top: point?.y ?? 0 });

  useLayoutEffect(() => {
    if (sheet || !point || !ref.current) return;
    const h = ref.current.offsetHeight;
    setPos({
      left: Math.max(MARGIN, Math.min(point.x, window.innerWidth - WIDTH - MARGIN)),
      top: Math.max(MARGIN, Math.min(point.y, window.innerHeight - h - MARGIN)),
    });
  }, [sheet, point]);

  useEffect(() => {
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.stopPropagation(); onCloseRef.current(); } };
    document.addEventListener('keydown', key, true);
    return () => document.removeEventListener('keydown', key, true);
  }, []);

  const divider = <div className="ios-glass-divider" role="separator" />;
  return createPortal(
    <>
      <Pressable
        type="button"
        tabIndex={-1}
        aria-label="Zamknij akcje notatki"
        className={`ios-glass-scrim note-quick-actions-backdrop ${sheet ? '' : 'note-quick-actions-backdrop-clear'}`}
        onClick={(event) => {
          event.stopPropagation();
          onClose();
        }}
      />
      <div ref={ref} role="menu" aria-label={`Akcje notatki: ${note.title.trim() || 'Bez tytułu'}`} data-mode={sheet ? 'sheet' : 'popover'}
        style={sheet ? undefined : { left: pos.left, top: pos.top, width: WIDTH, transformOrigin: 'top left' }}
        className="ios-glass ios-glass-pop note-quick-actions-panel fixed !rounded-2xl overflow-y-auto py-1.5">
        <Pressable role="menuitem" className={ITEM} onClick={onTogglePin}>{note.is_pinned ? 'Odepnij notatkę' : 'Przypnij notatkę'}</Pressable>
        {onLock ? <Pressable role="menuitem" className={ITEM} onClick={onLock}>Zablokuj notatkę</Pressable> : null}
        {onShare || onMove ? divider : null}
        {onShare ? <Pressable role="menuitem" className={ITEM} onClick={onShare}>Udostępnij notatkę</Pressable> : null}
        {onMove ? <Pressable role="menuitem" className={ITEM} onClick={onMove}>Przenieś do…</Pressable> : null}
        {divider}
        <Pressable role="menuitem" className={ITEM} onClick={onArchive}>Archiwizuj</Pressable>
        <Pressable role="menuitem" className={DANGER} onClick={onDelete}>Usuń</Pressable>
      </div>
    </>,
    document.body,
  );
}
