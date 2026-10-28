import { ArrowLeft, Trash2, X } from 'lucide-react';
import { Pressable } from '../../../ui/ControlPrimitives';
import type { RecentEntry } from '../hooks/useFoodEntryData';
import { useEntryPhoto } from '../hooks/useEntryPhoto';
import { useHaptics } from '../../../../hooks/useHaptics';
import { parseAmountGrams } from '@vanguard/domain';
import EditNameField from './EditNameField';
import EditPhotoControls from './EditPhotoControls';
import {
  MacroCardsRow,
  MealTypeSegmentedPicker,
  PortionStepper,
  type MacroPreview,
} from './FoodEntrySharedComponents';

interface EditScreenProps {
  userId?: string;
  editingEntry: RecentEntry;
  setEditingEntry: (entry: RecentEntry | null) => void;
  /** True when the screen was reached from the browse list, so "back" has somewhere to go. */
  canGoBack: boolean;
  onClose: () => void;
  onPhotoChanged?: () => void;
  editName: string;
  setEditName: (v: string) => void;
  editReestimating: boolean;
  editEstimateNote: string | null;
  reestimateFromName: () => void;
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

/** Meal photo as the backdrop of the whole sheet: sharp at the top, fading into the surface below. */
function PhotoBackdrop({ url }: { url: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <img src={url} alt="" className="h-full w-full scale-110 object-cover" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-surface/80 to-surface/95" />
    </div>
  );
}

export default function EditScreen({
  userId,
  editingEntry,
  setEditingEntry,
  canGoBack,
  onClose,
  onPhotoChanged,
  editName,
  setEditName,
  editReestimating,
  editEstimateNote,
  reestimateFromName,
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
  const photo = useEntryPhoto(userId, editingEntry, onPhotoChanged);
  const onPhoto = photo.photoUrl != null;
  const mutedTone = onPhoto ? 'text-white/80 drop-shadow' : 'text-text-muted';

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      {photo.photoUrl && <PhotoBackdrop url={photo.photoUrl} />}

      <div className="relative flex shrink-0 items-center justify-between px-3 pt-3">
        {canGoBack ? (
          <Pressable
            variant="ghost"
            size="sm"
            onClick={() => setEditingEntry(null)}
            className={`flex min-h-11 items-center gap-1.5 px-2 active:scale-95 ${mutedTone}`}
          >
            <ArrowLeft size={16} />
            <span className="text-xs font-bold">Wróć</span>
          </Pressable>
        ) : (
          <span className={`px-2 text-2xs font-semibold tracking-wide ${mutedTone}`}>Edytuj wpis</span>
        )}
        <Pressable
          variant="ghost"
          size="sm"
          onClick={onClose}
          aria-label="Zamknij"
          className={`min-h-11 min-w-11 p-1 ${mutedTone}`}
        >
          <X size={18} />
        </Pressable>
      </div>

      <div className="relative min-h-0 flex-1 space-y-5 overflow-y-auto px-5 pb-4 pt-1">
        <div className={onPhoto ? 'pt-10' : ''}>
          <EditNameField
            value={editName}
            originalName={editingEntry.name}
            onChange={setEditName}
            onReestimate={reestimateFromName}
            reestimating={editReestimating}
            estimateNote={editEstimateNote}
            onPhoto={onPhoto}
          />
          {editingEntry.brand && <p className={`mt-1 text-xs font-medium ${mutedTone}`}>{editingEntry.brand}</p>}
        </div>

        <EditPhotoControls
          hasPhoto={onPhoto}
          busy={photo.busy}
          onPick={(file) => void photo.setPhoto(file)}
          onRemove={() => void photo.removePhoto()}
        />

        <PortionStepper grams={editGrams} setGrams={setEditGrams} />
        {parseAmountGrams(editingEntry.amount) == null && (
          <p className="text-xs text-warning">
            Wpis zapisano jako „{editingEntry.amount ?? 'brak ilości'}”, bez masy. Podaj wagę całej tej porcji — zapisane kalorie i makra pozostaną takie same, chyba że wybierzesz ponowne przeliczenie.
          </p>
        )}
        <MealTypeSegmentedPicker mealType={editMealType} setMealType={setEditMealType} />
        <MacroCardsRow preview={editPreview} />

        {error && <p className="text-center text-xs font-medium text-danger">{error}</p>}
      </div>

      <div className="relative flex shrink-0 gap-2 border-t border-border-custom/40 bg-surface/70 px-5 py-3 backdrop-blur-xl">
        <Pressable
          type="button"
          variant="ghost"
          aria-label="Usuń wpis"
          onClick={() => {
            haptics.medium();
            deleteEntry();
          }}
          loading={editDeleting}
          className="flex min-h-12 w-12 items-center justify-center rounded-2xl border border-danger/30 bg-danger/10 text-danger shadow-none hover:bg-danger/20 active:scale-95 ui-interactive"
        >
          <Trash2 size={18} />
        </Pressable>
        <Pressable
          type="button"
          variant="primary"
          onClick={() => {
            haptics.success();
            saveEntryEdit();
          }}
          loading={editSaving}
          disabled={!editPreview}
          className="min-h-12 flex-1 rounded-2xl text-sm font-semibold shadow-sm active:scale-[0.98] ui-interactive"
        >
          Zapisz zmiany
        </Pressable>
      </div>
    </div>
  );
}
