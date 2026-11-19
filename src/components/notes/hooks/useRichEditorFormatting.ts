import { highlightBackground, readHighlightColor } from '../highlightColors';
import { useState, useRef, RefObject } from 'react';
import { ActiveState } from '../richEditorTypes';
import { noteLinkHtml } from '../noteLinks';
import { notify, promptDialog } from '../../../lib/notify';

interface UseRichEditorFormattingOptions {
  editorRef: RefObject<HTMLDivElement | null>;
  handleInput: () => void;
  onTriggerImage: () => void;
}

const INITIAL_ACTIVE_STATE: ActiveState = {
  bold: false,
  italic: false,
  h1: false,
  h2: false,
  list: false,
  numList: false,
  underline: false,
  strikethrough: false,
  blockquote: false,
};

export function useRichEditorFormatting({
  editorRef,
  handleInput,
  onTriggerImage,
}: UseRichEditorFormattingOptions) {
  const [toolbarRange, setToolbarRange] = useState<Range | null>(null);
  const [activeState, setActiveState] = useState<ActiveState>(INITIAL_ACTIVE_STATE);
  const savedSelectionRef = useRef<{ range: Range } | null>(null);

  const handleSelection = () => {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) {
      setToolbarRange(null);
      return;
    }
    const range = selection.getRangeAt(0);
    if (!editorRef.current || !editorRef.current.contains(range.commonAncestorContainer)) {
      setToolbarRange(null);
      return;
    }

    savedSelectionRef.current = { range: range.cloneRange() };
    const block = document.queryCommandValue('formatBlock');
    const next: ActiveState = {
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      h1: block === 'h1',
      h2: block === 'h2',
      list: document.queryCommandState('insertUnorderedList'),
      numList: document.queryCommandState('insertOrderedList'),
      underline: document.queryCommandState('underline'),
      strikethrough: document.queryCommandState('strikeThrough'),
      blockquote: block === 'blockquote',
    };
    // A new object every time would re-render the editor and its bar on each caret move.
    setActiveState(prev => (Object.keys(next) as Array<keyof ActiveState>).every(key => prev[key] === next[key]) ? prev : next);

    if (selection.isCollapsed) {
      setToolbarRange(null);
    } else {
      setToolbarRange(range);
    }
  };

  const restoreSelection = () => {
    editorRef.current?.focus({ preventScroll: true });
    if (savedSelectionRef.current) {
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(savedSelectionRef.current.range);
      }
    }
  };

  const insertHTML = (html: string) => {
    const editor = editorRef.current;
    if (!editor) return;
    if (document.activeElement !== editor && !editor.contains(document.activeElement)) {
      editor.focus({ preventScroll: true });
    }

    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      if (editor.contains(range.commonAncestorContainer)) {
        range.deleteContents();
        try {
          const frag = range.createContextualFragment(html);
          const lastNode = frag.lastChild;
          range.insertNode(frag);
          if (lastNode) {
            const newRange = document.createRange();
            newRange.setStartAfter(lastNode);
            newRange.collapse(true);
            sel.removeAllRanges();
            sel.addRange(newRange);
          }
          handleInput();
          return;
        } catch {
          // fall through to innerHTML append
        }
      }
    }

    editor.innerHTML += html;
    handleInput();
    const newRange = document.createRange();
    newRange.selectNodeContents(editor);
    newRange.collapse(false);
    const s = window.getSelection();
    if (s) {
      s.removeAllRanges();
      s.addRange(newRange);
    }
  };

  const handleAction = (action: string) => {
    if (action === 'bold') {
      restoreSelection();
      document.execCommand('bold', false);
      handleInput();
      handleSelection();
    } else if (action === 'italic') {
      restoreSelection();
      document.execCommand('italic', false);
      handleInput();
      handleSelection();
    } else if (action === 'h1') {
      restoreSelection();
      const isH1 = document.queryCommandValue('formatBlock') === 'h1';
      document.execCommand('formatBlock', false, isH1 ? '<p>' : '<h1>');
      handleInput();
      handleSelection();
    } else if (action === 'h2') {
      restoreSelection();
      const isH2 = document.queryCommandValue('formatBlock') === 'h2';
      document.execCommand('formatBlock', false, isH2 ? '<p>' : '<h2>');
      handleInput();
      handleSelection();
    } else if (action === 'bullet') {
      restoreSelection();
      document.execCommand('insertUnorderedList', false);
      handleInput();
      handleSelection();
    } else if (action === 'number') {
      restoreSelection();
      document.execCommand('insertOrderedList', false);
      handleInput();
      handleSelection();
    } else if (action === 'indent') {
      restoreSelection();
      document.execCommand('indent', false);
      handleInput();
      handleSelection();
    } else if (action === 'outdent') {
      restoreSelection();
      document.execCommand('outdent', false);
      handleInput();
      handleSelection();
    } else if (action === 'undo') {
      restoreSelection();
      document.execCommand('undo', false);
      handleInput();
      handleSelection();
    } else if (action === 'redo') {
      restoreSelection();
      document.execCommand('redo', false);
      handleInput();
      handleSelection();
    } else if (action === 'link') {
      handleSelection();
      const savedRange = savedSelectionRef.current?.range.cloneRange();
      void promptDialog('Adres linku (https://)').then((url) => {
        if (!url?.trim()) return;
        const html = noteLinkHtml(url, savedRange?.toString());
        if (!html) {
          notify('Wpisz poprawny adres HTTP lub HTTPS.', 'error');
          return;
        }
        if (!editorRef.current) return;
        if (savedRange && editorRef.current.contains(savedRange.commonAncestorContainer)) {
          savedSelectionRef.current = { range: savedRange };
        }
        restoreSelection();
        insertHTML(html);
        handleSelection();
      });
    } else if (action === 'clear') {
      restoreSelection();
      document.execCommand('removeFormat', false);
      handleInput();
      handleSelection();
    } else if (action === 'todo') {
      const editor = editorRef.current;
      if (!editor) return;
      editor.focus();
      const sel = window.getSelection();

      const newTodo = document.createElement('div');
      newTodo.className = 'keep-todo-item';
      const checkbox = document.createElement('span');
      checkbox.className = 'keep-todo-checkbox';
      checkbox.setAttribute('contenteditable', 'false');
      newTodo.appendChild(checkbox);
      const textSpan = document.createElement('span');
      textSpan.className = 'keep-todo-text';
      textSpan.innerHTML = '\u00a0';
      newTodo.appendChild(textSpan);

      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        if (editor.contains(range.commonAncestorContainer)) {
          range.deleteContents();
          range.insertNode(newTodo);
        } else {
          editor.appendChild(newTodo);
        }
      } else {
        editor.appendChild(newTodo);
      }

      const r = document.createRange();
      if (textSpan.firstChild) {
        r.setStart(textSpan.firstChild, 0);
      } else {
        r.selectNodeContents(textSpan);
      }
      r.collapse(true);
      sel?.removeAllRanges();
      sel?.addRange(r);
      handleInput();
    } else if (action === 'table') {
      const tableHtml =
        '<table class="keep-table">' +
        '<thead><tr>' +
        '<th class="keep-td keep-th"><br></th>' +
        '<th class="keep-td keep-th"><br></th>' +
        '<th class="keep-td keep-th"><br></th>' +
        '</tr></thead>' +
        '<tbody>' +
        '<tr>' +
        '<td class="keep-td"><br></td>' +
        '<td class="keep-td"><br></td>' +
        '<td class="keep-td"><br></td>' +
        '</tr>' +
        '<tr>' +
        '<td class="keep-td"><br></td>' +
        '<td class="keep-td"><br></td>' +
        '<td class="keep-td"><br></td>' +
        '</tr>' +
        '</tbody></table><p><br></p>';
      insertHTML(tableHtml);
    } else if (action === 'underline') {
      restoreSelection();
      document.execCommand('underline', false);
      handleInput();
      handleSelection();
    } else if (action === 'strikethrough') {
      restoreSelection();
      document.execCommand('strikeThrough', false);
      handleInput();
      handleSelection();
    } else if (action === 'highlight' || action.startsWith('highlight:')) {
      restoreSelection();
      // "highlight:<colour id>" picks a colour; plain "highlight" reuses the last one chosen.
      document.execCommand('hiliteColor', false, highlightBackground(action.split(':')[1] ?? readHighlightColor()));
      handleInput();
      handleSelection();
    } else if (action === 'blockquote') {
      restoreSelection();
      const isBlockquote = document.queryCommandValue('formatBlock') === 'blockquote';
      document.execCommand('formatBlock', false, isBlockquote ? '<p>' : '<blockquote>');
      handleInput();
      handleSelection();
    } else if (action === 'image') {
      onTriggerImage();
    }
  };

  return {
    toolbarRange,
    activeState,
    handleSelection,
    restoreSelection,
    insertHTML,
    handleAction,
  };
}
