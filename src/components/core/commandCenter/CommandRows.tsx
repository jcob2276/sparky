import { useRef } from 'react';
import Button from '../../ui/Button';
import type { CommandRowItem } from './commandRowsModel';

export function CommandRows({ items, activeIndex, onActiveIndex }: {
  items: CommandRowItem[];
  activeIndex: number;
  onActiveIndex: (index: number) => void;
}) {
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const handledByPointer = useRef(false);
  return (
    <div role="listbox" aria-label="Wyniki centrum komend" className="space-y-1 p-2">
      {items.map((item, index) => {
        const Icon = item.icon;
        const active = index === activeIndex;
        return (
          <Button
            key={item.id}
            type="button"
            role="option"
            aria-selected={active}
            onPointerEnter={() => onActiveIndex(index)}
            onMouseDown={(event) => event.preventDefault()}
            onPointerDown={(event) => {
              handledByPointer.current = false;
              touchStart.current = event.pointerType === 'touch' ? { x: event.clientX, y: event.clientY } : null;
            }}
            onPointerUp={(event) => {
              const start = touchStart.current;
              touchStart.current = null;
              if (!start || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 10) return;
              handledByPointer.current = true;
              void item.run();
            }}
            onClick={() => {
              if (handledByPointer.current) { handledByPointer.current = false; return; }
              void item.run();
            }}
            variant="ghost"
            className={`group flex h-auto w-full items-center justify-start gap-3 rounded-xl px-3 py-2.5 text-left shadow-none transition-[background-color,transform] duration-[var(--motion-fast)] active:scale-97 ${active ? 'bg-primary/10' : 'hover:bg-surface-3'}`}
          >
            <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${active ? 'bg-primary/15 text-primary' : 'bg-surface-3 text-text-secondary'}`}><Icon size={17} /></span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold text-text-primary">{item.title}</span>
              <span className="block truncate text-xs text-text-muted">{item.subtitle}</span>
            </span>
            {item.shortcut ? <kbd className="rounded-md bg-surface-3 px-2 py-1 text-2xs font-semibold text-text-muted">{item.shortcut}</kbd> : null}
          </Button>
        );
      })}
    </div>
  );
}
