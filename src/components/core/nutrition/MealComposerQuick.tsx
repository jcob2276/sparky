import { History, RotateCcw, Sparkles, Star } from 'lucide-react';
import { Pressable } from '../../ui/ControlPrimitives';
import type { QuickChip } from '../../../lib/health/mealComposerQuick';

interface RepeatCard {
  id: string;
  name: string;
  calories: number;
  protein: number;
  subtitle: string;
  onRepeat: () => void;
}

export default function MealComposerQuick({
  repeatCards,
  chips,
  saving,
  onChip,
}: {
  repeatCards: RepeatCard[];
  chips: QuickChip[];
  saving: boolean;
  onChip: (chip: QuickChip) => void;
}) {
  if (!repeatCards.length && !chips.length) return null;

  return (
    <div className="space-y-2">
      {repeatCards.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-2xs font-black uppercase tracking-wider text-text-muted">Szybko powtórz</p>
          {repeatCards.map((card) => (
            <Pressable
              key={card.id}
              type="button"
              disabled={saving}
              onClick={card.onRepeat}
              className="flex w-full items-center gap-3 rounded-2xl border border-border-custom/70 bg-surface-solid/35 px-3 py-2.5 text-left transition hover:border-primary/35 hover:bg-primary/[0.04] disabled:opacity-50"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                {card.id.startsWith('gap-') ? <Sparkles size={15} /> : <RotateCcw size={15} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-black text-text-primary">{card.name}</span>
                <span className="mt-0.5 block text-2xs text-text-muted">
                  {card.calories} kcal · {card.protein} g B · {card.subtitle}
                </span>
              </span>
              <span className="shrink-0 text-2xs font-black uppercase tracking-wide text-primary">Powtórz</span>
            </Pressable>
          ))}
        </div>
      )}

      {chips.length > 0 && (
        <div className="space-y-1.5">
          <p className="flex items-center gap-1.5 text-2xs font-black uppercase tracking-wider text-text-muted">
            <History size={11} /> Szybkie
          </p>
          <div className="flex gap-1.5 overflow-x-auto pb-0.5">
            {chips.map((chip) => (
              <Pressable
                key={chip.id}
                type="button"
                disabled={saving}
                onClick={() => onChip(chip)}
                className="shrink-0 rounded-full border border-border-custom bg-surface-solid/40 px-3 py-1.5 text-left hover:border-primary/35 disabled:opacity-50"
                title={chip.detail}
              >
                <span className="flex items-center gap-1">
                  {chip.kind === 'favorite' && <Star size={10} className="text-primary" />}
                  <span className="block max-w-[9rem] truncate text-xs font-bold text-text-primary">{chip.name}</span>
                </span>
                <span className="block text-2xs font-semibold text-text-muted">{chip.detail}</span>
              </Pressable>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
