import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export interface PopoverAnchor {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

interface TodoAnchoredPopoverProps {
  anchor: PopoverAnchor;
  label: string;
  width?: number;
  onClose: () => void;
  /** Where focus goes when the popover closes without the user picking another target. */
  returnFocusTo?: HTMLElement | null;
  children: ReactNode;
}

const FOCUSABLE = 'input, [data-popover-item]';

/** Small portal popover for row actions: flips above when short on space, Esc/outside closes, arrows move. */
export default function TodoAnchoredPopover({ anchor, label, width = 232, onClose, returnFocusTo, children }: TodoAnchoredPopoverProps) {
  const ref = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; });
  const w = Math.min(width, window.innerWidth - 16);
  const left = Math.max(8, Math.min(anchor.right - w, window.innerWidth - w - 8));

  useLayoutEffect(() => {
    const panel = ref.current;
    if (!panel) return;
    const h = panel.offsetHeight;
    const below = anchor.bottom + 4;
    const fitsBelow = below + h <= window.innerHeight - 8;
    if (fitsBelow || anchor.top - h - 4 < 8) {
      panel.style.top = `${fitsBelow ? below : 8}px`;
    } else {
      // Anchored by its bottom edge so it stays glued to the row when the list shrinks (search).
      panel.style.top = 'auto';
      panel.style.bottom = `${window.innerHeight - anchor.top + 4}px`;
    }
    panel.dataset.side = fitsBelow ? 'below' : 'above';
    const target = panel.querySelector<HTMLElement>('[data-autofocus]')
      ?? panel.querySelector<HTMLElement>('[data-current]')
      ?? panel.querySelector<HTMLElement>('[data-popover-item]');
    target?.focus({ preventScroll: true });
  }, [anchor]);

  useEffect(() => {
    const panel = ref.current;
    const closeOutside = (event: PointerEvent) => {
      if (panel && !panel.contains(event.target as Node)) onCloseRef.current();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (!panel || !(event.target instanceof Node) || !panel.contains(event.target)) return;
      const nav = ['ArrowDown', 'ArrowUp', 'Home', 'End', 'Tab'].includes(event.key);
      if (!nav) return;
      const controls = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (controls.length === 0) return;
      const index = controls.indexOf(document.activeElement as HTMLElement);
      const step = event.key === 'ArrowUp' || (event.key === 'Tab' && event.shiftKey) ? -1 : 1;
      let next = (index + step + controls.length) % controls.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = controls.length - 1;
      // A date input keeps its own arrow keys; Tab still cycles.
      if (event.target instanceof HTMLInputElement && event.target.type === 'date' && event.key !== 'Tab') return;
      event.preventDefault();
      controls[next]?.focus();
    };
    document.addEventListener('pointerdown', closeOutside, true);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('pointerdown', closeOutside, true);
      document.removeEventListener('keydown', onKey, true);
      const active = document.activeElement;
      if (active === document.body || (panel && active && panel.contains(active))) returnFocusTo?.focus({ preventScroll: true });
    };
  }, [returnFocusTo]);

  return createPortal(
    <div ref={ref} role="dialog" aria-label={label} data-side="below" onClick={(e) => e.stopPropagation()}
      style={{ left, top: anchor.bottom + 4, width: w }}
      className="todo-pop fixed rounded-xl border border-border-custom bg-surface p-1.5 text-sm text-text-primary shadow-xl">
      {children}
    </div>,
    document.body,
  );
}
