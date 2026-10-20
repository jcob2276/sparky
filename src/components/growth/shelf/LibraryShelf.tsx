import { useEffect, useMemo, useState } from 'react';
import { BookMarked, FileUp, Plus } from 'lucide-react';
import { confirmDialog, notify } from '../../../lib/notify';
import { loadSeen, markSeen } from '../../../lib/learning/shelfSeen';
import {
  chunkRows,
  filterShelf,
  isFresh,
  shelfStats,
  sortForShelf,
  spineFor,
  type LibraryItem,
  type ShelfFilter,
} from '../../../lib/learning/shelfModel';
import DataStateNotice from '../../core/DataStateNotice';
import Button from '../../ui/Button';
import Skeleton from '../../ui/Skeleton';
import LibraryAddModal from './LibraryAddModal';
import LibraryImportModal from './LibraryImportModal';
import ShelfBook from './ShelfBook';
import ShelfDetail from './ShelfDetail';
import { useContainerWidth } from './useContainerWidth';
import { useDeleteLibraryItem, useLibraryItems } from './useLibrary';

const SETTLE_MS = 2200;
const SHELF_SIDE_PADDING_PX = 16;
const FILTERS: Array<{ id: ShelfFilter; label: string }> = [
  { id: 'all', label: 'Wszystko' },
  { id: 'book', label: 'Książki' },
  { id: 'video', label: 'Filmy' },
];

function StatTile({ label, thisYear, total }: { label: string; thisYear: number; total: number }) {
  return (
    <div className="rounded-xl border border-border-custom/40 bg-surface/40 px-3 py-2">
      <p className="text-3xs font-black uppercase tracking-wider text-text-muted">{label}</p>
      <p className="text-sm font-black tabular-nums text-text-primary">
        {total} <span className="text-xs font-semibold text-text-muted">· w tym roku {thisYear}</span>
      </p>
    </div>
  );
}

/** Wirtualna biblioteka: książki i filmy z całego życia jako grzbiety na półkach. */
export default function LibraryShelf({ userId, today }: { userId: string; today: string }) {
  const library = useLibraryItems(userId);
  const remove = useDeleteLibraryItem(userId);
  const { ref, width } = useContainerWidth<HTMLDivElement>();
  const [filter, setFilter] = useState<ShelfFilter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [seen, setSeen] = useState<Set<string>>(() => loadSeen(userId));
  const [mountedAtMs] = useState(() => Date.now());

  const items = useMemo(() => sortForShelf(library.data ?? []), [library.data]);
  const year = Number(today.slice(0, 4));
  const stats = useMemo(() => shelfStats(items, year), [items, year]);
  const visible = useMemo(() => filterShelf(items, filter), [items, filter]);

  const freshIds = items.filter((item) => isFresh(item, seen, mountedAtMs)).map((item) => item.id);
  const freshKey = freshIds.join(',');
  useEffect(() => {
    if (!freshKey) return undefined;
    const ids = freshKey.split(',');
    const timer = window.setTimeout(() => {
      markSeen(userId, ids);
      setSeen((current) => new Set([...current, ...ids]));
    }, SETTLE_MS);
    return () => window.clearTimeout(timer);
  }, [freshKey, userId]);

  const rows = useMemo(
    () => chunkRows(visible.map((item) => ({ item, spine: spineFor(item) })), width - SHELF_SIDE_PADDING_PX),
    [visible, width],
  );
  const freshOrder = new Map(freshIds.map((id, index) => [id, index]));
  const selected: LibraryItem | null = visible.find((item) => item.id === selectedId) ?? null;

  const handleDelete = async (item: LibraryItem) => {
    if (!(await confirmDialog(`Usunąć „${item.title}” z biblioteki?`))) return;
    try {
      await remove.mutateAsync(item.id);
      setSelectedId(null);
    } catch (err: unknown) {
      console.error('[library] delete failed:', err);
      notify('Nie udało się usunąć pozycji', 'error');
    }
  };

  return (
    <section className="space-y-3" aria-labelledby="library-title">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 id="library-title" className="text-lg font-black tracking-tight text-text-primary">Biblioteka</h2>
          <p className="text-xs text-text-muted">Książki i filmy z całego życia. Ukończone z planu dochodzą same.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setImportOpen(true)} variant="outline" size="sm" icon={<FileUp size={14} />}>Importuj</Button>
          <Button onClick={() => setAddOpen(true)} size="sm" icon={<Plus size={14} />}>Dodaj</Button>
        </div>
      </div>

      {library.error && <DataStateNotice tone="warning" title="Nie udało się wczytać biblioteki" detail={library.error.message} />}

      {library.isLoading ? (
        <Skeleton className="h-48 w-full rounded-2xl" />
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border-custom/60 p-6 text-center space-y-3">
          <BookMarked size={28} className="mx-auto text-text-muted" aria-hidden="true" />
          <p className="text-sm font-bold text-text-primary">Twoja biblioteka jest pusta.</p>
          <p className="text-xs text-text-muted">
            Wklej listę przeczytanych książek i obejrzanych filmów albo plik z Goodreads lub Letterboxd. To pięć minut, raz.
          </p>
          <Button onClick={() => setImportOpen(true)} size="sm" icon={<FileUp size={14} />}>Importuj listę</Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2">
            <StatTile label="Książki" thisYear={stats.thisYear.books} total={stats.lifetime.books} />
            <StatTile label="Filmy" thisYear={stats.thisYear.videos} total={stats.lifetime.videos} />
          </div>

          <div role="group" aria-label="Filtr biblioteki" className="flex gap-1.5">
            {FILTERS.map(({ id, label }) => (
              <Button
                key={id}
                size="sm"
                variant={filter === id ? 'tonal' : 'ghost'}
                aria-pressed={filter === id}
                onClick={() => { setFilter(id); setSelectedId(null); }}
              >
                {label}
              </Button>
            ))}
          </div>

          <div ref={ref} className="shelf">
            {rows.length === 0 ? (
              <p className="py-8 text-center text-xs text-text-muted">Nic w tym filtrze.</p>
            ) : (
              rows.map((row, rowIndex) => (
                <div key={rowIndex} className="shelf-level">
                  <ul className="shelf-row" aria-label={`Półka ${rowIndex + 1}`}>
                    {row.map(({ item, spine }) => (
                      <ShelfBook
                        key={item.id}
                        item={item}
                        spine={spine}
                        selected={item.id === selectedId}
                        fresh={freshOrder.has(item.id)}
                        freshIndex={freshOrder.get(item.id) ?? 0}
                        onSelect={() => setSelectedId((current) => (current === item.id ? null : item.id))}
                      />
                    ))}
                  </ul>
                  <div className="shelf-plank" aria-hidden="true" />
                </div>
              ))
            )}
          </div>

          {selected && <ShelfDetail item={selected} deleting={remove.isPending} onDelete={() => void handleDelete(selected)} />}
        </>
      )}

      {importOpen && <LibraryImportModal userId={userId} today={today} existing={library.data ?? []} onClose={() => setImportOpen(false)} />}
      {addOpen && <LibraryAddModal userId={userId} today={today} onClose={() => setAddOpen(false)} />}
    </section>
  );
}
