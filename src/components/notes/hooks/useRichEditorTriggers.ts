import { useState, RefObject } from 'react';
import { SLASH_COMMANDS } from '../richEditorCommands';
import { SlashCommand, WikiNoteItem } from '../richEditorTypes';
import { notify } from '../../../lib/notify';

interface UseRichEditorTriggersOptions {
  editorRef: RefObject<HTMLDivElement | null>;
  allNotes?: Array<{ id: string; title: string }>;
  handleAction: (action: string) => void;
  handleInput: () => void;
  insertHTML: (html: string) => void;
}

export function useRichEditorTriggers({
  editorRef,
  allNotes = [],
  handleAction,
  handleInput,
  insertHTML,
}: UseRichEditorTriggersOptions) {
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [showWikiMenu, setShowWikiMenu] = useState(false);
  const [menuCoords, setMenuCoords] = useState<{ top: number; left: number } | null>(null);
  const [slashSearchQuery, setSlashSearchQuery] = useState('');
  const [wikiSearchQuery, setWikiSearchQuery] = useState('');
  const [selectedMenuIndex, setSelectedMenuIndex] = useState(0);

  const filteredSlashCommands = SLASH_COMMANDS.filter((cmd) =>
    cmd.label.toLowerCase().includes(slashSearchQuery.toLowerCase())
  );

  const filteredWikiNotes = (allNotes || [])
    .filter((n) => n.title.toLowerCase().includes(wikiSearchQuery.toLowerCase()))
    .slice(0, 8);

  const checkTriggers = () => {
    const selection = window.getSelection();
    if (!selection || !selection.anchorNode || !selection.rangeCount) return;
    const node = selection.anchorNode;
    const text = node.textContent || '';
    const offset = selection.anchorOffset;
    const textBefore = text.slice(0, offset);

    // 1. Check for WikiLink trigger "[["
    const wikiIdx = textBefore.lastIndexOf('[[');
    if (wikiIdx !== -1 && wikiIdx >= textBefore.lastIndexOf(']]')) {
      const query = textBefore.slice(wikiIdx + 2);
      if (!showWikiMenu || wikiSearchQuery !== query) {
        setWikiSearchQuery(query);
        setSelectedMenuIndex(0);
      }
      setShowWikiMenu(true);
      setShowSlashMenu(false);

      const range = selection.getRangeAt(0).cloneRange();
      try {
        range.setStart(node, wikiIdx);
        range.setEnd(node, offset);
        const rects = range.getClientRects();
        if (rects.length > 0 && editorRef.current) {
          const parentRect = editorRef.current.getBoundingClientRect();
          setMenuCoords({
            top: rects[0].bottom - parentRect.top + editorRef.current.scrollTop + 6,
            left: rects[0].left - parentRect.left,
          });
        }
      } catch (e: unknown) {
        console.error('[Action Error]', e);
        notify(e instanceof Error ? e.message : 'Wystąpił błąd', 'error');
      }
      return;
    } else {
      setShowWikiMenu(false);
    }

    // 2. Check for Slash Command trigger "/"
    const slashIdx = textBefore.lastIndexOf('/');
    if (
      slashIdx !== -1 &&
      (slashIdx === 0 || textBefore.charAt(slashIdx - 1) === ' ' || textBefore.charAt(slashIdx - 1) === '\u00a0')
    ) {
      const query = textBefore.slice(slashIdx + 1);
      if (!query.includes(' ')) {
        if (!showSlashMenu || slashSearchQuery !== query) {
          setSlashSearchQuery(query);
          setSelectedMenuIndex(0);
        }
        setShowSlashMenu(true);
        setShowWikiMenu(false);

        const range = selection.getRangeAt(0).cloneRange();
        try {
          range.setStart(node, slashIdx);
          range.setEnd(node, offset);
          const rects = range.getClientRects();
          if (rects.length > 0 && editorRef.current) {
            const parentRect = editorRef.current.getBoundingClientRect();
            setMenuCoords({
              top: rects[0].bottom - parentRect.top + editorRef.current.scrollTop + 6,
              left: rects[0].left - parentRect.left,
            });
          }
        } catch (e: unknown) {
          console.error('[Action Error]', e);
          notify(e instanceof Error ? e.message : 'Wystąpił błąd', 'error');
        }
        return;
      }
    }

    setShowSlashMenu(false);
  };

  const executeSlashCommand = (cmd: SlashCommand) => {
    if (!cmd) return;
    const selection = window.getSelection();
    if (!selection || !selection.anchorNode || !selection.rangeCount) return;
    const node = selection.anchorNode;
    const offset = selection.anchorOffset;
    const text = node.textContent || '';
    const slashIdx = text.slice(0, offset).lastIndexOf('/');

    if (slashIdx !== -1) {
      const range = selection.getRangeAt(0);
      range.setStart(node, slashIdx);
      range.setEnd(node, offset);
      range.deleteContents();
    }

    setShowSlashMenu(false);
    setSelectedMenuIndex(0);

    if (cmd.key === 'todo') {
      handleAction('todo');
    } else if (cmd.key === 'h1') {
      document.execCommand('formatBlock', false, '<h1>');
      handleInput();
    } else if (cmd.key === 'h2') {
      document.execCommand('formatBlock', false, '<h2>');
      handleInput();
    } else if (cmd.key === 'bullet') {
      document.execCommand('insertUnorderedList', false);
      handleInput();
    } else if (cmd.key === 'code') {
      insertHTML('<pre class="keep-code-block" contenteditable="true">Blok kodu...</pre><p><br></p>');
    } else if (cmd.key === 'callout') {
      insertHTML('<div class="keep-callout-block" contenteditable="true">💡 Wpisz ważne info tutaj...</div><p><br></p>');
    }
  };

  const executeWikiLink = (note: WikiNoteItem) => {
    if (!note) return;
    const selection = window.getSelection();
    if (!selection || !selection.anchorNode || !selection.rangeCount) return;
    const node = selection.anchorNode;
    const offset = selection.anchorOffset;
    const text = node.textContent || '';
    const wikiIdx = text.slice(0, offset).lastIndexOf('[[');

    if (wikiIdx !== -1) {
      const range = selection.getRangeAt(0);
      range.setStart(node, wikiIdx);
      range.setEnd(node, offset);
      range.deleteContents();
    }

    setShowWikiMenu(false);
    setSelectedMenuIndex(0);

    const linkHtml = `<a href="#" class="wiki-link" data-note-id="${note.id}">[[${note.title}]]</a>&nbsp;`;
    insertHTML(linkHtml);
  };

  const handleTriggerKeyDown = (e: React.KeyboardEvent): boolean => {
    if (!showSlashMenu && !showWikiMenu) return false;

    const maxIndex = showSlashMenu ? filteredSlashCommands.length - 1 : filteredWikiNotes.length - 1;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedMenuIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
      return true;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedMenuIndex((prev) => (prev <= 0 ? maxIndex : prev - 1));
      return true;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (showSlashMenu) {
        if (filteredSlashCommands[selectedMenuIndex]) {
          executeSlashCommand(filteredSlashCommands[selectedMenuIndex]);
        }
      } else {
        if (filteredWikiNotes[selectedMenuIndex]) {
          executeWikiLink(filteredWikiNotes[selectedMenuIndex]);
        }
      }
      return true;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      setShowSlashMenu(false);
      setShowWikiMenu(false);
      return true;
    }

    return false;
  };

  return {
    showSlashMenu,
    showWikiMenu,
    menuCoords,
    wikiSearchQuery,
    selectedMenuIndex,
    filteredSlashCommands,
    filteredWikiNotes,
    checkTriggers,
    executeSlashCommand,
    executeWikiLink,
    handleTriggerKeyDown,
  };
}
