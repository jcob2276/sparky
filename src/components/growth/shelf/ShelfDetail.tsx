import { Trash2 } from 'lucide-react';
import { LIBRARY_TYPE_LABELS, formatFinished, type LibraryItem, type LibraryType } from '../../../lib/learning/shelfModel';
import Button from '../../ui/Button';

interface ShelfDetailProps {
  item: LibraryItem;
  deleting: boolean;
  onDelete: () => void;
}

function formatRating(rating: number | null): string | null {
  if (rating === null) return null;
  return `${String(rating).replace('.', ',')}/5`;
}

/** Karta wybranej pozycji pod półką. */
export default function ShelfDetail({ item, deleting, onDelete }: ShelfDetailProps) {
  const type = LIBRARY_TYPE_LABELS[item.resource_type as LibraryType] ?? 'Inne';
  const rating = formatRating(item.rating === null ? null : Number(item.rating));
  const facts = [
    type,
    item.pages ? `${item.pages} stron` : null,
    `skończone: ${formatFinished(item)}`,
    rating ? `ocena ${rating}` : null,
    item.source === 'plan' ? 'z planu nauki' : null,
  ].filter((fact): fact is string => fact !== null);

  return (
    <div role="region" aria-label={`Szczegóły: ${item.title}`} className="rounded-2xl border border-border-custom/50 bg-surface/50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-text-primary leading-snug">{item.title}</h3>
          {item.author && <p className="text-xs font-semibold text-text-secondary">{item.author}</p>}
          <p className="mt-1 text-xs text-text-muted">{facts.join(' · ')}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onDelete} loading={deleting} icon={<Trash2 size={14} />} aria-label={`Usuń z biblioteki: ${item.title}`} />
      </div>
    </div>
  );
}
