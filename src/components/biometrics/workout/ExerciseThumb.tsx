import { useState } from 'react';
import { Dumbbell } from 'lucide-react';
import { useExerciseVisual } from '../../../lib/health/exerciseImages';

/** Miniatura ćwiczenia (jak w Bevel): zdjęcie z bazy, a gdy go nie ma — ikona hantli. */
export default function ExerciseThumb({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
  const visual = useExerciseVisual(name);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showImage = visual != null && visual.imageUrl !== failedUrl;
  const box = size === 'sm' ? 'h-10 w-10' : 'h-12 w-12';

  return (
    <span className={`${box} flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border-custom/60 bg-surface-2`} aria-hidden="true">
      {showImage ? (
        <img
          src={visual.imageUrl}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setFailedUrl(visual.imageUrl)}
          className="h-full w-full object-cover"
        />
      ) : (
        <Dumbbell size={18} className="text-text-muted" />
      )}
    </span>
  );
}
