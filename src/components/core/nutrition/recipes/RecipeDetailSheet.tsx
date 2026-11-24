import Sheet from '../../../ui/Sheet';
import Button from '../../../ui/Button';
import FavoriteButton from './FavoriteButton';
import RecipePhoto from './RecipePhoto';
import type { Recipe } from '../../../../lib/recipes/recipeTypes';

interface RecipeDetailSheetProps {
  recipe: Recipe | null;
  saving: boolean;
  inBasket: boolean;
  favorite: boolean;
  onToggleFavorite: (recipe: Recipe) => void;
  onToggleBasket: (recipe: Recipe) => void;
  onClose: () => void;
  onLog: (recipe: Recipe) => void;
}

function Macros({ recipe }: { recipe: Recipe }) {
  const cells: [string, string][] = [
    ['kcal', String(recipe.calories)],
    ['białko', `${recipe.protein} g`],
    ['węgle', `${recipe.carbs} g`],
    ['tłuszcz', `${recipe.fat} g`],
  ];
  return (
    <div className="grid grid-cols-4 gap-2 text-center">
      {cells.map(([label, value]) => (
        <div key={label} className="rounded-xl bg-surface-2 px-1 py-2">
          <p className="text-sm font-bold text-text-primary">{value}</p>
          <p className="text-2xs text-text-muted">{label}</p>
        </div>
      ))}
    </div>
  );
}

function List({ title, items, ordered }: { title: string; items: string[]; ordered?: boolean }) {
  const Tag = ordered ? 'ol' : 'ul';
  return (
    <section className="space-y-1.5">
      <h3 className="text-xs font-bold text-text-primary">{title}</h3>
      <Tag className={`space-y-1 pl-5 text-sm text-text-secondary ${ordered ? 'list-decimal' : 'list-disc'}`}>
        {items.map((item) => <li key={item}>{item}</li>)}
      </Tag>
    </section>
  );
}

export default function RecipeDetailSheet({ recipe, saving, inBasket, favorite, onToggleFavorite, onToggleBasket, onClose, onLog }: RecipeDetailSheetProps) {
  return (
    <Sheet open={recipe !== null} onOpenChange={(open) => { if (!open) onClose(); }} side="bottom" compact title={recipe?.title ?? ''}>
      {recipe && (
        <div className="space-y-4 pb-2">
          {recipe.image && (
            <div className="relative">
              <RecipePhoto src={recipe.image} className="h-48 w-full rounded-2xl" />
              <FavoriteButton active={favorite} title={recipe.title} onToggle={() => onToggleFavorite(recipe)} className="absolute right-2 top-2" />
            </div>
          )}
          <Macros recipe={recipe} />
          <p className="text-2xs text-text-muted">Makra to szacunek na jedną porcję, nie wyliczenie ze składników.</p>
          {recipe.is_airfryer_compatible && (
            <p className="text-xs font-semibold text-warning">Air fryer: {recipe.airfryer_settings}</p>
          )}
          <List title="Składniki" items={recipe.ingredients} />
          <List title="Do kupienia w markecie" items={recipe.lidl_biedronka_basket} />
          <List title="Przygotowanie" items={recipe.instructions} ordered />
          {recipe.pro_tip && <p className="rounded-xl bg-surface-2 p-3 text-xs text-text-secondary">{recipe.pro_tip}</p>}
          {recipe.source_url && (
            <a href={recipe.source_url} target="_blank" rel="noopener noreferrer" className="block text-2xs text-text-muted underline">
              Źródło: {recipe.source_name ?? recipe.source_url}
            </a>
          )}
          <div className="flex gap-2">
            {!recipe.image && <FavoriteButton active={favorite} title={recipe.title} onToggle={() => onToggleFavorite(recipe)} />}
            <Button variant="tonal" onClick={() => onToggleBasket(recipe)} className="flex flex-1">{inBasket ? 'Usuń z listy' : 'Na listę zakupów'}</Button>
            <Button onClick={() => onLog(recipe)} loading={saving} className="flex flex-1">Zapisz posiłek</Button>
          </div>
        </div>
      )}
    </Sheet>
  );
}
