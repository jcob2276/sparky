import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { suggestMacroFill, type FillCandidate, type FillSuggestion, type RemainingMacros } from '@vanguard/domain';
import Button from '../../ui/Button';
import { formatDecimalPl } from '../../../lib/formatPl';
import { fetchFavorites } from '../../../lib/health/foodEntryListsApi';
import { foodEntryListsKeys } from '../../../lib/queryKeys';
import type { FoodBase } from '../../../lib/health/foodTypes';
import FoodLibraryReview from './FoodLibraryReview';

type Favorite = Awaited<ReturnType<typeof fetchFavorites>>[number];

function toCandidate(food: Favorite): FillCandidate | null {
  const { calories, protein, carbs, fat } = food;
  if (calories == null || protein == null || carbs == null || fat == null || calories <= 0) return null;
  return { id: food.library_id ?? food.id, name: food.name, per100: { kcal: calories, protein, carbs, fat }, portionGrams: food.default_grams ?? 100 };
}

function Suggestion({ suggestion, onAdd }: { suggestion: FillSuggestion; onAdd: () => void }) {
  return (
    <li className="space-y-2 rounded-lg border border-border-custom p-3">
      <p className="text-sm font-semibold text-text-primary">{suggestion.items.map((i) => `${i.name} ${i.grams} g`).join(' + ')}</p>
      <p className="text-xs tabular-nums text-text-secondary">
        {suggestion.kcal} kcal · B +{formatDecimalPl(suggestion.protein)} g · W +{formatDecimalPl(suggestion.carbs)} g · T +{formatDecimalPl(suggestion.fat)} g
      </p>
      <Button size="sm" variant="tonal" onClick={onAdd}>Dodaj do posiłku</Button>
    </li>
  );
}

interface Props {
  userId: string;
  remaining: RemainingMacros;
  /** Wstawia produkty do szkicu posiłku (użytkownik nadal zatwierdza zapis). */
  onAdd: (items: Array<{ food: FoodBase; grams: number }>) => void;
}

/** Dopełnianie makr z własnych ulubionych produktów: bez AI, więc działa zawsze i od razu. */
export default function MacroFillPanel({ userId, remaining, onAdd }: Props) {
  const [reviewing, setReviewing] = useState(false);
  const { data: favorites, isLoading } = useQuery({ queryKey: [...foodEntryListsKeys.favorites(userId), 'fill'], queryFn: () => fetchFavorites(userId, 80) });
  const byId = useMemo(() => new Map((favorites ?? []).map((f) => [f.library_id ?? f.id, f])), [favorites]);
  const suggestions = useMemo(
    () => suggestMacroFill(remaining, (favorites ?? []).map(toCandidate).filter((c): c is FillCandidate => c != null)),
    [favorites, remaining],
  );
  const fatOver = remaining.fat != null && remaining.fat < 0;

  if (reviewing) {
    return (
      <div className="space-y-2">
        <Button size="sm" variant="ghost" onClick={() => setReviewing(false)}>← Wróć do propozycji</Button>
        <FoodLibraryReview userId={userId} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs tabular-nums text-text-secondary">
        Zostało: {Math.max(0, Math.round(remaining.kcal))} kcal · {Math.max(0, Math.round(remaining.protein))} g białka
        {remaining.fat != null ? ` · ${Math.max(0, Math.round(remaining.fat))} g tłuszczu` : ''}
        {remaining.carbs != null ? ` · ${Math.max(0, Math.round(remaining.carbs))} g węgli` : ''}
      </p>
      {fatOver && <p role="note" className="text-xs text-warning">Tłuszcz już przekroczony, dlatego dobieram chude produkty.</p>}
      {isLoading ? <p role="status" className="text-xs text-text-muted">Szukam w Twoich produktach…</p> : null}
      {!isLoading && suggestions.length === 0 && (
        <p className="text-sm text-text-muted">{remaining.kcal < 80 ? 'Cel kalorii na dziś jest już prawie osiągnięty.' : 'Nie znalazłem zestawu w Twoich ulubionych, który mieści się w pozostałych kaloriach.'}</p>
      )}
      <ul className="list-none space-y-2 p-0">
        {suggestions.map((s) => (
          <Suggestion key={s.items.map((i) => i.id).join('+')} suggestion={s} onAdd={() => onAdd(s.items.flatMap((i) => {
            const food = byId.get(i.id);
            return food ? [{ food, grams: i.grams }] : [];
          }))} />
        ))}
      </ul>
      <Button size="sm" variant="ghost" onClick={() => setReviewing(true)}>Sprawdź swoje produkty</Button>
    </div>
  );
}
