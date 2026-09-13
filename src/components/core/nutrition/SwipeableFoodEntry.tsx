/** iOS-style swipe-left to reveal Delete action on a food entry row.
 *  Swipe right is a no-op (no pin). Tap content = edit. */
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import { useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Pressable } from '../../ui/ControlPrimitives';

interface SwipeableFoodEntryProps {
  children: ReactNode;
  onDelete: () => void;
}

type GestureAxis = 'pending' | 'horizontal' | 'vertical';

const REVEAL_THRESHOLD = 60;
const REVEAL_WIDTH = 80;
const MAX_DRAG = -REVEAL_WIDTH - 8;

export default function SwipeableFoodEntry({ children, onDelete }: SwipeableFoodEntryProps) {
  const [offset, setOffset] = useState(0);
  const start = useRef({ x: 0, y: 0 });
  const axis = useRef<GestureAxis>('pending');
  const dragging = useRef(false);

  const pointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    start.current = { x: e.clientX, y: e.clientY };
    axis.current = 'pending';
    dragging.current = true;
  };

  const pointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    const dx = e.clientX - start.current.x;
    const dy = e.clientY - start.current.y;
    if (axis.current === 'pending' && Math.max(Math.abs(dx), Math.abs(dy)) > 8) {
      axis.current = Math.abs(dx) > Math.abs(dy) * 1.15 ? 'horizontal' : 'vertical';
      if (axis.current === 'horizontal') e.currentTarget.setPointerCapture?.(e.pointerId);
    }
    if (axis.current !== 'horizontal') return;
    // Only allow left swipe (negative offset)
    const clamped = Math.max(MAX_DRAG, Math.min(0, dx));
    setOffset(clamped);
  };

  const pointerUp = () => {
    dragging.current = false;
    if (axis.current !== 'horizontal') {
      setOffset(0);
      return;
    }
    if (offset <= -REVEAL_THRESHOLD) {
      setOffset(MAX_DRAG);
    } else {
      setOffset(0);
    }
  };

  const handleDelete = () => {
    setOffset(0);
    onDelete();
  };

  return (
    <div
      className="relative overflow-hidden"
      onPointerDown={pointerDown}
      onPointerMove={pointerMove}
      onPointerUp={pointerUp}
      onPointerCancel={() => { dragging.current = false; setOffset(0); }}
      onKeyDown={(e) => { if (e.key === 'Escape') setOffset(0); }}
    >
      {/* Delete action revealed behind row */}
      <div
        className="absolute inset-y-0 right-0 flex items-center justify-center bg-danger/90"
        style={{ width: REVEAL_WIDTH }}
        aria-hidden={offset === 0}
      >
        <Pressable
          type="button"
          onClick={handleDelete}
          className="flex h-full w-full flex-col items-center justify-center gap-0.5 text-on-accent active:opacity-70"
        >
          <Trash2 size={16} />
          <span className="text-3xs font-black">Usuń</span>
        </Pressable>
      </div>

      {/* Sliding row content */}
      <div
        className="relative transition-transform duration-200 ease-out"
        style={{ transform: `translate3d(${offset}px, 0, 0)` }}
      >
        {children}
      </div>
    </div>
  );
}
