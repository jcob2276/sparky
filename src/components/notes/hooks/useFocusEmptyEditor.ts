import { useEffect, useRef } from 'react';

/** Nowa (pusta) notatka od razu dostaje kursor, żeby nie trzeba było dotykać drugi raz. */
export function useFocusEmptyEditor(noteId: string) {
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const editorEl = rootRef.current?.querySelector<HTMLElement>('.keep-rich-editor');
    const titleEl = rootRef.current?.querySelector<HTMLInputElement>('.keep-note-title');
    if (editorEl && !editorEl.textContent?.trim() && !titleEl?.value.trim()) (titleEl ?? editorEl).focus({ preventScroll: true });
  }, [noteId]);
  return rootRef;
}
