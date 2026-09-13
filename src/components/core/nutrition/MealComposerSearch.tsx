import { ControlInput, Pressable } from '../../ui/ControlPrimitives';
import Spinner from '../../ui/Spinner';
import FoodRow from './FoodRow';
import { scale } from './hooks/foodEntryUtils';
import type { FoodBase } from '../../../lib/health/foodTypes';

export function ComposerSearch({
  query,
  setQuery,
  searching,
  results,
  externalSearching,
  externalSearched,
  searchExternal,
  onPick,
}: {
  query: string;
  setQuery: (value: string) => void;
  searching: boolean;
  results: FoodBase[];
  externalSearching: boolean;
  externalSearched: boolean;
  searchExternal: () => void;
  onPick: (food: FoodBase) => void;
}) {
  return (
    <div className="space-y-2 rounded-2xl border border-border-custom/70 bg-surface-solid/30 p-3">
      <ControlInput
        autoFocus
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Szukaj produktu…"
        className="w-full rounded-xl border border-border-custom bg-surface px-3 py-2 text-sm"
      />
      {searching && <Spinner size="sm" className="mx-auto" />}
      {!searching && query.trim().length >= 2 && results.length === 0 && !externalSearched && (
        <Pressable variant="outline" size="sm" onClick={searchExternal} loading={externalSearching} className="w-full text-xs">
          Szukaj w bazie zewnętrznej
        </Pressable>
      )}
      <div className="max-h-56 space-y-1 overflow-y-auto">
        {results.map((food) => (
          <FoodRow
            key={`${food.name}-${food.brand ?? ''}`}
            name={food.name}
            subtitle={food.brand}
            calories={scale(food.calories, food.defaultGrams ?? 100)}
            onTap={() => onPick(food)}
            onQuickAdd={() => onPick(food)}
            quickAddIcon={<span className="text-xs font-black">+</span>}
          />
        ))}
      </div>
    </div>
  );
}
