import React from 'react';

interface KeyHandlerOptions {
  e: React.KeyboardEvent<HTMLDivElement>;
  editor: HTMLDivElement | null;
  handleInput: () => void;
  insertHTML: (html: string) => void;
}

function handleSpaceShortcut(e: React.KeyboardEvent<HTMLDivElement>, insertHTML: (html: string) => void): boolean {
  if (e.key !== ' ') return false;
  const selection = window.getSelection();
  if (!selection || !selection.anchorNode || selection.rangeCount === 0) return false;
  const node = selection.anchorNode;
  const text = node.textContent || '';
  const offset = selection.anchorOffset;
  const textBefore = text.slice(0, offset);
  if (/^(?:- \[ \]|- \[\]|\[\]|\* \[ \])\s*$/.test(textBefore)) {
    e.preventDefault();
    const range = selection.getRangeAt(0);
    range.setStart(node, 0);
    range.setEnd(node, offset);
    range.deleteContents();
    insertHTML('<div class="keep-todo-item"><span class="keep-todo-checkbox" contenteditable="false"></span><span class="keep-todo-text">&nbsp;</span></div>');
    return true;
  }
  return false;
}

function findParentTodoItem(node: Node | null, editor: HTMLDivElement | null): HTMLElement | null {
  let parent = node?.parentElement;
  while (parent && parent !== editor) {
    if (parent.classList.contains('keep-todo-item')) {
      return parent;
    }
    parent = parent.parentElement;
  }
  return null;
}

function handleEnterShortcut(
  e: React.KeyboardEvent<HTMLDivElement>,
  editor: HTMLDivElement | null,
  handleInput: () => void
): boolean {
  if (e.key !== 'Enter') return false;
  const selection = window.getSelection();
  if (!selection || !selection.anchorNode) return false;
  const todoItem = findParentTodoItem(selection.anchorNode, editor);
  if (!todoItem) return false;

  e.preventDefault();
  const textNode = todoItem.querySelector('.keep-todo-text') as HTMLElement;
  const textVal = textNode?.textContent?.trim() || '';

  if (textVal === '' || textVal === '\u00a0' || textNode?.innerHTML === '<br>') {
    const p = document.createElement('p');
    p.innerHTML = '<br>';
    todoItem.parentNode?.replaceChild(p, todoItem);
    const r = document.createRange();
    r.selectNodeContents(p);
    r.collapse(true);
    selection.removeAllRanges();
    selection.addRange(r);
    handleInput();
    return true;
  }

  const range = selection.getRangeAt(0);
  const afterRange = document.createRange();
  afterRange.setStart(range.startContainer, range.startOffset);
  afterRange.setEndAfter(textNode.lastChild || textNode);

  let frag: DocumentFragment;
  try {
    frag = afterRange.extractContents();
  } catch {
    frag = document.createDocumentFragment();
  }

  if (textNode.textContent?.trim() === '') {
    textNode.innerHTML = '&nbsp;';
  }

  const newTodo = document.createElement('div');
  newTodo.className = 'keep-todo-item';
  const checkbox = document.createElement('span');
  checkbox.className = 'keep-todo-checkbox';
  checkbox.setAttribute('contenteditable', 'false');
  newTodo.appendChild(checkbox);

  const newTextSpan = document.createElement('span');
  newTextSpan.className = 'keep-todo-text';
  if (!frag || frag.textContent?.trim() === '') {
    newTextSpan.innerHTML = '&nbsp;';
  } else {
    newTextSpan.appendChild(frag);
  }
  newTodo.appendChild(newTextSpan);
  todoItem.parentNode?.insertBefore(newTodo, todoItem.nextSibling);

  editor?.focus();
  const r = document.createRange();
  if (newTextSpan.firstChild) {
    r.setStart(newTextSpan.firstChild, 0);
  } else {
    r.selectNodeContents(newTextSpan);
  }
  r.collapse(true);
  selection.removeAllRanges();
  selection.addRange(r);
  handleInput();
  return true;
}

function handleBackspaceShortcut(
  e: React.KeyboardEvent<HTMLDivElement>,
  editor: HTMLDivElement | null,
  handleInput: () => void
): boolean {
  if (e.key !== 'Backspace') return false;
  const selection = window.getSelection();
  if (!selection || !selection.anchorNode || !selection.isCollapsed) return false;
  const todoItem = findParentTodoItem(selection.anchorNode, editor);
  if (!todoItem) return false;

  if (selection.anchorOffset === 0) {
    e.preventDefault();
    const textNode = todoItem.querySelector('.keep-todo-text');
    const p = document.createElement('p');
    p.innerHTML = textNode?.innerHTML || '<br>';
    if (p.innerHTML === '&nbsp;' || p.innerHTML === '') {
      p.innerHTML = '<br>';
    }
    todoItem.parentNode?.replaceChild(p, todoItem);

    const r = document.createRange();
    if (p.firstChild) {
      r.setStart(p.firstChild, 0);
    } else {
      r.selectNodeContents(p);
    }
    r.collapse(true);
    selection.removeAllRanges();
    selection.addRange(r);
    handleInput();
    return true;
  }
  return false;
}

function handleTabShortcut(e: React.KeyboardEvent<HTMLDivElement>, editor: HTMLDivElement | null): boolean {
  if (e.key !== 'Tab') return false;
  const selection = window.getSelection();
  if (!selection || !selection.anchorNode) return false;

  let parent = selection.anchorNode.parentElement;
  while (parent && parent !== editor) {
    if (parent.tagName === 'TD') {
      e.preventDefault();
      const allCells = Array.from(editor?.querySelectorAll('.keep-td') || []);
      const idx = allCells.indexOf(parent);
      if (idx !== -1) {
        const next = allCells[idx + 1] as HTMLElement;
        if (next) {
          next.focus();
          const r = document.createRange();
          r.selectNodeContents(next);
          r.collapse(false);
          selection.removeAllRanges();
          selection.addRange(r);
        }
      }
      return true;
    }
    parent = parent.parentElement;
  }
  return false;
}

export function handleRichEditorKeyShortcuts({
  e,
  editor,
  handleInput,
  insertHTML,
}: KeyHandlerOptions): boolean {
  if (handleSpaceShortcut(e, insertHTML)) return true;
  if (handleEnterShortcut(e, editor, handleInput)) return true;
  if (handleBackspaceShortcut(e, editor, handleInput)) return true;
  if (handleTabShortcut(e, editor)) return true;
  return false;
}
