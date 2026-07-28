import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Pencil, Plus, Utensils } from 'lucide-react';
import { fetchShutdownFoodEntries, type ShutdownFoodEntry } from '../../../lib/shutdownApi';
import Button from '../../ui/Button';
import FoodEntryModal from '../nutrition/FoodEntryModal';

interface Props {
  userId: string;
  date: string;
}

export default function ShutdownFoodReview({ userId, date }: Props) {
  const [editingEntry, setEditingEntry] = useState<ShutdownFoodEntry | null>(null);
  const [addingEntry, setAddingEntry] = useState(false);
  const query = useQuery({
    queryKey: ['shutdown-food-review', userId, date],
    queryFn: () => fetchShutdownFoodEntries(userId, date),
  });
  const entries = query.data ?? [];
  const calories = Math.round(entries.reduce((sum, entry) => sum + (entry.calories ?? 0), 0));
  const protein = Math.round(entries.reduce((sum, entry) => sum + (entry.protein ?? 0), 0));

  return (
    <section className="space-y-2 rounded-2xl border border-border-custom/50 bg-surface-2 p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-text-primary">
          <Utensils size={14} className="text-primary" /> Dzisiejsze jedzenie
        </span>
        <div className="flex items-center gap-2">
          <span className="text-2xs font-bold text-text-muted">{calories} kcal · {protein} g białka</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            icon={<Plus size={12} />}
            onClick={() => setAddingEntry(true)}
          >
            Dodaj posiłek
          </Button>
        </div>
      </div>
      {entries.length === 0 ? (
        <p className="text-xs text-text-muted">Brak zapisanych posiłków.</p>
      ) : (
        <div className="space-y-1.5">
          {entries.map((entry) => (
            <div key={entry.id} className="flex items-center gap-2 rounded-xl border border-border-custom/40 bg-surface-solid px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-text-primary">{entry.name}</p>
                <p className="text-2xs text-text-muted">{Math.round(entry.calories ?? 0)} kcal · {entry.amount ?? 'porcja'}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                icon={<Pencil size={12} />}
                onClick={() => setEditingEntry(entry)}
              >
                Edytuj
              </Button>
            </div>
          ))}
        </div>
      )}
      {editingEntry ? (
        <FoodEntryModal
          initialEditEntry={editingEntry}
          onClose={() => setEditingEntry(null)}
          onSaved={() => {
            setEditingEntry(null);
            void query.refetch();
          }}
        />
      ) : null}
      {addingEntry ? (
        <FoodEntryModal
          onClose={() => setAddingEntry(false)}
          onSaved={() => {
            setAddingEntry(false);
            void query.refetch();
          }}
        />
      ) : null}
    </section>
  );
}
