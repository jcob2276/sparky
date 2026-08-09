import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import GuidedMealReview from './GuidedMealReview';

const draft = {
  parserVersion: 'meal-photo-v1' as const,
  estimate: { calories: 500, minKcal: 420, maxKcal: 650 },
  questions: [{
    id: 'oil', itemId: 'meal', prompt: 'Czy był dodany olej?', impactKcal: 120,
    options: [{ id: 'yes', label: 'Tak', calories: 90 }, { id: 'unknown', label: 'Nie wiem' }],
  }],
  items: [{
    id: 'meal', name: 'Kurczak z ryżem', grams: 400, calories: 500, protein: 42, carbs: 55, fat: 12,
    confidence: 'medium' as const, source: 'llm' as const, portionRange: { minGrams: 330, maxGrams: 480 },
    questionCandidates: [],
  }],
};

describe('GuidedMealReview', () => {
  it('shows uncertainty and never exposes a voice logging action', () => {
    render(<GuidedMealReview draft={draft} answered={new Set()} saving={false}
      onAnswer={vi.fn()} onGrams={vi.fn()} onSave={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText('realny zakres 420–650 kcal')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Nie wiem' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /mikrofon|głos/i })).not.toBeInTheDocument();
  });

  it('requires an explicit confirmation before save', () => {
    const onSave = vi.fn();
    render(<GuidedMealReview draft={draft} answered={new Set()} saving={false}
      onAnswer={vi.fn()} onGrams={vi.fn()} onSave={onSave} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Potwierdź i zapisz' }));
    expect(onSave).toHaveBeenCalledOnce();
  });
});
