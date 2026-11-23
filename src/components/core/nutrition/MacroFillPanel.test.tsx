// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import MacroFillPanel from './MacroFillPanel';

vi.mock('../../../lib/health/foodEntryListsApi', () => ({
  fetchFavorites: vi.fn(async () => [{
    id: 'fav1', library_id: 'lib1', name: 'Skyr naturalny', brand: null, barcode: null,
    calories: 63, protein: 11, carbs: 4, fat: 0.2, fiber: null, sugar: null, default_grams: 150, use_count: 9,
  }]),
}));
vi.mock('./FoodLibraryReview', () => ({ default: () => <p>Przegląd produktów</p> }));

const renderPanel = (onAdd = vi.fn()) => render(
  <QueryClientProvider client={new QueryClient()}>
    <MacroFillPanel userId="u1" remaining={{ kcal: 600, protein: 40, fat: -5, carbs: 80 }} onAdd={onAdd} />
  </QueryClientProvider>,
);

describe('MacroFillPanel', () => {
  it('proponuje zestaw z ulubionych i ostrzega o przekroczonym tłuszczu', async () => {
    const onAdd = vi.fn();
    renderPanel(onAdd);
    expect(await screen.findByText(/Skyr naturalny/)).toBeVisible();
    expect(screen.getByText(/Tłuszcz już przekroczony/)).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Dodaj do posiłku' }));
    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(onAdd.mock.calls[0][0][0].food.name).toBe('Skyr naturalny');
    expect(onAdd.mock.calls[0][0][0].grams).toBeGreaterThan(0);
  });

  it('otwiera przegląd produktów', async () => {
    renderPanel();
    fireEvent.click(await screen.findByRole('button', { name: 'Sprawdź swoje produkty' }));
    expect(screen.getByText('Przegląd produktów')).toBeVisible();
  });
});
