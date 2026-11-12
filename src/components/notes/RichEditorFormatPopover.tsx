import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Check, Highlighter } from 'lucide-react';
import { Pressable } from '../ui/ControlPrimitives';
import { HIGHLIGHT_COLORS, readHighlightColor, saveHighlightColor } from './highlightColors';

export interface FormatState {
  bold: boolean;
  italic: boolean;
  h1: boolean;
  h2: boolean;
  list: boolean;
  numList: boolean;
  underline: boolean;
  strikethrough: boolean;
  blockquote: boolean;
}

interface Props {
  /** The "Aa" button the popover grows from. */
  anchor: DOMRect;
  state: FormatState;
  onAction: (action: string) => void;
  onClose: () => void;
}

const WIDTH = 276;
const GAP = 12;
const MARGIN = 8;

interface Item { action: string; label: ReactNode; active?: boolean }

/** Apple Notes-style "Aa" popover in liquid glass: inline marks on top, paragraph styles below. */
export default function RichEditorFormatPopover({ anchor, state, onAction, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; });
  const [highlight, setHighlight] = useState(readHighlightColor);
  const [colorsOpen, setColorsOpen] = useState(false);
  const [place, setPlace] = useState<{ left: number; top: number; side: 'above' | 'below'; arrow: number }>({
    left: -9999, top: 0, side: 'above', arrow: WIDTH / 2,
  });

  useLayoutEffect(() => {
    const h = ref.current?.offsetHeight ?? 0;
    const left = Math.max(MARGIN, Math.min(anchor.left + anchor.width / 2 - WIDTH / 2, window.innerWidth - WIDTH - MARGIN));
    const above = anchor.top - GAP - h >= MARGIN;
    setPlace({
      left,
      top: above ? anchor.top - GAP - h : anchor.bottom + GAP,
      side: above ? 'above' : 'below',
      arrow: Math.max(28, Math.min(anchor.left + anchor.width / 2 - left, WIDTH - 28)),
    });
  }, [anchor]);

  useEffect(() => {
    const outside = (event: PointerEvent) => {
      const target = event.target as Element | null;
      if (target?.closest('[data-format-trigger]')) return; // the trigger toggles it itself
      if (ref.current && !ref.current.contains(target as Node)) onCloseRef.current();
    };
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') onCloseRef.current(); };
    document.addEventListener('pointerdown', outside, true);
    document.addEventListener('keydown', key, true);
    return () => { document.removeEventListener('pointerdown', outside, true); document.removeEventListener('keydown', key, true); };
  }, []);

  // Keeping the editor selection means every control reacts on mousedown and never takes focus.
  const press = (action: string, close: boolean) => (event: React.MouseEvent) => {
    event.preventDefault();
    onAction(action);
    if (close) onClose();
  };
  const marks: Array<{ action: string; label: ReactNode; active: boolean; title: string }> = [
    { action: 'bold', label: <b>B</b>, active: state.bold, title: 'Pogrubienie' },
    { action: 'italic', label: <i>I</i>, active: state.italic, title: 'Kursywa' },
    { action: 'underline', label: <u>U</u>, active: state.underline, title: 'Podkreślenie' },
    { action: 'strikethrough', label: <s>S</s>, active: state.strikethrough, title: 'Przekreślenie' },
    { action: 'highlight', label: <Highlighter size={17} aria-hidden="true" />, active: false, title: 'Zakreślacz' },
  ];
  // Body text is the heading toggled off, so it reuses whichever heading is active.
  const bodyAction = state.h1 ? 'h1' : state.h2 ? 'h2' : null;
  const styles: Item[] = [
    { action: 'h1', label: <span className="text-2xl font-bold tracking-tight">Tytuł</span>, active: state.h1 },
    { action: 'h2', label: <span className="text-xl font-bold tracking-tight">Nagłówek</span>, active: state.h2 },
    { action: bodyAction ?? 'noop', label: <span className="text-base">Treść</span>, active: !state.h1 && !state.h2 },
    { action: 'bullet', label: <span className="text-base">• Lista punktowana</span>, active: state.list },
    { action: 'number', label: <span className="text-base">1. Lista numerowana</span>, active: state.numList },
    { action: 'todo', label: <span className="text-base">☐ Lista zadań</span> },
    { action: 'blockquote', label: <span className="text-base">❘ Cytat blokowy</span>, active: state.blockquote },
  ];

  return createPortal(
    <div ref={ref} role="dialog" aria-label="Format tekstu" data-mode="popover" data-side={place.side}
      style={{ left: place.left, top: place.top, width: WIDTH, ['--arrow' as string]: `${place.arrow}px`, transformOrigin: `${place.arrow}px ${place.side === 'above' ? 'bottom' : 'top'}` }}
      className="ios-glass ios-glass-pop fixed !rounded-3xl py-2">
      <div className="flex items-center justify-around px-2 pb-1">
        {marks.map((mark) => (
          <Pressable key={mark.action} type="button" haptic="none" title={mark.title} aria-label={mark.title} aria-pressed={mark.active}
            onMouseDown={press(mark.action, false)}
            className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg text-text-primary ${mark.active ? 'bg-text-primary/[0.14]' : 'hover:bg-text-primary/[0.07]'}`}>
            {mark.label}
          </Pressable>
        ))}
        <Pressable type="button" haptic="none" title="Kolor zakreślacza" aria-label="Kolor zakreślacza" aria-haspopup="menu" aria-expanded={colorsOpen}
          onMouseDown={(event) => { event.preventDefault(); setColorsOpen((open) => !open); }}
          className={`flex h-10 w-8 items-center justify-center rounded-xl ${colorsOpen ? 'bg-text-primary/[0.14]' : 'hover:bg-text-primary/[0.07]'}`}>
          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: `var(${(HIGHLIGHT_COLORS.find((c) => c.id === highlight) ?? HIGHLIGHT_COLORS[2]).swatch})` }} />
        </Pressable>
      </div>
      {colorsOpen && (
        <div role="menu" aria-label="Kolor zakreślacza" className="ios-glass absolute right-3 top-14 w-52 !rounded-2xl py-1.5">
          {HIGHLIGHT_COLORS.map((color) => (
            <Pressable key={color.id} type="button" haptic="none" role="menuitemradio" aria-checked={color.id === highlight}
              onMouseDown={(event) => {
                event.preventDefault();
                saveHighlightColor(color.id);
                setHighlight(color.id);
                setColorsOpen(false);
                onAction(`highlight:${color.id}`);
              }}
              className="flex min-h-11 w-full items-center gap-3 px-4 text-left text-sm text-text-primary hover:bg-text-primary/[0.06]">
              <span className="h-3.5 w-3.5 shrink-0 rounded-full" style={{ backgroundColor: `var(${color.swatch})` }} />
              <span className="flex-1">{color.label}</span>
              {color.id === highlight ? <Check size={15} className="text-primary" aria-hidden="true" /> : null}
            </Pressable>
          ))}
        </div>
      )}
      <div className="ios-glass-divider" role="separator" />
      <div role="menu">
        {styles.map((style) => (
          <Pressable key={style.action} type="button" haptic="none" role="menuitemradio" aria-checked={Boolean(style.active)} disabled={style.action === 'noop'}
            onMouseDown={press(style.action, true)}
            className="flex min-h-11 w-full items-center gap-2 px-4 text-left text-text-primary hover:bg-text-primary/[0.06] disabled:hover:bg-transparent">
            <span className="flex w-4 shrink-0 justify-center text-primary">{style.active ? <Check size={15} aria-hidden="true" /> : null}</span>
            {style.label}
          </Pressable>
        ))}
      </div>
    </div>,
    document.body,
  );
}
