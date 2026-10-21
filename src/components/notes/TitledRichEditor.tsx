/**
 * @component TitledRichEditor
 * @role Osobne pole tytułu nad edytorem treści; zapisuje się jako pierwsza linia (<h1>) tej samej treści.
 * @composes RichEditor
 * @usedBy InlineEditor
 */
import { useEffect, useRef, useState, type ComponentProps } from 'react';
import RichEditor from './RichEditor';
import { ControlInput } from '../ui/ControlPrimitives';
import { composeTitle, splitTitle, type NoteParts } from './noteTitle';

type TitledRichEditorProps = Omit<ComponentProps<typeof RichEditor>, 'value' | 'onChange'> & {
  value: string;
  onChange: (html: string) => void;
};

export default function TitledRichEditor({ value, onChange, ...editorProps }: TitledRichEditorProps) {
  const [parts, setParts] = useState<NoteParts>(() => splitTitle(value));
  const lastEmitted = useRef(value);
  const rootRef = useRef<HTMLDivElement>(null);

  // Zmiana treści z zewnątrz (np. wstawiony załącznik) — przelicz podział; własne zmiany pomijamy,
  // żeby wyczyszczony tytuł nie "łapał" pierwszej linii treści.
  useEffect(() => {
    if (value === lastEmitted.current) return;
    lastEmitted.current = value;
    setParts(splitTitle(value));
  }, [value]);

  const emit = (next: NoteParts) => {
    setParts(next);
    const full = composeTitle(next.title, next.body);
    lastEmitted.current = full;
    onChange(full);
  };

  const focusBody = () => {
    const editor = rootRef.current?.querySelector<HTMLElement>('.keep-rich-editor');
    if (!editor) return;
    editor.focus();
    const range = document.createRange();
    range.setStart(editor, 0);
    range.collapse(true);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  };

  return (
    <div ref={rootRef} className="flex w-full flex-1 flex-col gap-1">
      <ControlInput
        type="text"
        value={parts.title}
        onChange={event => emit({ ...parts, title: event.target.value })}
        onKeyDown={event => {
          if (event.key === 'Enter') {
            event.preventDefault();
            focusBody();
          }
        }}
        placeholder="Tytuł"
        aria-label="Tytuł notatki"
        enterKeyHint="next"
        autoComplete="off"
        className="keep-note-title min-h-0 w-full rounded-none bg-transparent px-0 text-xl font-bold tracking-tight placeholder:text-text-muted/60 focus-visible:!shadow-none"
      />
      <RichEditor {...editorProps} value={parts.body} onChange={body => emit({ title: parts.title, body })} />
    </div>
  );
}
