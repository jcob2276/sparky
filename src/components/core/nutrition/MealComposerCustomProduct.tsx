import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Pressable, ControlInput } from '../../ui/ControlPrimitives';
import { upsertCustomFood } from '../../../lib/health/foodLibraryApi';
import type { FoodBase } from '../../../lib/health/foodTypes';

export default function MealComposerCustomProduct({
  userId,
  saving,
  onCreated,
}: {
  userId: string;
  saving: boolean;
  onCreated: (food: FoodBase) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [grams, setGrams] = useState('100');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      const food = await upsertCustomFood(userId, {
        name,
        calories: Number.parseFloat(calories),
        protein: Number.parseFloat(protein) || 0,
        defaultGrams: Number.parseInt(grams, 10) || 100,
      });
      onCreated(food);
      setOpen(false);
      setName('');
      setCalories('');
      setProtein('');
      setGrams('100');
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'Nie udało się zapisać produktu');
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <Pressable
        type="button"
        variant="ghost"
        size="sm"
        disabled={saving}
        onClick={() => setOpen(true)}
        className="gap-1 text-2xs font-bold text-text-muted"
      >
        <Plus size={12} /> Własny produkt
      </Pressable>
    );
  }

  return (
    <div className="space-y-2 rounded-xl border border-dashed border-primary/30 bg-primary/[0.03] p-3">
      <p className="text-2xs font-black uppercase tracking-wider text-primary">Własny produkt (na 100g)</p>
      <ControlInput
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Nazwa, np. Twaróg wiejski"
        className="w-full rounded-xl border border-border-custom bg-surface px-3 py-2 text-sm"
      />
      <div className="grid grid-cols-3 gap-2">
        <ControlInput
          value={calories}
          onChange={(event) => setCalories(event.target.value)}
          placeholder="kcal"
          inputMode="decimal"
          className="rounded-xl border border-border-custom bg-surface px-2 py-2 text-sm"
        />
        <ControlInput
          value={protein}
          onChange={(event) => setProtein(event.target.value)}
          placeholder="B (g)"
          inputMode="decimal"
          className="rounded-xl border border-border-custom bg-surface px-2 py-2 text-sm"
        />
        <ControlInput
          value={grams}
          onChange={(event) => setGrams(event.target.value)}
          placeholder="Domyślnie g"
          inputMode="numeric"
          className="rounded-xl border border-border-custom bg-surface px-2 py-2 text-sm"
        />
      </div>
      {error && <p role="alert" className="text-2xs text-danger">{error}</p>}
      <div className="flex gap-2">
        <Pressable
          type="button"
          variant="primary"
          size="sm"
          loading={loading}
          disabled={!name.trim() || !calories.trim()}
          onClick={() => void submit()}
          className="flex-1 text-xs"
        >
          Dodaj do posiłku
        </Pressable>
        <Pressable type="button" variant="ghost" size="sm" onClick={() => setOpen(false)} className="text-xs">
          Anuluj
        </Pressable>
      </div>
    </div>
  );
}
