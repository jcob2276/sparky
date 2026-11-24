import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { ControlInput, Pressable } from '../../../ui/ControlPrimitives';
import { ToggleChip } from '../../../ui/ToggleChip';
import Spinner from '../../../ui/Spinner';
import { useUserId } from '../../../../store/useStore';
import { filterRecipes } from '../../../../lib/recipes/filterRecipes';
import { loadRecipes } from '../../../../lib/recipes/loadRecipes';
import type { Recipe, RecipeQuickFilter } from '../../../../lib/recipes/recipeTypes';
import RecipeCard from './RecipeCard';
import RecipeDetailSheet from './RecipeDetailSheet';
import { useLogRecipe } from './useLogRecipe';

const QUICK: { key: RecipeQuickFilter; label: string }[] = [
  { key: 'airfryer', label: 'Air fryer' },
  { key: 'protein40', label: '40 g+ białka' },
  { key: 'protein50', label: '50 g+ białka' },
  { key: 'fast', label: 'Do 15 min' },
  { key: 'lowCarb', label: 'Low-carb' },
];

interface RecipeBookViewProps {
  onBack: () => void;
}

export default function RecipeBookView({ onBack }: RecipeBookViewProps) {
  const userId = useUserId();
  const [recipes, setRecipes] = useState<Recipe[] | null>(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [quick, setQuick] = useState<ReadonlySet<RecipeQuickFilter>>(new Set());
  const [open, setOpen] = useState<Recipe | null>(null);
  const { logRecipe, saving } = useLogRecipe(userId);

  useEffect(() => {
    void loadRecipes().then(setRecipes);
  }, []);

  const categories = useMemo(() => [...new Set((recipes ?? []).map((recipe) => recipe.category))], [recipes]);
  const visible = useMemo(() => filterRecipes(recipes ?? [], { query, category, quick }), [recipes, query, category, quick]);
  const toggleQuick = (key: RecipeQuickFilter) => setQuick((current) => {
    const next = new Set(current);
    if (!next.delete(key)) next.add(key);
    return next;
  });

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-3 px-3 pb-24">
      <header className="flex items-center gap-2 py-2">
        <Pressable onClick={onBack} aria-label="Wróć" className="grid h-11 w-11 place-items-center rounded-full bg-surface/80 text-text-secondary">
          <ChevronLeft size={18} aria-hidden="true" />
        </Pressable>
        <h1 className="text-lg font-semibold text-text-primary">Przepisy</h1>
        {recipes && <span className="ml-auto text-xs text-text-muted">{visible.length} z {recipes.length}</span>}
      </header>

      <ControlInput
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Szukaj dania lub składnika"
        aria-label="Szukaj przepisu"
      />

      <div className="-mx-3 flex gap-1.5 overflow-x-auto px-3 pb-0.5" role="group" aria-label="Kategorie" data-no-swipe-nav="true">
        <ToggleChip active={category === null} onClick={() => setCategory(null)} className="shrink-0 whitespace-nowrap">Wszystkie</ToggleChip>
        {categories.map((name) => (
          <ToggleChip key={name} active={category === name} onClick={() => setCategory(category === name ? null : name)} className="shrink-0 whitespace-nowrap">{name}</ToggleChip>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtry">
        {QUICK.map(({ key, label }) => (
          <ToggleChip key={key} active={quick.has(key)} variant="warning" onClick={() => toggleQuick(key)}>{label}</ToggleChip>
        ))}
      </div>

      {!recipes ? (
        <div className="flex justify-center py-16"><Spinner size="md" /></div>
      ) : visible.length === 0 ? (
        <p className="py-10 text-center text-sm text-text-muted">Brak przepisów dla tych filtrów.</p>
      ) : (
        <div className="space-y-2.5">
          {visible.map((recipe) => <RecipeCard key={recipe.id} recipe={recipe} onOpen={setOpen} />)}
        </div>
      )}

      <RecipeDetailSheet
        recipe={open}
        saving={saving}
        onClose={() => setOpen(null)}
        onLog={(recipe) => { void logRecipe(recipe).then((ok) => { if (ok) setOpen(null); }); }}
      />
    </div>
  );
}
