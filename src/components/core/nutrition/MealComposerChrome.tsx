import { useRef, useState } from 'react';
import { Camera, ScanLine, Search, Sparkles } from 'lucide-react';
import { notify } from '../../../lib/notify';
import { pickMealPhotoNative } from '../../../lib/native/mealPhotoCapture';
import { isNativePlatform } from '../../../lib/native/platform';
import { ControlInput, Pressable } from '../../ui/ControlPrimitives';
import Spinner from '../../ui/Spinner';
import MacroProgressBar from './MacroProgressBar';
import { MealPhotoSourceSheet } from './MealPhotoSourceSheet';

export { ComposerHeader } from './MealComposerHeader';
export { ComposerSearch } from './MealComposerSearch';

export function ComposerProgress({
  totals,
  qualityPending,
  macros,
}: {
  totals: {
    calories: number;
    protein: number;
    targetKcal: number | null;
    targetProtein: number | null;
    avgFoodQuality: number | null;
    foodQualityAnalysis: string | null;
  };
  qualityPending: boolean;
  macros?: { carbs: number; fat: number };
}) {
  const remainingKcal = Math.max(0, Math.round((totals.targetKcal ?? 2000) - totals.calories));
  const remainingProtein = Math.max(0, Math.round(((totals.targetProtein ?? 0) - totals.protein) * 10) / 10);
  const hasTargets = totals.targetKcal != null || totals.targetProtein != null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs font-bold text-text-secondary">
        <div>
          <span className="font-display text-sm font-black text-text-primary">{Math.round(totals.calories)}</span>
          <span className="text-text-muted"> / {totals.targetKcal ?? 2000} kcal</span>
        </div>
        {totals.targetProtein != null && (
          <div>
            <span className="font-display text-sm font-black text-text-primary">{Math.round(totals.protein)}</span>
            <span className="text-text-muted"> / {totals.targetProtein} g B</span>
          </div>
        )}
      </div>
      {hasTargets && (totals.calories > 0 || totals.protein > 0) && (
        <p className="text-2xs font-semibold text-text-muted">
          Zostało{' '}
          <span className="font-black text-text-primary">{remainingKcal} kcal</span>
          {totals.targetProtein != null && (
            <>
              {' · '}
              <span className="font-black text-primary">{remainingProtein} g B</span>
            </>
          )}
        </p>
      )}
      <MacroProgressBar
        calories={totals.calories}
        protein={totals.protein}
        carbs={macros?.carbs ?? 0}
        fat={macros?.fat ?? 0}
        targetKcal={totals.targetKcal ?? 2000}
      />
      {(qualityPending || totals.avgFoodQuality != null || totals.foodQualityAnalysis) && (
        <div className="flex items-start gap-2 rounded-xl bg-surface-solid/30 border border-border-custom/40 p-2 text-xs leading-relaxed text-text-secondary">
          {qualityPending && !totals.foodQualityAnalysis ? (
            <span className="animate-pulse italic text-text-muted">Liczenie jakości posiłków…</span>
          ) : totals.avgFoodQuality != null ? (
            <>
              <span className="shrink-0 rounded-md bg-warning/15 px-1.5 py-0.5 font-display text-2xs font-black text-warning">
                Jakość {totals.avgFoodQuality}
              </span>
              <span className="text-2xs text-text-muted">
                {totals.foodQualityAnalysis ? totals.foodQualityAnalysis.split(/[.!?]/)[0]?.trim() : null}
              </span>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}

export function ComposerInput({
  text, setText, parsing, saving, scanningPhoto, searchOpen,
  onParse, onPhotoPick, onToggleSearch, onOpenScanner, photoInputRef,
}: {
  text: string;
  setText: (value: string) => void;
  parsing: boolean;
  saving: boolean;
  scanningPhoto: boolean;
  searchOpen: boolean;
  onParse: () => void;
  onPhotoPick: (file: File) => void;
  onToggleSearch: () => void;
  onOpenScanner: () => void;
  photoInputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const [photoSheetOpen, setPhotoSheetOpen] = useState(false);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  const handleSelectCamera = async () => {
    try {
      if (isNativePlatform()) {
        const file = await pickMealPhotoNative('camera');
        if (file) onPhotoPick(file);
        return;
      }
      photoInputRef.current?.click();
    } catch (cause: unknown) {
      notify(cause instanceof Error ? cause.message : 'Nie udało się otworzyć aparatu', 'error');
    }
  };

  const handleSelectGallery = async () => {
    try {
      if (isNativePlatform()) {
        const file = await pickMealPhotoNative('photos');
        if (file) onPhotoPick(file);
        return;
      }
      galleryInputRef.current?.click();
    } catch (cause: unknown) {
      notify(cause instanceof Error ? cause.message : 'Nie udało się otworzyć galerii', 'error');
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <ControlInput
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              onParse();
            }
          }}
          placeholder='np. 2 jajka, twaróg 150g, kawa z mlekiem'
          className="min-w-0 flex-1 rounded-2xl border border-border-custom bg-surface-solid/50 px-4 py-3 text-sm outline-none transition-all duration-[var(--motion-fast)] ease-[var(--ease-out,ease-out)] placeholder:text-text-muted/50 focus:border-primary/50 focus:bg-surface focus:shadow-sm"
        />
        <Pressable
          type="button"
          onClick={onParse}
          disabled={!text.trim() || parsing || saving}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-on-accent transition-all duration-[var(--motion-fast)] ease-[var(--ease-out,ease-out)] active:scale-[0.92] disabled:opacity-40"
          title="Parsuj posiłek"
        >
          {parsing ? <Spinner size="sm" className="!border-on-accent/30 !border-t-on-accent" /> : <Sparkles size={18} />}
        </Pressable>
      </div>
      <div className="flex items-center gap-1.5">
        <ControlInput
          ref={photoInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onPhotoPick(file);
            event.target.value = '';
          }}
        />
        <ControlInput
          ref={galleryInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onPhotoPick(file);
            event.target.value = '';
          }}
        />
        <ComposerToolButton
          icon={scanningPhoto ? <Spinner size="sm" /> : <Camera size={15} />}
          label={scanningPhoto ? 'Skanuję…' : 'Zdjęcie'}
          onClick={() => setPhotoSheetOpen(true)}
          disabled={scanningPhoto || saving}
        />
        <ComposerToolButton icon={<ScanLine size={15} />} label="Kod" onClick={onOpenScanner} disabled={saving} />
        <ComposerToolButton
          icon={<Search size={15} />}
          label="Szukaj"
          onClick={onToggleSearch}
          active={searchOpen}
          disabled={saving}
        />
      </div>
      <MealPhotoSourceSheet
        open={photoSheetOpen}
        onClose={() => setPhotoSheetOpen(false)}
        onSelectCamera={() => void handleSelectCamera()}
        onSelectGallery={() => void handleSelectGallery()}
      />
    </div>
  );
}

function ComposerToolButton({
  icon, label, onClick, disabled, active,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <Pressable
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`touch-manipulation flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-2 py-2 text-2xs font-black uppercase tracking-wide transition-all duration-[var(--motion-fast)] ease-[var(--ease-out,ease-out)] active:scale-[0.97] ${
        active ? 'border-primary/40 bg-primary/10 text-primary' : 'border-border-custom text-text-muted hover:bg-surface-solid/70'
      }`}
    >
      {icon}
      {label}
    </Pressable>
  );
}
