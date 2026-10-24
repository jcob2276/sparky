import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { RecentEntry } from '../hooks/useFoodEntryData';

const photoState = vi.hoisted(() => ({ photoUrl: null as string | null }));

vi.mock('../hooks/useEntryPhoto', () => ({
  useEntryPhoto: () => ({ photoUrl: photoState.photoUrl, busy: false, setPhoto: vi.fn(), removePhoto: vi.fn() }),
}));
vi.mock('../../../../hooks/useHaptics', () => ({
  useHaptics: () => ({ light: vi.fn(), medium: vi.fn(), success: vi.fn(), selection: vi.fn() }),
}));
vi.mock('../../../../lib/native/platform', () => ({ isNativePlatform: () => false }));

import EditScreen from './EditScreen';

const entry: RecentEntry = {
  id: 'e1', name: 'sernik domowy', brand: null, calories: 303, protein: 8, carbs: 20, fat: 21.2,
  amount: '100 g', date: '2026-10-24', meal_type: 'breakfast', meal_group_id: 'g1',
};

function renderScreen(canGoBack = false) {
  return render(
    <EditScreen
      userId="u1"
      editingEntry={entry}
      setEditingEntry={vi.fn()}
      canGoBack={canGoBack}
      onClose={vi.fn()}
      editGrams="100"
      setEditGrams={vi.fn()}
      editMealType="breakfast"
      setEditMealType={vi.fn()}
      editPreview={{ calories: 303, protein: 8, carbs: 20, fat: 21.2 }}
      error={null}
      editSaving={false}
      editDeleting={false}
      saveEntryEdit={vi.fn()}
      deleteEntry={vi.fn()}
    />,
  );
}

describe('EditScreen', () => {
  it('offers photo sources and no backdrop when the meal has no photo', () => {
    photoState.photoUrl = null;
    const { container } = renderScreen();
    expect(screen.getByRole('button', { name: /aparat/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /galeria/i })).toBeTruthy();
    expect(container.querySelector('img')).toBeNull();
    expect(screen.queryByRole('button', { name: /wróć/i })).toBeNull();
  });

  it('uses the photo as the sheet backdrop and offers replace/remove', () => {
    photoState.photoUrl = 'https://signed/g1';
    const { container } = renderScreen(true);
    expect(container.querySelector('img')?.getAttribute('src')).toBe('https://signed/g1');
    expect(screen.getByRole('button', { name: /zmień zdjęcie/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /usuń zdjęcie/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /wróć/i })).toBeTruthy();
  });
});
