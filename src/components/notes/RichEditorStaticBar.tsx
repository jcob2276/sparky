/**
 * @component RichEditorStaticBar
 * @role Stały pasek narzędzi edytora, wydzielony z RichEditor.tsx pod limit 300 linii.
 * @usedBy RichEditor
 */
import { Pressable } from '../ui/ControlPrimitives';
import { useRef, useEffect, useState, type ReactNode } from 'react';
import RichEditorFormatPopover, { type FormatState } from './RichEditorFormatPopover';
import { CheckSquare, Table2, Image, Indent, Outdent, Undo, Redo, Link2 } from 'lucide-react';

interface Props {
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

export default function RichEditorStaticBar({ activeState, showStaticBar, onAction }: Props) {
  const staticBarRef = useRef<HTMLDivElement>(null);
  const [hasMore, setHasMore] = useState(false);
  const [formatAnchor, setFormatAnchor] = useState<DOMRect | null>(null);

  // Cień przy prawej krawędzi pokazuje, że pasek da się przewinąć.
  const updateHasMore = () => {
    const bar = staticBarRef.current;
    if (bar) setHasMore(bar.scrollLeft + bar.clientWidth < bar.scrollWidth - 4);
  };

  // Pin formatting bar above keyboard on mobile (iOS visualViewport API)
  useEffect(() => {
    if (!showStaticBar) return;
    updateHasMore();
    const vv = window.visualViewport;
    if (!vv) return;
    const reposition = () => {
      const bar = staticBarRef.current;
      if (!bar) return;
      const keyboardH = window.innerHeight - (vv.offsetTop + vv.height);
      if (keyboardH > 50) {
        bar.style.cssText = `position:fixed;bottom:${keyboardH}px;left:0;right:0;z-index:99999;margin:0;border-radius:0;width:100%;padding:0 12px;`;
        bar.classList.add('kb-open');
      } else {
        bar.style.cssText = '';
        bar.classList.remove('kb-open');
      }
      updateHasMore();
    };
    vv.addEventListener('resize', reposition);
    vv.addEventListener('scroll', reposition);
    return () => {
      vv.removeEventListener('resize', reposition);
      vv.removeEventListener('scroll', reposition);
    };
  }, [showStaticBar]);

  if (!showStaticBar) return null;

  return (
    <div className={`keep-static-bar ${hasMore ? 'has-more' : ''}`} ref={staticBarRef} onScroll={updateHasMore}>
      <Pressable
        type="button"
        data-format-trigger=""
        onMouseDown={e => { e.preventDefault(); const rect = e.currentTarget.getBoundingClientRect(); setFormatAnchor(current => (current ? null : rect)); }}
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
              onMouseDown={e => { e.preventDefault(); onAction(action); }}
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
}
