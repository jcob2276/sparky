import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable } from '../ui/ControlPrimitives';

interface SwipeableNoteRowProps {
  children: ReactNode;
  isPinned: boolean;
  onTogglePin: () => void;
  onMove: () => void;
  onDelete: () => void;
}

type GestureAxis = 'pending' | 'horizontal' | 'vertical';

function useSwipeCloseOnOutside(
  containerRef: React.RefObject<HTMLDivElement | null>,
  isOpen: boolean,
  onClose: () => void,
) {
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDownOutside = (event: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleScroll = () => {
      onClose();
    };

    window.addEventListener('pointerdown', handlePointerDownOutside);
    window.addEventListener('scroll', handleScroll, { capture: true, passive: true });

    return () => {
      window.removeEventListener('pointerdown', handlePointerDownOutside);
      window.removeEventListener('scroll', handleScroll, { capture: true });
    };
  }, [containerRef, isOpen, onClose]);
}

interface SwipeActionsProps {
  offset: number;
  isPinned: boolean;
  onTogglePin: (e: React.MouseEvent) => void;
  onMove: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
}

function SwipeActions({ offset, isPinned, onTogglePin, onMove, onDelete }: SwipeActionsProps) {
  if (offset > 0) {
    return (
      <div className="keep-swipe-actions pin">
        <Pressable type="button" onClick={onTogglePin}>
          {isPinned ? 'Odepnij' : 'Przypnij'}
        </Pressable>
      </div>
    );
  }
  if (offset < 0) {
    return (
      <div className="keep-swipe-actions destructive">
        <Pressable type="button" onClick={onMove}>Przenieś</Pressable>
        <Pressable type="button" onClick={onDelete}>Usuń</Pressable>
      </div>
    );
  }
  return null;
}

export default function SwipeableNoteRow({
  children,
  isPinned,
  onTogglePin,
  onMove,
  onDelete,
}: SwipeableNoteRowProps) {
  const [offset, setOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const offsetRef = useRef(0);
  const start = useRef({ x: 0, y: 0 });
  const initialOffset = useRef(0);
  const axis = useRef<GestureAxis>('pending');
  const dragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    offsetRef.current = 0;
    setOffset(0);
  }, []);

  const setRowOffset = (val: number) => {
    offsetRef.current = val;
    setOffset(val);
  };

  useSwipeCloseOnOutside(containerRef, offset !== 0, close);

  const pointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    start.current = { x: event.clientX, y: event.clientY };
    initialOffset.current = offsetRef.current;
    axis.current = 'pending';
    dragging.current = true;
    setIsDragging(true);
  };

  const pointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    const dx = event.clientX - start.current.x;
    const dy = event.clientY - start.current.y;
    if (axis.current === 'pending' && Math.max(Math.abs(dx), Math.abs(dy)) > 8) {
      axis.current = Math.abs(dx) > Math.abs(dy) * 1.15 ? 'horizontal' : 'vertical';
      if (axis.current === 'horizontal') {
        try {
          event.currentTarget.setPointerCapture?.(event.pointerId);
        } catch {
          // ignore
        }
      }
    }
    if (axis.current !== 'horizontal') return;

    const targetOffset = initialOffset.current + dx;
    const limited = Math.max(-152, Math.min(96, targetOffset));
    setRowOffset(limited);
  };

  const pointerUp = (event?: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    dragging.current = false;
    setIsDragging(false);

    if (event) {
      try {
        event.currentTarget.releasePointerCapture?.(event.pointerId);
      } catch {
        // ignore
      }
    }

    if (axis.current !== 'horizontal') return;

    const finalOffset = offsetRef.current;
    const dx = finalOffset - initialOffset.current;

    if (initialOffset.current === 0 && finalOffset >= 72) {
      onTogglePin();
      close();
    } else if (initialOffset.current < 0 && dx > 40) {
      close();
    } else if (finalOffset <= -72) {
      setRowOffset(-152);
    } else {
      close();
    }
  };

  const pointerCancel = () => {
    dragging.current = false;
    setIsDragging(false);
    close();
  };

  const handleTogglePin = (e: React.MouseEvent) => {
    e.stopPropagation();
    onTogglePin();
    close();
  };

  const handleMove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onMove();
    close();
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete();
    close();
  };

  return (
    <div
      ref={containerRef}
      className="keep-swipe-row"
      data-testid="swipeable-note-row"
      data-no-swipe-nav="true"
      data-swipeable="true"
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => {
        if (axis.current === 'horizontal') e.stopPropagation();
      }}
      onPointerDown={pointerDown}
      onPointerMove={pointerMove}
      onPointerUp={pointerUp}
      onPointerCancel={pointerCancel}
      onLostPointerCapture={pointerCancel}
      onKeyDown={event => { if (event.key === 'Escape') close(); }}
    >
      <SwipeActions
        offset={offset}
        isPinned={isPinned}
        onTogglePin={handleTogglePin}
        onMove={handleMove}
        onDelete={handleDelete}
      />
      <div
        className="keep-swipe-content"
        style={{
          transform: `translate3d(${offset}px, 0, 0)`,
          transition: isDragging ? 'none' : undefined,
        }}
        onClickCapture={(e) => {
          if (offsetRef.current !== 0) {
            e.stopPropagation();
            e.preventDefault();
            close();
          }
        }}
      >
        {children}
      </div>
    </div>
  );
}
