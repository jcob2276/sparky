import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import RecipeCard from './RecipeCard';
import { useRecipeFavorites } from './useRecipeFavorites';
import type { Recipe } from '../../../../lib/recipes/recipeTypes';

const recipe = {
  id: 'r1', title: 'Omlet', subcategory: 'Jajka', prep_time: 5, cook_time: 5, protein: 30, calories: 300,
  is_airfryer_compatible: false, image: 'https://example.com/a.webp',
} as Recipe;

describe('RecipeCard', () => {
  it('shows the photo and toggles favorite without opening the recipe', () => {
    const onOpen = vi.fn();
    const onToggleFavorite = vi.fn();
    const { container } = render(<RecipeCard recipe={recipe} favorite={false} onOpen={onOpen} onToggleFavorite={onToggleFavorite} />);
    expect(container.querySelector('img')?.getAttribute('src')).toBe(recipe.image);
    fireEvent.click(screen.getByRole('button', { name: 'Dodaj do ulubionych: Omlet' }));
    expect(onToggleFavorite).toHaveBeenCalledWith(recipe);
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('falls back to an icon when the photo fails', () => {
    const { container } = render(<RecipeCard recipe={recipe} favorite onOpen={vi.fn()} onToggleFavorite={vi.fn()} />);
    fireEvent.error(container.querySelector('img') as HTMLImageElement);
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByRole('button', { name: 'Usuń z ulubionych: Omlet' }).getAttribute('aria-pressed')).toBe('true');
  });
});

describe('useRecipeFavorites', () => {
  beforeEach(() => window.localStorage.clear());

  it('toggles and persists ids', () => {
    const { result } = renderHook(() => useRecipeFavorites());
    act(() => result.current.toggle('a'));
    act(() => result.current.toggle('b'));
    act(() => result.current.toggle('a'));
    expect(result.current.ids).toEqual(['b']);
    expect(renderHook(() => useRecipeFavorites()).result.current.ids).toEqual(['b']);
  });
});
