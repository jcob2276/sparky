import { Pressable } from '../../ui/ControlPrimitives';
import { answerGuidedQuestion, selectGuidedQuestions, type MealDraftItem } from '../../../lib/health/nutritionTracker';

/**
 * Jedno–trzy pytania, które najbardziej zmienią wynik (sos, stan ryżu, porcja), zadane po analizie zdjęcia.
 * Każde ma „nie wiem”: wtedy zostaje szacunek z zakresem, bez wymuszania fałszywej dokładności.
 */
export default function DraftGuidedQuestions({
  items,
  onChange,
}: {
  items: MealDraftItem[];
  onChange: (items: MealDraftItem[]) => void;
}) {
  const questions = selectGuidedQuestions(items);
  if (!questions.length) return null;

  return (
    <div className="space-y-2 rounded-xl bg-surface/70 p-2.5" aria-label="Pytania doprecyzowujące">
      {questions.map((question) => (
        <fieldset key={question.id} className="space-y-1.5">
          <legend className="text-xs font-bold text-text-primary">
            {question.prompt}
            <span className="ml-1.5 text-2xs font-semibold text-text-muted">do ±{Math.round(question.impactKcal)} kcal</span>
          </legend>
          <div className="flex flex-wrap gap-1.5">
            {question.options.map((option) => (
              <Pressable
                key={option.id}
                variant="outline"
                size="sm"
                onClick={() => onChange(answerGuidedQuestion(items, question, option))}
              >
                {option.label}
              </Pressable>
            ))}
            {!question.options.some((option) => option.id === 'unknown') && (
              <Pressable
                variant="ghost"
                size="sm"
                onClick={() => onChange(answerGuidedQuestion(items, question, { id: 'unknown', label: 'Nie wiem' }))}
              >
                Nie wiem
              </Pressable>
            )}
          </div>
        </fieldset>
      ))}
    </div>
  );
}
