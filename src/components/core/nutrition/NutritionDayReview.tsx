import { useEffect, useState } from 'react';
import { Check, HelpCircle } from 'lucide-react';
import type { NutritionDayCompleteness } from '../../../lib/health/nutritionTracker';
import { fetchNutritionDayReview, upsertNutritionDayReview } from '../../../lib/health/nutritionTrackerApi';
import { Pressable } from '../../ui/ControlPrimitives';

const LABELS: Record<NutritionDayCompleteness, string> = {
  complete: 'Pełny dzień',
  partial: 'Częściowy',
  unknown: 'Nie wiem',
};

export default function NutritionDayReview({ userId, date }: { userId: string; date: string }) {
  const [status, setStatus] = useState<NutritionDayCompleteness | null>(null);
  const [saving, setSaving] = useState<NutritionDayCompleteness | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void fetchNutritionDayReview(userId, date)
      .then((review) => { if (active) setStatus(review?.completeness ?? null); })
      .catch(() => { if (active) setStatus(null); });
    return () => { active = false; };
  }, [date, userId]);

  async function choose(next: NutritionDayCompleteness) {
    setSaving(next);
    setError(null);
    try {
      await upsertNutritionDayReview(userId, date, next);
      setStatus(next);
    } catch {
      setError('Nie udało się zapisać kompletności dnia');
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="space-y-2 border-t border-border-custom/50 pt-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black text-text-primary">Czy to wszystko z tego dnia?</p>
          <p className="text-2xs text-text-muted">Tylko pełne dni uczą kalibrację.</p>
        </div>
        {status && (
          <span className="flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 text-2xs font-bold text-success">
            <Check size={11} /> {LABELS[status]}
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        <Pressable
          size="sm"
          variant={status === 'complete' ? 'primary' : 'outline'}
          loading={saving === 'complete'}
          onClick={() => void choose('complete')}
          className="flex-1 text-xs"
        >
          Tak, to wszystko
        </Pressable>
        <Pressable size="sm" variant="ghost" loading={saving === 'partial'} onClick={() => void choose('partial')} className="text-xs">
          Częściowy
        </Pressable>
        <Pressable size="sm" variant="ghost" loading={saving === 'unknown'} onClick={() => void choose('unknown')} className="gap-1 text-xs">
          <HelpCircle size={12} /> Nie wiem
        </Pressable>
      </div>
      {error && <p role="alert" className="text-2xs text-danger">{error}</p>}
    </div>
  );
}
