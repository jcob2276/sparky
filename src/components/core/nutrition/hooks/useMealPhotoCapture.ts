import { useMemo, useRef, useState } from 'react';
import type { MealPhotoResponse } from '../../../../lib/edgeTypes';
import { applyGuidedAnswer, type GuidedQuestionOption } from '../../../../lib/health/nutritionTracker';
import { confirmMealCapture } from '../../../../lib/health/nutritionTrackerApi';
import { scanMealPhoto } from '../../../../lib/health/mealPhotoScan';

export function useMealPhotoCapture({
  userId,
  date,
  mealType,
  onSaved,
}: {
  userId: string;
  date: string;
  mealType: string;
  onSaved?: () => void;
}) {
  const [draft, setDraft] = useState<MealPhotoResponse | null>(null);
  const [answered, setAnswered] = useState<Set<string>>(new Set());
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const saveInFlight = useRef(false);
  const captureId = useRef<string | null>(null);

  const estimate = useMemo(() => {
    if (!draft) return null;
    const calories = draft.items.reduce((sum, item) => sum + item.calories, 0);
    return { ...draft.estimate, calories: Math.round(calories) };
  }, [draft]);

  async function scan(file: File) {
    setScanning(true);
    setError(null);
    setDraft(null);
    setAnswered(new Set());
    captureId.current = crypto.randomUUID();
    try {
      setDraft(await scanMealPhoto(file, userId));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Nie udało się przeanalizować zdjęcia');
    } finally {
      setScanning(false);
    }
  }

  function answer(questionId: string, option: GuidedQuestionOption) {
    setDraft((current) => {
      if (!current) return current;
      const question = current.questions.find((candidate) => candidate.id === questionId);
      if (!question) return current;
      return { ...current, items: applyGuidedAnswer(current.items, question, option) };
    });
    setAnswered((current) => new Set(current).add(questionId));
  }

  function setItemGrams(itemId: string, grams: number) {
    setDraft((current) => current ? {
      ...current,
      items: applyGuidedAnswer(current.items, {
        id: `manual-${itemId}`, itemId, prompt: '', impactKcal: 1, options: [],
      }, { id: 'manual', label: 'Korekta', grams }),
    } : current);
  }

  async function save() {
    if (!draft || saveInFlight.current) return;
    saveInFlight.current = true;
    setSaving(true);
    setError(null);
    try {
      await confirmMealCapture({
        userId,
        date,
        mealType,
        source: 'photo',
        items: draft.items,
        estimate: estimate ?? draft.estimate,
        captureId: captureId.current ?? crypto.randomUUID(),
      });
      setDraft(null);
      setAnswered(new Set());
      captureId.current = null;
      onSaved?.();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Nie udało się zapisać posiłku');
    } finally {
      saveInFlight.current = false;
      setSaving(false);
    }
  }

  return {
    draft, estimate, answered, scanning, saving, error,
    scan, answer, setItemGrams, save,
    cancel: () => { captureId.current = null; setDraft(null); },
  };
}
