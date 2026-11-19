import { useMemo } from 'react';
import { PencilLine, Search } from 'lucide-react';
import type { SavedLink } from '../../../lib/linksApi';
import DataStateNotice from '../../core/DataStateNotice';
import Button from '../../ui/Button';
import { ControlInput, Pressable } from '../../ui/ControlPrimitives';
import Skeleton from '../../ui/Skeleton';

interface LearningPocketPickerProps {
  links: SavedLink[] | undefined;
  query: string;
  onQueryChange: (query: string) => void;
  loading: boolean;
  error: Error | null;
  onPick: (link: SavedLink) => void;
  onCustom: () => void;
}

/** Pierwszy krok dodawania: nieprzeczytane z Pocketa albo materiał własny. */
export default function LearningPocketPicker({ links, loading, error, query, onQueryChange, onPick, onCustom }: LearningPocketPickerProps) {
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (links ?? []).filter(
      (link) => !needle || link.title.toLowerCase().includes(needle) || link.domain.toLowerCase().includes(needle),
    );
  }, [links, query]);

  return (
    <div className="space-y-3">
      <Button onClick={onCustom} variant="outline" size="sm" icon={<PencilLine size={14} />} className="w-full">
        Własny materiał (np. książka z półki)
      </Button>

      <div className="space-y-2">
        <p className="text-xs font-bold text-text-secondary">Albo z Pocketa (nieprzeczytane)</p>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" aria-hidden="true" />
          <ControlInput
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Szukaj w Pocket…"
            aria-label="Szukaj w Pocket"
            className="w-full rounded-lg border border-border-custom/60 bg-surface-2 py-2 pl-9 pr-3 text-base text-text-primary"
          />
        </div>

        {error && <DataStateNotice tone="warning" title="Nie udało się wczytać Pocketa" detail={error.message} />}
        {loading ? (
          <Skeleton className="h-32 w-full rounded-lg" />
        ) : visible.length === 0 ? (
          <p className="py-4 text-center text-xs text-text-muted">
            {query ? 'Brak pasujących linków.' : 'Brak nieprzeczytanych linków w Pocket.'}
          </p>
        ) : (
          <ul className="space-y-1" aria-label="Nieprzeczytane z Pocketa">
            {visible.map((link) => (
              <li key={link.id}>
                <Pressable
                  onClick={() => onPick(link)}
                  className="flex w-full flex-col rounded-lg border border-border-custom/40 px-3 py-2 text-left hover:bg-surface-solid transition-colors"
                >
                  <span className="text-sm font-semibold text-text-primary line-clamp-2">{link.title}</span>
                  <span className="text-2xs text-text-muted">{link.domain}</span>
                </Pressable>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
