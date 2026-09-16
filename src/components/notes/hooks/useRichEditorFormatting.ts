import { useState, useRef, RefObject } from 'react';
import { ActiveState } from '../richEditorTypes';
import { promptDialog } from '../../../lib/notify';

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
    if (!selection || selection.isCollapsed || !selection.rangeCount) {
      setToolbarRange(null);
      return;
    }
    const range = selection.getRangeAt(0);
    if (editorRef.current && editorRef.current.contains(range.commonAncestorContainer)) {
      setToolbarRange(range);
      savedSelectionRef.current = { range: range.cloneRange() };
      setActiveState({
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        h1: document.queryCommandValue('formatBlock') === 'h1',
        h2: document.queryCommandValue('formatBlock') === 'h2',
        list: document.queryCommandState('insertUnorderedList'),
        numList: document.queryCommandState('insertOrderedList'),
        underline: document.queryCommandState('underline'),
        strikethrough: document.queryCommandState('strikeThrough'),
        blockquote: document.queryCommandValue('formatBlock') === 'blockquote',
      });
    } else {
      setToolbarRange(null);
    }
  };

  const restoreSelection = () => {
    if (savedSelectionRef.current) {
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(savedSelectionRef.current.range);
      }
    }
    editorRef.current?.focus();
  };

  const insertHTML = (html: string) => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();

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
      void promptDialog('Wpisz adres URL odnośnika:').then((url) => {
        if (url !== null) {
          restoreSelection();
          document.execCommand('createLink', false, url);
          handleInput();
          handleSelection();
        }
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
        '<th class="keep-td keep-th" contenteditable="true"><br></th>' +
        '<th class="keep-td keep-th" contenteditable="true"><br></th>' +
        '<th class="keep-td keep-th" contenteditable="true"><br></th>' +
        '</tr></thead>' +
        '<tbody>' +
        '<tr>' +
        '<td class="keep-td" contenteditable="true"><br></td>' +
        '<td class="keep-td" contenteditable="true"><br></td>' +
        '<td class="keep-td" contenteditable="true"><br></td>' +
        '</tr>' +
        '<tr>' +
        '<td class="keep-td" contenteditable="true"><br></td>' +
        '<td class="keep-td" contenteditable="true"><br></td>' +
        '<td class="keep-td" contenteditable="true"><br></td>' +
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
    } else if (action === 'highlight') {
      restoreSelection();
      document.execCommand(
        'hiliteColor',
        false,
        getComputedStyle(document.documentElement).getPropertyValue('--color-theme-hex-fef08a').trim()
      );
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
