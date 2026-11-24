import { useMemo } from 'react';
import { Check, Copy, Trash2 } from 'lucide-react';
import Sheet from '../../../ui/Sheet';
import Button from '../../../ui/Button';
import { Pressable } from '../../../ui/ControlPrimitives';
import { notify } from '../../../../lib/notify';
import { buildShoppingList, shoppingListToText } from '../../../../lib/recipes/shoppingList';
import type { Recipe } from '../../../../lib/recipes/recipeTypes';

interface RecipeShoppingSheetProps {
  open: boolean;
  recipes: Recipe[];
  checked: string[];
  onToggleChecked: (key: string) => void;
  onRemoveRecipe: (id: string) => void;
  onClear: () => void;
  onClose: () => void;
}

export default function RecipeShoppingSheet({
  open, recipes, checked, onToggleChecked, onRemoveRecipe, onClear, onClose,
}: RecipeShoppingSheetProps) {
  const items = useMemo(() => buildShoppingList(recipes), [recipes]);
  const done = useMemo(() => new Set(checked), [checked]);

  const copy = async () => {
    const text = shoppingListToText(items, done);
    try {
      await navigator.clipboard.writeText(text);
      notify('Skopiowano listę zakupów', 'success');
    } catch {
      notify('Nie udało się skopiować listy', 'error');
    }
  };

  return (
    <Sheet open={open} onOpenChange={(next) => { if (!next) onClose(); }} side="bottom" compact title="Lista zakupów">
      <div className="space-y-4 pb-2">
        {recipes.length === 0 ? (
          <p className="py-6 text-center text-sm text-text-muted">Dodaj przepisy do listy, a zbiorę z nich zakupy.</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-1.5" aria-label="Wybrane przepisy">
              {recipes.map((recipe) => (
                <Pressable
                  key={recipe.id}
                  onClick={() => onRemoveRecipe(recipe.id)}
                  aria-label={`Usuń z listy: ${recipe.title}`}
                  className="max-w-full truncate rounded-full border border-border-custom px-2.5 py-1 text-2xs text-text-secondary"
                >
                  {recipe.title} ×
                </Pressable>
              ))}
            </div>
            <ul className="space-y-0.5">
              {items.map((item, index) => {
                const isDone = done.has(item.key);
                const newGroup = index === 0 || items[index - 1].group !== item.group;
                return (
                  <li key={item.key}>
                    {newGroup && <p className="pb-1 pt-3 text-2xs font-bold uppercase tracking-wider text-text-muted">{item.group}</p>}
                    <Pressable
                      variant="ghost"
                      onClick={() => onToggleChecked(item.key)}
                      aria-pressed={isDone}
                      className="flex w-full items-center gap-3 rounded-xl px-1 py-2 text-left"
                    >
                      <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border ${isDone ? 'border-success bg-success text-on-accent' : 'border-border-custom'}`}>
                        {isDone && <Check size={12} aria-hidden="true" />}
                      </span>
                      <span className={`min-w-0 flex-1 text-sm ${isDone ? 'text-text-muted line-through' : 'text-text-primary'}`}>{item.name}</span>
                      {item.count > 1 && <span className="shrink-0 text-xs font-semibold text-text-muted">×{item.count}</span>}
                    </Pressable>
                  </li>
                );
              })}
            </ul>
            <div className="flex gap-2">
              <Button onClick={() => void copy()} icon={<Copy size={14} aria-hidden="true" />} className="flex flex-1">Kopiuj</Button>
              <Button variant="tonal-danger" onClick={onClear} icon={<Trash2 size={14} aria-hidden="true" />}>Wyczyść</Button>
            </div>
          </>
        )}
      </div>
    </Sheet>
  );
}
