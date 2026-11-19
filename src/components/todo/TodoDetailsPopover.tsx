import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { Pressable } from '../ui/ControlPrimitives';
import { createPortal } from 'react-dom';
import type { PopoverAnchor } from './TodoAnchoredPopover';

interface Props {
  /** The row the window grows from; measured when the window mounts and on resize. */
  anchorRef: RefObject<HTMLElement | null>;
  label: string;
  onClose: () => void;
  children: ReactNode;
}

const WIDTH = 372;
const GAP = 12;
const MARGIN = 8;
const WIDE_MIN = 768;

interface Placement {
  mode: 'popover' | 'sheet';
  left: number;
  top: number;
  /** Arrow offset along the popover edge it grows from (vertical for left/right sides, horizontal for above/below). */
  arrow: number;
  side: 'left' | 'right' | 'below' | 'above';
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));

function place(anchor: PopoverAnchor, height: number): Placement {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  if (vw < WIDE_MIN) return { mode: 'sheet', left: 0, top: 0, arrow: 0, side: 'right' };
  const center = (anchor.top + anchor.bottom) / 2;
  if (anchor.right + GAP + WIDTH <= vw - MARGIN) {
    const top = clamp(center - 40, MARGIN, Math.max(MARGIN, vh - height - MARGIN));
    return { mode: 'popover', left: anchor.right + GAP, top, arrow: clamp(center - top, 20, Math.max(20, height - 20)), side: 'right' };
  }
  if (anchor.left - GAP - WIDTH >= MARGIN) {
    const top = clamp(center - 40, MARGIN, Math.max(MARGIN, vh - height - MARGIN));
    return { mode: 'popover', left: anchor.left - GAP - WIDTH, top, arrow: clamp(center - top, 20, Math.max(20, height - 20)), side: 'left' };
  }
  // A full-width list leaves no room beside the row: open under it (or above), pointing at the info button.
  const left = clamp(anchor.right - WIDTH - 4, MARGIN, vw - WIDTH - MARGIN);
  const arrow = clamp(anchor.right - 30 - left, 28, WIDTH - 28);
  if (anchor.bottom + GAP + height <= vh - MARGIN) return { mode: 'popover', left, top: anchor.bottom + GAP, arrow, side: 'below' };
  if (anchor.top - GAP - height >= MARGIN) return { mode: 'popover', left, top: anchor.top - GAP - height, arrow, side: 'above' };
  return { mode: 'popover', left, top: clamp(vh - height - MARGIN, MARGIN, vh), arrow, side: 'below' };
}

/** Liquid-glass details window: a popover with an arrow to the row on wide screens, a bottom sheet on phones. */
function blurPanelField(panel: HTMLElement | null) {
  const active = document.activeElement;
  if (active instanceof HTMLElement && panel?.contains(active)) active.blur();
}

export default function TodoDetailsPopover({ anchorRef, label, onClose, children }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; });
  const [placement, setPlacement] = useState<Placement>({ mode: window.innerWidth < WIDE_MIN ? 'sheet' : 'popover', left: -9999, top: 0, arrow: 20, side: 'right' });

  useLayoutEffect(() => {
    const update = () => {
      const rect = anchorRef.current?.getBoundingClientRect();
      if (!rect) return;
      setPlacement(place({ top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right }, ref.current?.offsetHeight ?? 0));
    };
    update();
    // A card that remounts already expanded (e.g. the task moved to another list) attaches its ref after this effect: measure again next frame.
    const frame = requestAnimationFrame(update);
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [anchorRef]);

  useEffect(() => {
    const panel = ref.current;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (document.querySelector('[aria-modal="true"]')) return;
      event.preventDefault();
      event.stopPropagation();
      blurPanelField(panel);
      onCloseRef.current();
    };
    document.addEventListener('keydown', onKey, true);
    const returnFocusTo = anchorRef.current?.closest<HTMLElement>('[data-todo-id]') ?? null;
    return () => {
      document.removeEventListener('keydown', onKey, true);
      const active = document.activeElement;
      if (active === document.body || (panel && active && panel.contains(active))) returnFocusTo?.focus({ preventScroll: true });
    };
  }, [anchorRef]);

  const sheet = placement.mode === 'sheet';
  return createPortal(
    <>
      <Pressable type="button" tabIndex={-1} aria-label="Zamknij edycję zadania"
        className={`ios-glass-scrim todo-details-backdrop ${sheet ? '' : 'todo-details-backdrop-clear'}`}
        onClick={(event) => {
          event.stopPropagation();
          blurPanelField(ref.current);
          onClose();
        }}
      />
      <div ref={ref} role="dialog" aria-label={label} data-mode={placement.mode} data-side={placement.side}
        data-no-view-swipe
        onClick={(event) => event.stopPropagation()}
        style={sheet ? undefined : { left: placement.left, top: placement.top, width: Math.min(WIDTH, window.innerWidth - 2 * MARGIN), ['--arrow' as string]: `${placement.arrow}px` }}
        className="ios-glass ios-glass-pop todo-details-panel fixed">
        <div className="ios-glass-scroll">{children}</div>
      </div>
    </>,
    document.body,
  );
}
