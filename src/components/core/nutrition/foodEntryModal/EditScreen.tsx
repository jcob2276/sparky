import { ArrowLeft, Trash2 } from 'lucide-react';
import { Pressable } from '../../../ui/ControlPrimitives';
import type { RecentEntry } from '../hooks/useFoodEntryData';
import { useHaptics } from '../../../../hooks/useHaptics';
import {
  MacroCardsRow,
  MealTypeSegmentedPicker,
  PortionStepper,
  type MacroPreview,
} from './FoodEntrySharedComponents';

interface EditScreenProps {
  editingEntry: RecentEntry;
  setEditingEntry: (entry: RecentEntry | null) => void;
  editGrams: string;
  setEditGrams: (v: string) => void;
  editMealType: string;
  setEditMealType: (v: string) => void;
  editPreview: MacroPreview | null;
  error: string | null;
  editSaving: boolean;
  editDeleting: boolean;
  saveEntryEdit: () => void;
  deleteEntry: () => void;
}

export default function EditScreen({
  editingEntry,
  setEditingEntry,
  editGrams,
  setEditGrams,
  editMealType,
  setEditMealType,
  editPreview,
  error,
  editSaving,
  editDeleting,
  saveEntryEdit,
  deleteEntry,
}: EditScreenProps) {
  const haptics = useHaptics();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Pressable
          variant="ghost"
          size="sm"
          onClick={() => setEditingEntry(null)}
          className="flex items-center gap-1.5 px-0 py-0 text-text-muted hover:text-text-primary transition-colors active:scale-95"
        >
          <ArrowLeft size={16} />
          <span className="text-xs font-bold">Wróć</span>
        </Pressable>
      </div>

      <div>
        <p className="text-lg font-black text-text-primary leading-tight tracking-tight">{editingEntry.name}</p>
        {editingEntry.brand && (
          <p className="mt-0.5 text-xs font-medium text-text-muted">{editingEntry.brand}</p>
        )}
      </div>

      <PortionStepper grams={editGrams} setGrams={setEditGrams} />

      <MealTypeSegmentedPicker mealType={editMealType} setMealType={setEditMealType} />

      <MacroCardsRow preview={editPreview} />

      {error && <p className="text-xs text-danger text-center font-medium">{error}</p>}

      <div className="flex gap-2 pt-1">
        <Pressable
          type="button"
          variant="ghost"
          onClick={() => {
            haptics.medium();
            deleteEntry();
          }}
          loading={editDeleting}
          className="flex items-center gap-1.5 rounded-2xl border border-danger/30 bg-danger/10 px-4 text-xs font-black text-danger hover:bg-danger/20 active:scale-95 ui-interactive shadow-none"
        >
          <Trash2 size={15} />
          <span>Usuń</span>
        </Pressable>
        <Pressable
          type="button"
          variant="primary"
          onClick={() => {
            haptics.success();
            saveEntryEdit();
          }}
          loading={editSaving}
          className="flex-1 rounded-2xl py-3 text-sm font-black active:scale-[0.98] ui-interactive shadow-sm"
        >
          Zapisz zmiany
        </Pressable>
      </div>
    </div>
  );
}
