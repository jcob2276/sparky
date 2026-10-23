import { LIBRARY_TYPE_LABELS, type LibraryType } from '../../../lib/learning/shelfModel';
import type { NewLibraryItem } from '../../../lib/learning/libraryImport';

const MAX_PREVIEW = 40;

interface LibraryImportPreviewProps {
  fresh: NewLibraryItem[];
  duplicates: number;
  skipped: number;
}

/** Podgląd importu: ile pozycji dojdzie, ile to duplikaty i pierwsze pozycje z rodzajem. */
export default function LibraryImportPreview({ fresh, duplicates, skipped }: LibraryImportPreviewProps) {
  return (
    <div className="space-y-2" aria-live="polite">
      <p className="text-xs font-bold text-text-secondary">
        Do dodania: {fresh.length}
        {duplicates > 0 && <span className="font-semibold text-text-muted"> · już są: {duplicates}</span>}
        {skipped > 0 && <span className="font-semibold text-text-muted"> · pominięte: {skipped}</span>}
      </p>
      {fresh.length > 0 && (
        <ul className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-border-custom/40 p-2" aria-label="Podgląd importu">
          {fresh.slice(0, MAX_PREVIEW).map((item, index) => (
            <li key={`${item.title}-${index}`} className="flex items-baseline justify-between gap-2 text-xs">
              <span className="min-w-0 truncate text-text-primary">
                {item.title}
                {item.author && <span className="text-text-muted"> — {item.author}</span>}
              </span>
              <span className="shrink-0 text-2xs font-bold text-text-muted">
                {LIBRARY_TYPE_LABELS[item.resourceType as LibraryType]}
                {item.finishedYear ? ` · ${item.finishedYear}` : item.finishedOn ? ` · ${item.finishedOn.slice(0, 4)}` : ''}
              </span>
            </li>
          ))}
          {fresh.length > MAX_PREVIEW && (
            <li className="pt-1 text-center text-2xs text-text-muted">i jeszcze {fresh.length - MAX_PREVIEW}…</li>
          )}
        </ul>
      )}
    </div>
  );
}
