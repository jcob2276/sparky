import { Pressable, ControlInput } from '../ui/ControlPrimitives';
import { useEffect, useRef, useState } from 'react';
import { Bookmark, Command, Search, X } from 'lucide-react';
import { confirmDialog } from '../../lib/notify';
import { useTodoContext } from './context/TodoContext';
import TodoCommandPalette from './TodoCommandPalette';
import { SearchHints, SearchStatus } from './TodoSearchStatus';
import { openTodoPalette } from './todoPaletteNav';

const SEARCH_DEBOUNCE_MS = 150;
const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

export default function TodoSearchBar() {
  const {
    searchQuery,
    setSearchQuery,
    activeSmartListId,
    setActiveSmartListId,
    smartLists,
    saveCurrentAsSmartList,
    removeSmartList,
  } = useTodoContext();
  const [showSaveSmartList, setShowSaveSmartList] = useState(false);
  const [newSmartListName, setNewSmartListName] = useState('');
  const [focused, setFocused] = useState(false);
  // The input is driven by a local draft so typing never waits for the (heavy) list filtering.
  const [draft, setDraft] = useState(searchQuery);
  const pushedRef = useRef(searchQuery);

  useEffect(() => {
    if (searchQuery !== pushedRef.current) {
      pushedRef.current = searchQuery;
      setDraft(searchQuery);
    }
  }, [searchQuery]);

  useEffect(() => {
    if (draft === pushedRef.current) return undefined;
    const timer = window.setTimeout(() => {
      pushedRef.current = draft;
      setSearchQuery(draft);
      if (draft) setActiveSmartListId(null);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [draft, setSearchQuery, setActiveSmartListId]);

  const commitNow = (value: string) => {
    pushedRef.current = value;
    setDraft(value);
    setSearchQuery(value);
  };

  const saveSmartList = () => {
    if (!newSmartListName.trim()) return;
    saveCurrentAsSmartList(newSmartListName);
    setNewSmartListName('');
    setShowSaveSmartList(false);
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 px-4 pb-1 pt-3">
      <TodoCommandPalette />
      <div className="relative flex min-h-10 min-w-0 basis-48 flex-1 items-center gap-2 rounded-xl border border-border-custom/70 bg-surface-solid/50 px-3 focus-within:border-primary/40">
        <Search size={14} className="shrink-0 text-text-muted" />
        <ControlInput
          data-todo-search=""
          type="text"
          inputMode="search"
          enterKeyHint="search"
          autoComplete="off"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={(event) => {
            if (event.key !== 'Escape') return;
            event.stopPropagation();
            if (draft) commitNow('');
            else event.currentTarget.blur();
          }}
          placeholder="Filtruj zadania (/), np. termin:tydzień"
          aria-label="Szukaj i filtruj zadania"
          className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-text-primary outline-none placeholder:text-text-muted/50"
        />
        {draft && (
          <Pressable onClick={() => commitNow('')} aria-label="Wyczyść wyszukiwanie" className="text-text-muted hover:text-text-primary">
            <X size={13} />
          </Pressable>
        )}
        {focused && (!draft || draft.endsWith(' ')) && <SearchHints query={draft} onPick={commitNow} />}
      </div>
      <Pressable
        onClick={() => openTodoPalette()}
        aria-label="Otwórz paletę poleceń"
        aria-keyshortcuts="Control+K Meta+K"
        title="Paleta poleceń"
        className="flex min-h-10 items-center gap-1.5 rounded-xl border border-border-custom/70 bg-surface-solid/50 px-2.5 text-xs font-bold text-text-muted hover:border-primary/40 hover:text-text-primary"
      >
        <Command size={13} aria-hidden="true" />
        <kbd className="hidden font-sans sm:inline">{IS_MAC ? '⌘K' : 'Ctrl K'}</kbd>
      </Pressable>
      {smartLists.map((smartList) => (
        <Pressable
          key={smartList.id}
          onClick={() => { commitNow(''); setActiveSmartListId((current) => current === smartList.id ? null : smartList.id); }}
          onContextMenu={(event) => {
            event.preventDefault();
            void confirmDialog(`Czy na pewno chcesz usunąć Smart Listę "${smartList.name}"?`).then((ok) => {
              if (ok) removeSmartList(smartList.id);
            });
          }}
          className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold ui-interactive ${
            activeSmartListId === smartList.id
              ? 'border-primary/30 bg-primary/15 text-primary'
              : 'border-border-custom/50 text-text-muted hover:bg-surface-solid/40 hover:text-text-primary'
          }`}
          title="Kliknij prawym, aby usunąć"
        >
          <span>{smartList.icon}</span>
          {smartList.name}
        </Pressable>
      ))}
      {searchQuery.trim() && !activeSmartListId && (
        showSaveSmartList ? (
          <div className="flex items-center gap-1">
            <ControlInput
              autoFocus
              value={newSmartListName}
              onChange={(event) => setNewSmartListName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') saveSmartList();
                if (event.key === 'Escape') setShowSaveSmartList(false);
              }}
              placeholder="Nazwa Smart Listy…"
              className="w-32 rounded-full border border-primary/30 bg-surface-solid/60 px-2.5 py-1 text-xs font-semibold text-text-primary outline-none"
            />
            <Pressable onClick={saveSmartList} className="px-1.5 text-xs font-black text-primary">Zapisz</Pressable>
          </div>
        ) : (
          <Pressable
            onClick={() => setShowSaveSmartList(true)}
            className="flex items-center gap-1 rounded-full border border-dashed border-border-custom/60 px-2.5 py-1 text-xs font-bold text-text-muted ui-interactive hover:border-primary/40 hover:text-primary"
          >
            <Bookmark size={10} /> Zapisz jako Smart Listę
          </Pressable>
        )
      )}
      <SearchStatus query={searchQuery} pending={draft.trim() !== searchQuery.trim()} onChange={commitNow} />
    </div>
  );
}
