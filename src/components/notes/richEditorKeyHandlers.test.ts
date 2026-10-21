import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type React from 'react';
import { handleRichEditorKeyShortcuts } from './richEditorKeyHandlers';

function setup(text: string) {
  document.body.innerHTML = `<div id="ed"><p>${text}</p></div>`;
  const editor = document.getElementById('ed') as HTMLDivElement;
  const node = editor.querySelector('p')!.firstChild!;
  const range = document.createRange();
  range.setStart(node, text.length);
  range.collapse(true);
  const selection = window.getSelection()!;
  selection.removeAllRanges();
  selection.addRange(range);
  return editor;
}

function pressSpace(editor: HTMLDivElement) {
  const preventDefault = vi.fn();
  const handled = handleRichEditorKeyShortcuts({
    e: { key: ' ', preventDefault, currentTarget: editor } as unknown as React.KeyboardEvent<HTMLDivElement>,
    editor,
    handleInput: vi.fn(),
    insertHTML: vi.fn(),
  });
  return { handled, preventDefault };
}

describe('list shortcuts on Space', () => {
  const execCommand = vi.fn();

  beforeEach(() => {
    execCommand.mockReset();
    (document as unknown as { execCommand: typeof execCommand }).execCommand = execCommand;
  });
  afterEach(() => { document.body.innerHTML = ''; });

  it.each([['-'], ['*']])('"%s " starts a bullet list and removes the marker', marker => {
    const editor = setup(marker);
    const { handled, preventDefault } = pressSpace(editor);
    expect(handled).toBe(true);
    expect(preventDefault).toHaveBeenCalled();
    expect(execCommand).toHaveBeenCalledWith('insertUnorderedList');
    expect(editor.textContent).not.toContain(marker);
  });

  it.each([['1.'], ['1)']])('"%s " starts a numbered list', marker => {
    const editor = setup(marker);
    expect(pressSpace(editor).handled).toBe(true);
    expect(execCommand).toHaveBeenCalledWith('insertOrderedList');
  });

  it('does not trigger in the middle of a sentence', () => {
    const editor = setup('a -');
    expect(pressSpace(editor).handled).toBe(false);
    expect(execCommand).not.toHaveBeenCalled();
    expect(editor.textContent).toBe('a -');
  });
});
