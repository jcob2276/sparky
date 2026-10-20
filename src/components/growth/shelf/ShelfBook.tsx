import type { CSSProperties } from 'react';
import { LIBRARY_TYPE_LABELS, formatFinished, type LibraryItem, type LibraryType, type Spine } from '../../../lib/learning/shelfModel';
import { Pressable } from '../../ui/ControlPrimitives';

const SHOW_TITLE_FROM_WIDTH = 20;

interface ShelfBookProps {
  item: LibraryItem;
  spine: Spine;
  selected: boolean;
  /** Pozycja dopiero co dodana: wsuwa się na półkę z animacją. */
  fresh: boolean;
  /** Kolejność w paczce świeżych, do rozłożenia animacji w czasie. */
  freshIndex: number;
  onSelect: () => void;
}

/** Jeden grzbiet na półce. Wygląd (rozmiar, kolor) przychodzi ze zmiennych CSS, a style są w index.css. */
export default function ShelfBook({ item, spine, selected, fresh, freshIndex, onSelect }: ShelfBookProps) {
  const style = {
    '--spine-w': `${spine.widthPx}px`,
    '--spine-h': `${spine.heightPx}px`,
    '--spine-hue': spine.hue,
    '--shelf-delay': `${Math.min(freshIndex, 30) * 45}ms`,
  } as CSSProperties;
  const type = LIBRARY_TYPE_LABELS[item.resource_type as LibraryType] ?? 'Inne';

  return (
    <li className="shelf-slot">
      <Pressable
        onClick={onSelect}
        aria-expanded={selected}
        aria-label={`${item.title}, ${type}, skończone ${formatFinished(item)}`}
        style={style}
        className={`shelf-spine shelf-spine--${spine.kind}${fresh ? ' shelf-spine--new' : ''}`}
      >
        {spine.widthPx >= SHOW_TITLE_FROM_WIDTH && <span className="shelf-title">{item.title}</span>}
      </Pressable>
    </li>
  );
}
