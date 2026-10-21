/**
 * @component RichEditorStaticBar
 * @role Stały pasek narzędzi edytora, wydzielony z RichEditor.tsx pod limit 300 linii.
 * @usedBy RichEditor
 */
import { Pressable } from '../ui/ControlPrimitives';
import { useRef, useEffect, useState, type ReactNode } from 'react';
import {
  Underline, Strikethrough, Quote, CheckSquare, Table2, Image, Highlighter,
  Heading2, List, ListOrdered, Indent, Outdent, Undo, Redo, Link2, Eraser,
} from 'lucide-react';

interface ActiveState {
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
  activeState: ActiveState;
  showStaticBar: boolean;
  onAction: (action: string) => void;
}

const LABEL_STYLE = { fontSize: 'var(--ds-inline-style-15)', fontFamily: 'var(--ds-inline-style-georgia-serif)', lineHeight: 'var(--ds-inline-style-1)' } as const;

interface BarButton {
  action: string;
  title: string;
  icon: ReactNode;
  active?: keyof ActiveState;
}

const ICON = { size: 20, strokeWidth: 1.5 } as const;
const ICON_SM = { size: 18, strokeWidth: 2 } as const;

// Kolejność = priorytet na wąskim ekranie: najczęstsze narzędzia są widoczne bez przewijania.
const GROUPS: BarButton[][] = [
  [
    { action: 'todo', title: 'Lista zadań', icon: <CheckSquare {...ICON} /> },
    { action: 'bullet', title: 'Lista punktowana', icon: <List {...ICON} />, active: 'list' },
    { action: 'number', title: 'Lista numerowana', icon: <ListOrdered {...ICON} />, active: 'numList' },
    { action: 'bold', title: 'Pogrubienie', active: 'bold', icon: <span style={{ ...LABEL_STYLE, fontWeight: 'var(--ds-inline-style-800)' }}>B</span> },
    { action: 'italic', title: 'Kursywa', active: 'italic', icon: <span style={{ ...LABEL_STYLE, fontStyle: 'italic', fontWeight: 'var(--ds-inline-style-600)' }}>I</span> },
    { action: 'h1', title: 'Nagłówek H1', active: 'h1', icon: <span style={{ fontWeight: 'var(--ds-inline-style-800)', fontSize: 'var(--ds-inline-style-11)', letterSpacing: 'var(--ds-inline-style-0-02em)', lineHeight: 'var(--ds-inline-style-1)' }}>H1</span> },
    { action: 'undo', title: 'Cofnij', icon: <Undo {...ICON_SM} /> },
    { action: 'redo', title: 'Ponów', icon: <Redo {...ICON_SM} /> },
  ],
  [
    { action: 'underline', title: 'Podkreślenie', icon: <Underline {...ICON_SM} />, active: 'underline' },
    { action: 'strikethrough', title: 'Przekreślenie', icon: <Strikethrough {...ICON_SM} />, active: 'strikethrough' },
    { action: 'h2', title: 'Nagłówek H2', icon: <Heading2 {...ICON_SM} />, active: 'h2' },
    { action: 'blockquote', title: 'Cytat', icon: <Quote {...ICON_SM} />, active: 'blockquote' },
    { action: 'highlight', title: 'Zakreślacz', icon: <Highlighter {...ICON_SM} /> },
    { action: 'clear', title: 'Wyczyść formatowanie', icon: <Eraser {...ICON_SM} /> },
  ],
  [
    { action: 'link', title: 'Dodaj link', icon: <Link2 {...ICON_SM} /> },
    { action: 'image', title: 'Dodaj zdjęcie', icon: <Image {...ICON} /> },
    { action: 'table', title: 'Tabela', icon: <Table2 {...ICON} /> },
    { action: 'outdent', title: 'Zmniejsz wcięcie', icon: <Outdent {...ICON} /> },
    { action: 'indent', title: 'Zwiększ wcięcie', icon: <Indent {...ICON} /> },
  ],
];

export default function RichEditorStaticBar({ activeState, showStaticBar, onAction }: Props) {
  const staticBarRef = useRef<HTMLDivElement>(null);
  const [hasMore, setHasMore] = useState(false);

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
    </div>
  );
}
