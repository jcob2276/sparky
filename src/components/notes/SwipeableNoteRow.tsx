import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import { useRef, useState } from 'react';
import { Pressable } from '../ui/ControlPrimitives';

interface SwipeableNoteRowProps {
  children: ReactNode;
  isPinned: boolean;
  onTogglePin: () => void;
  onMove: () => void;
  onDelete: () => void;
}

type GestureAxis = 'pending' | 'horizontal' | 'vertical';

export default function SwipeableNoteRow({
  children,
  isPinned,
  onTogglePin,
  onMove,
  onDelete,
}: SwipeableNoteRowProps) {
  const [offset, setOffset] = useState(0);
  const start = useRef({ x: 0, y: 0 });
  const axis = useRef<GestureAxis>('pending');
  const dragging = useRef(false);

  const pointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    start.current = { x: event.clientX, y: event.clientY };
    axis.current = 'pending';
    dragging.current = true;
  };

  const pointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    const dx = event.clientX - start.current.x;
    const dy = event.clientY - start.current.y;
    if (axis.current === 'pending' && Math.max(Math.abs(dx), Math.abs(dy)) > 8) {
      axis.current = Math.abs(dx) > Math.abs(dy) * 1.15 ? 'horizontal' : 'vertical';
      if (axis.current === 'horizontal') event.currentTarget.setPointerCapture?.(event.pointerId);
    }
    if (axis.current !== 'horizontal') return;
    const limited = Math.max(-152, Math.min(96, dx));
    setOffset(limited);
  };

  const pointerUp = () => {
    dragging.current = false;
    if (axis.current !== 'horizontal') {
      setOffset(0);
      return;
    }
    if (offset >= 72) {
      onTogglePin();
      setOffset(0);
    } else if (offset <= -72) {
      setOffset(-152);
    } else {
      setOffset(0);
    }
  };

  return (
    <div
      className="keep-swipe-row"
      data-testid="swipeable-note-row"
      onPointerDown={pointerDown}
      onPointerMove={pointerMove}
      onPointerUp={pointerUp}
      onPointerCancel={() => { dragging.current = false; setOffset(0); }}
      onKeyDown={event => { if (event.key === 'Escape') setOffset(0); }}
    >
      {offset > 0 && <div className="keep-swipe-actions pin"><Pressable type="button" onClick={onTogglePin}>{isPinned ? 'Odepnij' : 'Przypnij'}</Pressable></div>}
      {offset < 0 && <div className="keep-swipe-actions destructive"><Pressable type="button" onClick={onMove}>Przenieś</Pressable><Pressable type="button" onClick={onDelete}>Usuń</Pressable></div>}
      <div className="keep-swipe-content" style={{ transform: `translate3d(${offset}px, 0, 0)` }}>
        {children}
      </div>
    </div>
  );
}
