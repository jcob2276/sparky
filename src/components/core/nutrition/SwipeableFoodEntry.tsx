/** iOS-style swipe-left to reveal Delete action on a food entry row.
 *  - Zero bleed-through: red action only renders when offset < 0.
 *  - Solid surface backdrop: sliding row completely conceals background.
 *  - Elastic pull: dynamic width expansion on deep swipe.
 *  - Tap-to-dismiss: tapping an open row safely closes it without opening edit.
 *  - Haptic feedback on reveal threshold. */
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import { useRef, useState, useCallback } from 'react';
import { Trash2 } from 'lucide-react';
import { Pressable } from '../../ui/ControlPrimitives';
import { useHaptics } from '../../../hooks/useHaptics';

interface SwipeableFoodEntryProps {
  children: ReactNode;
  onDelete: () => void;
}

type GestureAxis = 'pending' | 'horizontal' | 'vertical';

const REVEAL_THRESHOLD = 44;
const REVEAL_WIDTH = 76;
const MAX_DRAG = -130;

export default function SwipeableFoodEntry({ children, onDelete }: SwipeableFoodEntryProps) {
  const haptics = useHaptics();
  const [offset, setOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const start = useRef({ x: 0, y: 0 });
  const startOffset = useRef(0);
  const axis = useRef<GestureAxis>('pending');
  const dragging = useRef(false);
  const didDrag = useRef(false);
  const hasTriggeredHaptic = useRef(false);

  const pointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    start.current = { x: e.clientX, y: e.clientY };
    startOffset.current = offset;
    axis.current = 'pending';
    dragging.current = true;
    didDrag.current = false;
    hasTriggeredHaptic.current = false;
  };

  const pointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    const dx = e.clientX - start.current.x;
    const dy = e.clientY - start.current.y;

    if (axis.current === 'pending' && Math.max(Math.abs(dx), Math.abs(dy)) > 8) {
      axis.current = Math.abs(dx) > Math.abs(dy) * 1.15 ? 'horizontal' : 'vertical';
      if (axis.current === 'horizontal') {
        e.currentTarget.setPointerCapture?.(e.pointerId);
        setIsDragging(true);
        didDrag.current = true;
      }
    }

    if (axis.current !== 'horizontal') return;

    const raw = startOffset.current + dx;
    const clamped = Math.max(MAX_DRAG, Math.min(0, raw));

    if (!hasTriggeredHaptic.current && clamped <= -REVEAL_THRESHOLD) {
      haptics.light();
      hasTriggeredHaptic.current = true;
    } else if (hasTriggeredHaptic.current && clamped > -REVEAL_THRESHOLD) {
      hasTriggeredHaptic.current = false;
    }

    setOffset(clamped);
  };

  const pointerUp = () => {
    dragging.current = false;
    setIsDragging(false);

    if (axis.current !== 'horizontal') {
      return;
    }

    if (offset <= -REVEAL_THRESHOLD) {
      setOffset(-REVEAL_WIDTH);
    } else {
      setOffset(0);
    }
  };

  const handleDelete = () => {
    haptics.medium();
    setOffset(0);
    onDelete();
  };

  const handleContentClickCapture = useCallback(
    (e: React.MouseEvent) => {
      // If the user performed a drag or the row is already open, intercept the click
      // so it doesn't open the food edit modal. Tapping an open row closes it.
      if (didDrag.current || offset < 0) {
        e.preventDefault();
        e.stopPropagation();
        didDrag.current = false;
        setOffset(0);
      }
    },
    [offset]
  );

  return (
    <div
      data-no-swipe-nav="true"
      data-swipeable="true"
      className="relative overflow-hidden touch-pan-y select-none"
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => {
        if (axis.current === 'horizontal') {
          e.stopPropagation();
        }
      }}
      onPointerDown={pointerDown}
      onPointerMove={pointerMove}
      onPointerUp={pointerUp}
      onPointerCancel={() => {
        dragging.current = false;
        setIsDragging(false);
        setOffset(0);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') setOffset(0);
      }}
    >
      {/* Delete action revealed behind row — STRICTLY only rendered when swiping or open */}
      {offset < 0 && (
        <div
          className="absolute inset-y-0 right-0 flex items-center justify-center bg-danger transition-opacity"
          style={{ width: Math.max(REVEAL_WIDTH, Math.abs(offset)) }}
        >
          <Pressable
            type="button"
            onClick={handleDelete}
            className="flex h-full w-full flex-col items-center justify-center gap-0.5 text-on-accent active:opacity-70 cursor-pointer"
            aria-label="Usuń wpis"
          >
            <Trash2 size={16} />
            <span className="text-3xs font-black tracking-tight">Usuń</span>
          </Pressable>
        </div>
      )}

      {/* Sliding row content — solid bg-surface guarantees zero bleed-through */}
      <div
        className="relative w-full bg-surface ease-out"
        style={{
          transform: `translate3d(${offset}px, 0, 0)`,
          transitionProperty: 'transform',
          transitionDuration: isDragging ? '0ms' : '220ms',
        }}
        onClickCapture={handleContentClickCapture}
      >
        {children}
      </div>
    </div>
  );
}
