import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { fetchNutritionDayReview, upsertNutritionDayReview } = vi.hoisted(() => ({
  fetchNutritionDayReview: vi.fn(),
  upsertNutritionDayReview: vi.fn(),
}));

vi.mock('../../../lib/health/nutritionTrackerApi', () => ({
  fetchNutritionDayReview,
  upsertNutritionDayReview,
}));

import NutritionDayReview from './NutritionDayReview';

describe('NutritionDayReview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchNutritionDayReview.mockResolvedValue(null);
    upsertNutritionDayReview.mockResolvedValue(undefined);
  });

  it('marks the day complete only after the explicit user click', async () => {
    render(<NutritionDayReview userId="user-1" date="2026-08-09" />);
    expect(upsertNutritionDayReview).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Tak, to wszystko' }));
    await waitFor(() => expect(upsertNutritionDayReview)
      .toHaveBeenCalledWith('user-1', '2026-08-09', 'complete'));
    expect(await screen.findByText('Pełny dzień')).toBeInTheDocument();
  });

  it('lets the user explicitly declare a partial day', async () => {
    render(<NutritionDayReview userId="user-1" date="2026-08-09" />);
    fireEvent.click(screen.getByRole('button', { name: 'Częściowy' }));
    await waitFor(() => expect(upsertNutritionDayReview)
      .toHaveBeenCalledWith('user-1', '2026-08-09', 'partial'));
  });
});
