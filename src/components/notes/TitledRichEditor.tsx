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
  const titleInputRef = useRef<HTMLInputElement>(null);

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
    if (editor.childNodes.length > 0) {
      range.setStart(editor.childNodes[0], 0);
    } else {
      range.setStart(editor, 0);
    }
    range.collapse(true);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  };

  const focusTitle = () => {
    const input = titleInputRef.current;
    if (!input) return;
    input.focus();
    const len = input.value.length;
    input.setSelectionRange(len, len);
  };

  return (
    <div ref={rootRef} className="flex w-full flex-1 flex-col gap-1.5">
      <ControlInput
        ref={titleInputRef}
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
        className="keep-note-title min-h-0 w-full rounded-none bg-transparent px-0 text-2xl sm:text-3xl font-display font-bold tracking-tight text-text-primary placeholder:text-text-muted/40 focus-visible:!shadow-none focus:outline-none border-none py-1 transition-colors"
      />
      <RichEditor
        {...editorProps}
        value={parts.body}
        onChange={body => emit({ title: parts.title, body })}
        onBackspaceAtStart={focusTitle}
      />
    </div>
  );
}
