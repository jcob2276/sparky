import { Fragment, useEffect } from 'react';
import { SearchX } from 'lucide-react';
import { splitByIndices } from './todoPaletteSearch';
import { PALETTE_LISTBOX_ID, paletteOptionId, type PaletteEntry, type PaletteGroup } from './todoPaletteEntries';


function Highlighted({ text, indices }: { text: string; indices?: number[] }) {
  return (
    <>
      {splitByIndices(text, indices ?? []).map((segment, i) => (
        segment.hit
          ? <mark key={i} className="bg-transparent font-black text-primary">{segment.text}</mark>
          : <Fragment key={i}>{segment.text}</Fragment>
      ))}
    </>
  );
}

interface TodoPaletteListProps {
  groups: PaletteGroup[];
  activeIndex: number;
  query: string;
  onHover: (index: number) => void;
  onSelect: (entry: PaletteEntry) => void;
}

export default function TodoPaletteList({ groups, activeIndex, query, onHover, onSelect }: TodoPaletteListProps) {
  useEffect(() => { document.getElementById(paletteOptionId(activeIndex))?.scrollIntoView({ block: 'nearest' }); }, [activeIndex]);

  if (groups.length === 0) {
    return (
      <div role="status" className="flex flex-col items-center gap-1.5 px-4 py-10 text-center">
        <SearchX size={20} className="text-text-muted/60" aria-hidden="true" />
        <p className="text-sm font-bold text-text-primary">Brak wyników{query.trim() ? ` dla „${query.trim()}”` : ''}</p>
        <p className="text-xs text-text-muted">Spróbuj krótszej frazy albo wpisz &gt; aby przenieść zadanie.</p>
      </div>
    );
  }

  const offsets = groups.map((_, i) => groups.slice(0, i).reduce((sum, g) => sum + g.entries.length, 0));
  return (
    <div id={PALETTE_LISTBOX_ID} role="listbox" aria-label="Wyniki" className="todo-palette-list overflow-y-auto overscroll-contain p-1.5">
      {groups.map((group, groupIndex) => (
        <div key={group.label} role="group" aria-label={group.label} className="pb-1">
          <div aria-hidden="true" className="px-2.5 pb-1 pt-2 todo-text-micro font-black uppercase tracking-wider text-text-muted/70">{group.label}</div>
          {group.entries.map((entry, entryIndex) => {
            const index = offsets[groupIndex] + entryIndex;
            const active = index === activeIndex;
            const Icon = entry.icon;
            return (
              <div
                key={entry.id}
                id={paletteOptionId(index)}
                role="option"
                aria-selected={active}
                onMouseMove={() => { if (!active) onHover(index); }}
                onClick={() => onSelect(entry)}
                className={`flex min-h-10 cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm ${active ? 'bg-primary/12 text-text-primary' : 'text-text-secondary'}`}
              >
                <Icon size={15} aria-hidden="true" className={`shrink-0 ${active ? 'text-primary' : 'text-text-muted'}`} />
                <span className="min-w-0 flex-1 truncate font-semibold"><Highlighted text={entry.label} indices={entry.indices} /></span>
                {entry.meta && <span className="todo-palette-meta shrink-0 truncate text-xs text-text-muted">{entry.meta}</span>}
                {active && entry.taskId && <span className="hidden shrink-0 todo-text-micro text-text-muted sm:inline"><kbd className="rounded border border-border-custom px-1 font-sans">Tab</kbd> przenieś</span>}
                {entry.shortcut && <kbd className="shrink-0 rounded border border-border-custom px-1.5 py-0.5 font-sans todo-text-micro font-bold text-text-muted">{entry.shortcut}</kbd>}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
