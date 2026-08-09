import { Camera, Sparkles } from 'lucide-react';
import { useRef } from 'react';
import { Pressable } from '../../ui/ControlPrimitives';
import Spinner from '../../ui/Spinner';
import GuidedMealReview from './GuidedMealReview';
import { useMealPhotoCapture } from './hooks/useMealPhotoCapture';

export default function MealPhotoCapture({
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
  const inputRef = useRef<HTMLInputElement>(null);
  const capture = useMealPhotoCapture({ userId, date, mealType, onSaved });

  return (
    <div className="space-y-3">
      {!capture.draft && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void capture.scan(file);
              event.target.value = '';
            }}
          />
          <Pressable
            type="button"
            variant="outline"
            onClick={() => inputRef.current?.click()}
            disabled={capture.scanning}
            className="w-full justify-center gap-2 border-dashed border-primary/35 bg-primary/[0.04] py-2.5 text-xs font-black text-primary"
          >
            {capture.scanning ? <Spinner size="sm" /> : <Camera size={16} />}
            {capture.scanning ? 'Rozpoznaję posiłek…' : 'Zrób zdjęcie posiłku'}
            {!capture.scanning && <Sparkles size={13} className="opacity-60" />}
          </Pressable>
        </>
      )}

      {capture.error && (
        <p role="alert" className="rounded-xl border border-danger/25 bg-danger/10 px-3 py-2 text-xs text-danger">
          {capture.error}
        </p>
      )}

      {capture.draft && (
        <GuidedMealReview
          draft={capture.draft}
          answered={capture.answered}
          saving={capture.saving}
          onAnswer={capture.answer}
          onGrams={capture.setItemGrams}
          onSave={() => void capture.save()}
          onCancel={capture.cancel}
        />
      )}
    </div>
  );
}
