import { beforeEach, describe, expect, it, vi } from 'vitest';
import { scanRestaurantMenu, scanFridgeIngredients } from './foodAssistApi';
import { invokeEdge } from '../supabase';

vi.mock('../supabase', () => ({
  invokeEdge: vi.fn(),
}));

describe('foodAssistApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('scans restaurant menu via text and returns recommendations without logging consumption', async () => {
    const mockAnalysis = {
      summary: 'Menu z dobrą ofertą dań z grilla.',
      dishes: [
        {
          id: 'dish_1',
          name: 'Polędwiczki z grilla z warzywami',
          estimatedKcal: 550,
          estimatedProtein: 48,
          estimatedCarbs: 20,
          estimatedFat: 18,
          whyRecommended: 'Wysokie białko, czyste warzywa bez ciężkich sosów.',
          waiterTip: 'Poproś o sos w osobnym naczyniu.',
          confidence: 'high' as const,
        },
      ],
      userNotice: 'Wybór pozycji z menu jest rekomendacją doradczą — nie zapisuje automatycznie posiłku w Twoim dzienniku spożycia.',
    };

    vi.mocked(invokeEdge).mockResolvedValueOnce({ menuAnalysis: mockAnalysis } as never);

    const result = await scanRestaurantMenu({ text: 'Polędwiczki 45zł, Burger 50zł' }, 'u1');
    expect(result.dishes).toHaveLength(1);
    expect(result.dishes[0].name).toBe('Polędwiczki z grilla z warzywami');
    expect(result.userNotice).toContain('nie zapisuje automatycznie');
    expect(invokeEdge).toHaveBeenCalledWith('parse-food-nl', expect.objectContaining({
      body: expect.objectContaining({ mode: 'restaurant_menu', userId: 'u1' }),
    }));
  });

  it('scans fridge ingredients and returns recipe suggestions with uncertainty notice', async () => {
    const mockFridge = {
      detectedIngredients: [{ name: 'Jaja', estimatedGrams: 200, confidence: 'high' as const }],
      suggestions: [
        {
          id: 'sug_1',
          name: 'Omlet warzywny',
          prepMinutes: 15,
          ingredientsUsed: ['Jaja', 'Szpinak'],
          missingIngredients: ['Sól'],
          estimatedKcal: 380,
          protein: 24,
          carbs: 6,
          fat: 20,
          instructions: 'Rozmieszaj jajka i usmaż ze szpinakiem.',
        },
      ],
      uncertaintyNotice: 'Gramatura składników w lodówce jest szacunkowa.',
    };

    vi.mocked(invokeEdge).mockResolvedValueOnce({ fridgeAnalysis: mockFridge } as never);

    const result = await scanFridgeIngredients({ text: 'jajka, szpinak, masło' }, 'u1');
    expect(result.suggestions).toHaveLength(1);
    expect(result.suggestions[0].name).toBe('Omlet warzywny');
    expect(result.uncertaintyNotice).toContain('szacunkowa');
    expect(invokeEdge).toHaveBeenCalledWith('parse-food-nl', expect.objectContaining({
      body: expect.objectContaining({ mode: 'fridge_ingredients', userId: 'u1' }),
    }));
  });
});
