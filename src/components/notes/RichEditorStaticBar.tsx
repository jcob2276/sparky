import { useIsPresent } from 'framer-motion';
/**
 * @component RichEditorStaticBar
 * @role Stały pasek narzędzi edytora, wydzielony z RichEditor.tsx pod limit 300 linii.
 * @usedBy RichEditor
 */
import { createPortal } from 'react-dom';
import { Pressable } from '../ui/ControlPrimitives';
import { useRef, useEffect, useState, type ReactNode } from 'react';
import RichEditorFormatPopover, { type FormatState } from './RichEditorFormatPopover';
import { CheckSquare, Table2, Image, Indent, Outdent, Undo, Redo, Link2 } from 'lucide-react';

interface Props {
  docked: boolean;
  activeState: FormatState;
  showStaticBar: boolean;
  onAction: (action: string) => void;
}

const LABEL_STYLE = { fontSize: 'var(--ds-inline-style-15)', fontFamily: 'var(--ds-inline-style-georgia-serif)', lineHeight: 'var(--ds-inline-style-1)' } as const;

interface BarButton {
  action: string;
  title: string;
  icon: ReactNode;
  active?: keyof FormatState;
}

const ICON = { size: 20, strokeWidth: 1.5 } as const;
const ICON_SM = { size: 18, strokeWidth: 2 } as const;

// Jak w Apple Notes: krótki pasek, a style tekstu siedzą w popoverze pod "Aa".
const GROUPS: BarButton[][] = [
  [
    { action: 'todo', title: 'Lista zadań', icon: <CheckSquare {...ICON} /> },
    { action: 'table', title: 'Tabela', icon: <Table2 {...ICON} /> },
    { action: 'image', title: 'Dodaj zdjęcie', icon: <Image {...ICON} /> },
    { action: 'link', title: 'Dodaj link', icon: <Link2 {...ICON_SM} /> },
  ],
  [
    { action: 'outdent', title: 'Zmniejsz wcięcie', icon: <Outdent {...ICON} /> },
    { action: 'indent', title: 'Zwiększ wcięcie', icon: <Indent {...ICON} /> },
  ],
  [
    { action: 'undo', title: 'Cofnij', icon: <Undo {...ICON_SM} /> },
    { action: 'redo', title: 'Ponów', icon: <Redo {...ICON_SM} /> },
  ],
];

export default function RichEditorStaticBar({ activeState, showStaticBar, onAction, docked }: Props) {
  const isPresent = useIsPresent();
  const originRef = useRef<HTMLSpanElement>(null);
  const staticBarRef = useRef<HTMLDivElement>(null);
  const [viewportBounds, setViewportBounds] = useState({ bottom: 0, left: 0, right: 0 });
  const [hasMore, setHasMore] = useState(false);
  const [formatAnchor, setFormatAnchor] = useState<DOMRect | null>(null);

  // Cień przy prawej krawędzi pokazuje, że pasek da się przewinąć.
  const updateHasMore = () => {
    const bar = staticBarRef.current;
    if (bar) setHasMore(bar.scrollLeft + bar.clientWidth < bar.scrollWidth - 4);
  };

  useEffect(() => {
    if (!showStaticBar || !docked) return;
    const viewport = window.visualViewport;
    if (!viewport) return;
    let frame = 0;
    const reposition = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const layout = document.documentElement;
        const bottom = Math.max(0, layout.clientHeight - viewport.height - viewport.offsetTop);
        setViewportBounds({
          bottom,
          left: Math.max(0, viewport.offsetLeft),
          right: Math.max(0, layout.clientWidth - viewport.width - viewport.offsetLeft),
        });
      });
    };
    reposition();
    viewport.addEventListener('resize', reposition);
    window.addEventListener('resize', reposition);
    return () => {
      cancelAnimationFrame(frame);
      viewport.removeEventListener('resize', reposition);
      window.removeEventListener('resize', reposition);
    };
  }, [showStaticBar, docked]);

  useEffect(() => {
    const bar = staticBarRef.current;
    if (!showStaticBar || !bar) return;
    const observer = new ResizeObserver(updateHasMore);
    observer.observe(bar);
    return () => observer.disconnect();
  }, [showStaticBar, docked]);

  if (!showStaticBar || !isPresent) return null;

  const bar = (
    <div
      className={`keep-static-bar ${hasMore ? 'has-more' : ''} ${docked ? 'keep-static-bar-docked' : ''}`}
      ref={staticBarRef}
      onScroll={updateHasMore}
      style={docked ? {
        ...viewportBounds,
        bottom: viewportBounds.bottom || undefined,
      } : undefined}
    >
      <Pressable
        type="button"
        data-format-trigger=""
        onMouseDown={e => e.preventDefault()}
        onClick={e => { const rect = e.currentTarget.getBoundingClientRect(); setFormatAnchor(current => (current ? null : rect)); }}
        className={`keep-static-btn ${formatAnchor ? 'active' : ''}`}
        title="Format tekstu"
        aria-label="Format tekstu"
        aria-haspopup="dialog"
        aria-expanded={Boolean(formatAnchor)}
      >
        <span style={LABEL_STYLE}>Aa</span>
      </Pressable>
      <div className="keep-static-sep" />
      {GROUPS.map((group, index) => (
        <div key={index} className="contents">
          {index > 0 && <div className="keep-static-sep" />}
          {group.map(({ action, title, icon, active }) => (
            <Pressable
              key={action}
              type="button"
              onMouseDown={e => e.preventDefault()}
              onClick={() => onAction(action)}
              className={`keep-static-btn ${active && activeState[active] ? 'active' : ''}`}
              title={title}
              aria-label={title}
            >
              {icon}
            </Pressable>
          ))}
        </div>
      ))}
      {formatAnchor && <RichEditorFormatPopover anchor={formatAnchor} state={activeState} onAction={onAction} onClose={() => setFormatAnchor(null)} />}
    </div>
  );
  return docked ? <><span ref={originRef} hidden />{createPortal(bar, document.body)}</> : bar;
}
