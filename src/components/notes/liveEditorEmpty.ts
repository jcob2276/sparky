/**
 * Czy otwarty edytor jest pusty — czytane z żywego DOM, a nie ze stanu listy,
 * bo autosave potrafi być o kilka znaków do tyłu (nie wolno skasować notatki z niezapisanym tekstem).
 */
export function isLiveEditorEmpty(): boolean {
  const editor = document.querySelector<HTMLElement>('.keep-rich-editor');
  if (!editor) return false;
  if (editor.querySelector('img, table, .keep-todo-item, a')) return false;
  return !(editor.textContent ?? '').trim();
}
