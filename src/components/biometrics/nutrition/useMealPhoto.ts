import { useEffect, useState } from 'react';
import type { PlannedMeal } from '@vanguard/domain';
import { invokeEdge } from '../../../lib/supabase';

const cache = new Map<string, { photoUrl: string; attribution?: string }>();

const CURATED_MEAL_PHOTOS: Array<{ keywords: string[]; photoUrl: string; attribution: string }> = [
  {
    keywords: ['owsianka', 'płatki', 'oatmeal', 'oats', 'porridge', 'musli', 'granola'],
    photoUrl: 'https://images.unsplash.com/photo-1517673132405-a56a62b18caf?auto=format&fit=crop&w=600&q=80',
    attribution: 'Zdjęcie: Unsplash',
  },
  {
    keywords: ['kurczak', 'kurczaka', 'filet', 'drób', 'pierś', 'chicken'],
    photoUrl: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=600&q=80',
    attribution: 'Zdjęcie: Unsplash',
  },
  {
    keywords: ['shake', 'napój', 'proteinowy', 'białko', 'koktajl', 'smoothie'],
    photoUrl: 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?auto=format&fit=crop&w=600&q=80',
    attribution: 'Zdjęcie: Unsplash',
  },
  {
    keywords: ['gulasz', 'wołowina', 'wołowy', 'stek', 'mielone', 'beef'],
    photoUrl: 'https://images.unsplash.com/photo-1547928576-a4a33237cbc3?auto=format&fit=crop&w=600&q=80',
    attribution: 'Zdjęcie: Unsplash',
  },
  {
    keywords: ['jajecznica', 'jajka', 'jajkami', 'omlet', 'eggs'],
    photoUrl: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=600&q=80',
    attribution: 'Zdjęcie: Unsplash',
  },
  {
    keywords: ['łosoś', 'ryba', 'rybą', 'tuńczyk', 'dorsz', 'salmon', 'fish'],
    photoUrl: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=600&q=80',
    attribution: 'Zdjęcie: Unsplash',
  },
  {
    keywords: ['kanapka', 'kanapki', 'tosty', 'chleb', 'chlebem', 'sandwich'],
    photoUrl: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=600&q=80',
    attribution: 'Zdjęcie: Unsplash',
  },
  {
    keywords: ['sałatka', 'warzywa', 'warzywami', 'surówka', 'surówką', 'salad'],
    photoUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=600&q=80',
    attribution: 'Zdjęcie: Unsplash',
  },
  {
    keywords: ['makaron', 'makaronem', 'pasta', 'spaghetti', 'penne'],
    photoUrl: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=600&q=80',
    attribution: 'Zdjęcie: Unsplash',
  },
  {
    keywords: ['twaróg', 'twarogiem', 'serek', 'skyr', 'jogurt'],
    photoUrl: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=600&q=80',
    attribution: 'Zdjęcie: Unsplash',
  },
];

const DEFAULT_FOOD_PHOTO = {
  photoUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
  attribution: 'Zdjęcie: Unsplash',
};

export function getCuratedFoodPhoto(name: string, ingredients: string[] = []): { photoUrl: string; attribution: string } {
  const haystack = `${name} ${ingredients.join(' ')}`.toLowerCase();
  for (const entry of CURATED_MEAL_PHOTOS) {
    if (entry.keywords.some((k) => haystack.includes(k))) {
      return entry;
    }
  }
  return DEFAULT_FOOD_PHOTO;
}

function cacheKey(meal: PlannedMeal): string {
  return `${meal.name}|${meal.ingredients.map((item) => item.product.name).join(',')}`;
}

/** Loads a real food photo for a planned meal. Instant curated match + background Openverse enhancement. */
export function useMealPhoto(meal: PlannedMeal) {
  const key = cacheKey(meal);
  const ingredientNames = meal.ingredients.map(({ product }) => product.name);
  const fallback = getCuratedFoodPhoto(meal.name, ingredientNames);

  const [photo, setPhoto] = useState<{ photoUrl: string; attribution?: string }>(() => {
    return cache.get(key) ?? fallback;
  });

  useEffect(() => {
    if (cache.has(key)) {
      setPhoto(cache.get(key)!);
      return;
    }

    let cancelled = false;
    void invokeEdge('vanguard-nutrition-coach', {
      body: {
        action: 'resolve_meal_photo',
        name: meal.name,
        ingredients: ingredientNames,
      },
      signal: AbortSignal.timeout(15_000),
    })
      .then((result) => {
        if (cancelled || !result?.photoUrl) return;
        const next = { photoUrl: result.photoUrl, attribution: result.attribution };
        cache.set(key, next);
        setPhoto(next);
      })
      .catch(() => {
        // Fallback is already set as initial state
      });

    return () => {
      cancelled = true;
    };
  }, [key, meal.name]);

  return { photoUrl: photo.photoUrl, attribution: photo.attribution, loading: false };
}
