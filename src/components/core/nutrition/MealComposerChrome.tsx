import { Camera, ScanLine, Search, Sparkles } from 'lucide-react';
import type { MealTypeId } from '../../../lib/health/foodLogging';
import type { FoodBase } from '../../../lib/health/foodTypes';
import { ControlInput, Pressable } from '../../ui/ControlPrimitives';
import Spinner from '../../ui/Spinner';
import FoodRow from './FoodRow';
import { scale } from './hooks/foodEntryUtils';

export function ComposerHeader({
  logDate, setLogDate, mealType, setMealType, today, yesterday, mealTypes,
}: {
  logDate: string;
  setLogDate: (value: string) => void;
  mealType: MealTypeId;
  setMealType: (value: MealTypeId) => void;
  today: string;
  yesterday: string;
  mealTypes: ReadonlyArray<{ id: string; label: string }>;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="font-display text-xs font-black uppercase tracking-widest text-text-primary">Posiłek</p>
        <div className="flex items-center gap-1.5">
          {([['Dziś', today], ['Wczoraj', yesterday]] as const).map(([label, date]) => (
            <Pressable
              key={label}
              type="button"
              onClick={() => setLogDate(date)}
              className={`rounded-full px-3 py-1 text-2xs font-bold ${
                logDate === date ? 'bg-primary text-on-accent shadow-sm' : 'border border-border-custom text-text-secondary'
              }`}
            >
              {label}
            </Pressable>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {mealTypes.map((meal) => (
          <Pressable
            key={meal.id}
            type="button"
            onClick={() => setMealType(meal.id as MealTypeId)}
            className={`rounded-full px-3 py-1.5 text-2xs font-black uppercase tracking-wider ${
              mealType === meal.id
                ? 'bg-primary/20 text-primary border border-primary/40'
                : 'border border-border-custom text-text-muted'
            }`}
          >
            {meal.label}
          </Pressable>
        ))}
      </div>
    </div>
  );
}

export function ComposerProgress({
  totals,
  qualityPending,
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
      <div className="h-1.5 overflow-hidden rounded-full bg-border-custom/40">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            totals.targetKcal && totals.calories > totals.targetKcal ? 'bg-warning' : 'bg-primary'
          }`}
          style={{ width: `${Math.min(100, ((totals.calories / (totals.targetKcal || 2000)) * 100))}%` }}
        />
      </div>
      {(qualityPending || totals.avgFoodQuality != null || totals.foodQualityAnalysis) && (
        <p className="text-xs font-medium leading-relaxed text-text-secondary">
          {qualityPending && !totals.foodQualityAnalysis ? (
            <span className="animate-pulse italic text-text-muted">Liczenie jakości posiłków…</span>
          ) : totals.avgFoodQuality != null ? (
            <>
              <span className="mr-1.5 font-display font-black text-warning">
                Jakość {totals.avgFoodQuality}
              </span>
              {totals.foodQualityAnalysis ? totals.foodQualityAnalysis.split(/[.!?]/)[0]?.trim() : null}
            </>
          ) : null}
        </p>
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
          className="min-w-0 flex-1 rounded-2xl border border-border-custom bg-surface-solid/50 px-4 py-3 text-sm outline-none transition placeholder:text-text-muted/50 focus:border-primary/50"
        />
        <Pressable
          type="button"
          onClick={onParse}
          disabled={!text.trim() || parsing || saving}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-on-accent disabled:opacity-40"
          title="Parsuj posiłek"
        >
          {parsing ? <Spinner size="sm" className="!border-on-accent/30 !border-t-on-accent" /> : <Sparkles size={18} />}
        </Pressable>
      </div>
      <div className="flex items-center gap-1.5">
        <input
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
        <ComposerToolButton
          icon={scanningPhoto ? <Spinner size="sm" /> : <Camera size={15} />}
          label={scanningPhoto ? 'Skanuję…' : 'Zdjęcie'}
          onClick={() => photoInputRef.current?.click()}
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
    </div>
  );
}

export function ComposerSearch({
  query, setQuery, searching, results, externalSearching, externalSearched, searchExternal, onPick,
}: {
  query: string;
  setQuery: (value: string) => void;
  searching: boolean;
  results: FoodBase[];
  externalSearching: boolean;
  externalSearched: boolean;
  searchExternal: () => void;
  onPick: (food: FoodBase) => void;
}) {
  return (
    <div className="space-y-2 rounded-2xl border border-border-custom/70 bg-surface-solid/30 p-3">
      <ControlInput
        autoFocus
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Szukaj produktu…"
        className="w-full rounded-xl border border-border-custom bg-surface px-3 py-2 text-sm"
      />
      {searching && <Spinner size="sm" className="mx-auto" />}
      {!searching && query.trim().length >= 2 && results.length === 0 && !externalSearched && (
        <Pressable variant="outline" size="sm" onClick={searchExternal} loading={externalSearching} className="w-full text-xs">
          Szukaj w bazie zewnętrznej
        </Pressable>
      )}
      <div className="max-h-56 space-y-1 overflow-y-auto">
        {results.map((food) => (
          <FoodRow
            key={`${food.name}-${food.brand ?? ''}`}
            name={food.name}
            subtitle={food.brand}
            calories={scale(food.calories, food.defaultGrams ?? 100)}
            onTap={() => onPick(food)}
            onQuickAdd={() => onPick(food)}
            quickAddIcon={<span className="text-xs font-black">+</span>}
          />
        ))}
      </div>
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
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-2 py-2 text-2xs font-black uppercase tracking-wide ${
        active ? 'border-primary/40 bg-primary/10 text-primary' : 'border-border-custom text-text-muted'
      }`}
    >
      {icon}
      {label}
    </Pressable>
  );
}
