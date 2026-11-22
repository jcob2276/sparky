import { Utensils } from 'lucide-react';
import type { PlannedMeal } from '@vanguard/domain';
import { useMealPhoto } from './useMealPhoto';

/** Hero food photo for a planned meal. Loads automatically — no manual “show photo” step. */
export default function MealIllustration({ meal, variant = 'hero' }: { meal: PlannedMeal; variant?: 'hero' | 'thumb' }) {
  const { photoUrl, attribution, loading } = useMealPhoto(meal);
  const thumb = variant === 'thumb';

  if (photoUrl) {
    return (
      <figure className={thumb ? 'meal-planner-thumb overflow-hidden p-0' : 'meal-photo-hero'}>
        <img
          className={thumb ? 'h-full w-full object-cover' : 'meal-photo-hero-img'}
          src={photoUrl}
          alt={meal.name}
          loading="lazy"
        />
        {!thumb && attribution && (
          <figcaption className="mt-2 text-center text-2xs text-text-muted">{attribution}</figcaption>
        )}
      </figure>
    );
  }

  return (
    <div
      className={thumb ? 'meal-planner-thumb' : 'meal-photo-hero meal-photo-hero--empty'}
      aria-busy={loading || undefined}
      aria-label={loading ? 'Ładuję zdjęcie dania' : 'Brak zdjęcia dania'}
    >
      <Utensils size={thumb ? 22 : 36} strokeWidth={1.6} className="text-text-muted" />
      {!thumb && (
        <p className="mt-2 text-xs text-text-muted">
          {loading ? 'Ładuję zdjęcie dania…' : 'Brak dopasowanego zdjęcia'}
        </p>
      )}
    </div>
  );
}
