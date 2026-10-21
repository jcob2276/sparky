import { useCallback, useEffect, useRef } from 'react';
import { ControlInput } from '../ui/ControlPrimitives';
import FloatingToolbar from './FloatingToolbar';
import RichEditorStaticBar from './RichEditorStaticBar';
import RichEditorAutocompleteMenu from './RichEditorAutocompleteMenu';
import { downloadBlob } from '../../lib/download';
import { useRichEditorFormatting } from './hooks/useRichEditorFormatting';
import { useRichEditorTriggers } from './hooks/useRichEditorTriggers';
import { useRichEditorUploads } from './hooks/useRichEditorUploads';
import { handleRichEditorKeyShortcuts } from './richEditorKeyHandlers';
import { toDisplayHtml } from './markdownLite';

interface RichEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder: string;
  className?: string;
  style?: React.CSSProperties;
  showStaticBar?: boolean;
  allNotes?: Array<{ id: string; title: string }>;
  noteId?: string;
  userId?: string;
  onNavigateToNote?: (noteId: string) => void;
}

/** Krótka pierwsza linia (zwykły akapit) jest tytułem notatki — wyróżniamy ją jak w Apple Notes. */
function markTitleBlock(editor: HTMLElement | null) {
  const first = editor?.firstElementChild;
  const isTitle = !!first
    && (first.tagName === 'P' || first.tagName === 'DIV')
    && !first.classList.contains('keep-todo-item')
    && !first.querySelector('br:not(:last-child), img, table')
    && (first.textContent ?? '').trim().length > 0
    && (first.textContent ?? '').length <= 80;
  if (editor) editor.dataset.titleFirst = isTitle ? 'true' : 'false';
}

export default function RichEditor({
  value,
  onChange,
  placeholder,
  className = '',
  style = {},
  showStaticBar = true,
  allNotes = [],
  noteId,
  userId,
  onNavigateToNote,
}: RichEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      markTitleBlock(editorRef.current);
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  const triggerImageUpload = useCallback(() => {
    imageInputRef.current?.click();
  }, []);

  const formatting = useRichEditorFormatting({
    editorRef,
    handleInput,
    onTriggerImage: triggerImageUpload,
  });

  const { handleImageFile } = useRichEditorUploads({
    noteId,
    userId,
    restoreSelection: formatting.restoreSelection,
    handleInput,
  });

  const triggers = useRichEditorTriggers({
    editorRef,
    allNotes,
    handleAction: formatting.handleAction,
    handleInput,
    insertHTML: formatting.insertHTML,
  });

  useEffect(() => {
    // Markdown renderujemy tylko przy otwarciu notatki — nigdy w trakcie pisania (kursor by skakał).
    const typing = document.activeElement === editorRef.current;
    const html = typing ? value : toDisplayHtml(value);
    if (editorRef.current && editorRef.current.innerHTML !== html) {
      editorRef.current.innerHTML = html;
    }
    markTitleBlock(editorRef.current);
  }, [value]);

  const handleEditorClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('keep-inline-img')) {
      e.preventDefault();
      const src = (target as HTMLImageElement).src;
      void fetch(src)
        .then((r) => r.blob())
        .then((b) => downloadBlob(b, `zdjecie-${Date.now()}.png`))
        .catch(() => window.open(src, '_blank'));
      return;
    }
    if (target.classList.contains('keep-todo-checkbox')) {
      e.preventDefault();
      const isChecked = target.classList.toggle('checked');
      const textSibling = target.nextElementSibling as HTMLElement;
      if (textSibling) {
        textSibling.classList.toggle('completed', isChecked);
      }
      handleInput();
    }
    if (target.classList.contains('wiki-link')) {
      e.preventDefault();
      const targetNoteId = target.getAttribute('data-note-id');
      if (targetNoteId) {
        onNavigateToNote?.(targetNoteId);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (triggers.handleTriggerKeyDown(e)) {
      return;
    }
    handleRichEditorKeyShortcuts({
      e,
      editor: editorRef.current,
      handleInput,
      insertHTML: formatting.insertHTML,
    });
  };

  const isTextEmpty = !value || !value.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();

  return (
    <div className="relative w-full flex-1 flex flex-col">
      <ControlInput
        ref={imageInputRef}
        type="file"
        accept="image/*"
        aria-label="Wstaw obraz do notatki"
        style={{ display: 'none' }}
        onChange={(event) => {
          void handleImageFile(event);
        }}
      />
      <div
        ref={editorRef}
        contentEditable
        onInput={() => {
          handleInput();
          triggers.checkTriggers();
        }}
        onMouseUp={formatting.handleSelection}
        onKeyUp={() => {
          formatting.handleSelection();
          triggers.checkTriggers();
        }}
        onClick={handleEditorClick}
        onKeyDown={handleKeyDown}
        className={`keep-rich-editor ${className}`}
        style={style}
      />
      <RichEditorAutocompleteMenu
        showSlashMenu={triggers.showSlashMenu}
        showWikiMenu={triggers.showWikiMenu}
        menuCoords={triggers.menuCoords}
        filteredSlashCommands={triggers.filteredSlashCommands}
        filteredWikiNotes={triggers.filteredWikiNotes}
        selectedMenuIndex={triggers.selectedMenuIndex}
        wikiSearchQuery={triggers.wikiSearchQuery}
        onSelectSlashCommand={triggers.executeSlashCommand}
        onSelectWikiNote={triggers.executeWikiLink}
      />
      {isTextEmpty && (
        <span className="absolute left-0 top-0 pointer-events-none text-text-muted/75 text-base font-normal select-none">
          {placeholder}
        </span>
      )}
      {formatting.toolbarRange && (
        <FloatingToolbar
          range={formatting.toolbarRange}
          onAction={formatting.handleAction}
          activeState={formatting.activeState}
        />
      )}
      <RichEditorStaticBar
        activeState={formatting.activeState}
        showStaticBar={showStaticBar}
        onAction={formatting.handleAction}
      />
    </div>
  );
}
