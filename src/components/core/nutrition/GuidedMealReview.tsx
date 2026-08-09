import type { MealPhotoResponse } from '../../../lib/edgeTypes';
import { Pressable } from '../../ui/ControlPrimitives';
import Spinner from '../../ui/Spinner';

export default function GuidedMealReview({
  draft,
  answered,
  saving,
  onAnswer,
  onGrams,
  onSave,
  onCancel,
}: {
  draft: MealPhotoResponse;
  answered: Set<string>;
  saving: boolean;
  onAnswer: (questionId: string, option: MealPhotoResponse['questions'][number]['options'][number]) => void;
  onGrams: (itemId: string, grams: number) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const total = Math.round(draft.items.reduce((sum, item) => sum + item.calories, 0));
  const remaining = draft.questions.filter((question) => !answered.has(question.id));

  return (
    <div className="space-y-3 rounded-2xl border border-primary/25 bg-primary/[0.06] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-primary">Sprawdź zdjęcie</p>
          <p className="mt-1 text-sm font-black text-text-primary">
            około {total} kcal
          </p>
          <p className="text-2xs text-text-muted">
            realny zakres {draft.estimate.minKcal}–{draft.estimate.maxKcal} kcal
          </p>
        </div>
        <span className="rounded-full bg-surface px-2.5 py-1 text-2xs font-bold text-text-secondary">
          {draft.items.length} {draft.items.length === 1 ? 'składnik' : 'składniki'}
        </span>
      </div>

      <div className="space-y-1.5">
        {draft.items.map((item) => (
          <div key={item.id} className="flex items-center gap-2 rounded-xl bg-surface/80 px-3 py-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-text-primary">{item.name}</p>
              <p className="text-2xs text-text-muted">{item.calories} kcal · {item.protein} g białka</p>
            </div>
            <label className="flex items-center gap-1 text-2xs font-bold text-text-muted">
              <input
                type="number"
                min={1}
                value={item.grams}
                onChange={(event) => onGrams(item.id, Number(event.target.value) || 1)}
                className="w-16 rounded-lg border border-border-custom bg-surface px-2 py-1.5 text-right text-xs text-text-primary outline-none focus:border-primary"
                aria-label={`Gramy: ${item.name}`}
              />
              g
            </label>
          </div>
        ))}
      </div>

      {remaining.map((question) => (
        <fieldset key={question.id} className="space-y-2 border-t border-border-custom/60 pt-3">
          <legend className="text-xs font-bold text-text-primary">{question.prompt}</legend>
          <div className="flex flex-wrap gap-1.5">
            {question.options.map((option) => (
              <Pressable
                key={option.id}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onAnswer(question.id, option)}
                className="rounded-full border border-border-custom bg-surface px-3 py-1.5 text-2xs font-bold text-text-secondary transition hover:border-primary/50 hover:text-primary"
              >
                {option.label}
              </Pressable>
            ))}
          </div>
        </fieldset>
      ))}

      <p className="text-2xs leading-relaxed text-text-muted">
        Zdjęcie jest podpowiedzią, nie pomiarem. Nic nie zapisze się bez Twojego potwierdzenia.
      </p>
      <div className="flex gap-2">
        <Pressable variant="outline" size="sm" onClick={onCancel} className="flex-1">Anuluj</Pressable>
        <Pressable variant="primary" size="sm" onClick={onSave} disabled={saving} className="flex-1">
          {saving ? <Spinner size="sm" /> : 'Potwierdź i zapisz'}
        </Pressable>
      </div>
    </div>
  );
}
