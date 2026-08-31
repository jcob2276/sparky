import { useMemo } from 'react';
import { Card } from '../../ui/Card';
import BarcodeScanner from './BarcodeScanner';
import MealComposerCustomProduct from './MealComposerCustomProduct';
import MealComposerDraft from './MealComposerDraft';
import MealComposerDraftPlaceholder from './MealComposerDraftPlaceholder';
import MealComposerQuick from './MealComposerQuick';
import { ComposerHeader, ComposerInput, ComposerProgress, ComposerSearch } from './MealComposerChrome';
import NutritionDayReview from './NutritionDayReview';
import { useMealComposer } from './hooks/useMealComposer';
import { useSession } from '../../../store/useStore';

export default function MealComposer({
  onSaved,
  refreshSignal = 0,
}: {
  onSaved?: () => void;
  refreshSignal?: number;
}) {
  const session = useSession();
  const c = useMealComposer(onSaved, refreshSignal);

  const repeatCards = useMemo(() => {
    const cards = [];
    if (c.repeatSuggestions.yesterday) {
      const meal = c.repeatSuggestions.yesterday;
      cards.push({
        id: meal.id,
        name: meal.name,
        calories: meal.calories,
        protein: meal.protein,
        subtitle: `wczorajsze ${c.mealLabelForType(c.mealType)}`,
        onRepeat: () => void c.repeatYesterday(),
      });
    }
    for (const memory of c.repeatSuggestions.habitual) {
      cards.push({
        id: memory.id,
        name: memory.name,
        calories: memory.calories,
        protein: memory.protein,
        subtitle: `Twoje ${c.mealLabelForType(c.mealType)} · ${memory.confirmedCount}×`,
        onRepeat: () => void c.repeatMemory(memory.items, memory.name),
      });
    }
    if (c.repeatSuggestions.gap) {
      const gap = c.repeatSuggestions.gap;
      cards.push({
        id: `gap-${gap.id}`,
        name: gap.name,
        calories: gap.calories,
        protein: gap.protein,
        subtitle: gap.reason,
        onRepeat: () => void c.repeatMemory(gap.items, gap.name),
      });
    }
    return cards.slice(0, 2);
  }, [c]);

  if (!session) return null;

  return (
    <Card className="space-y-3.5 border-border-custom/80 bg-surface p-5 shadow-sm">
      <ComposerHeader
        logDate={c.logDate}
        setLogDate={c.setLogDate}
        mealType={c.mealType}
        setMealType={c.setMealType}
        today={c.today}
        yesterday={c.yesterday}
        mealTypes={c.MEAL_TYPES}
      />

      <ComposerProgress totals={c.totals} qualityPending={c.qualityPending} />

      {!c.draftItems?.length && (
        <MealComposerQuick
          repeatCards={repeatCards}
          chips={c.quickChips}
          saving={c.saving}
          onChip={c.handleQuickChip}
        />
      )}

      <ComposerInput
        text={c.text}
        setText={c.setText}
        parsing={c.parsing}
        saving={c.saving}
        scanningPhoto={c.scanningPhoto}
        searchOpen={c.searchOpen}
        onParse={() => void c.parseText()}
        onPhotoPick={(file) => void c.scanPhoto(file)}
        onToggleSearch={() => c.setSearchOpen((open) => !open)}
        onOpenScanner={() => c.search.setScannerOpen(true)}
        photoInputRef={c.photoInputRef}
      />

      {c.search.scannerOpen && (
        <BarcodeScanner
          onDetected={(code) => void c.search.lookupBarcode(code)}
          onClose={() => c.search.setScannerOpen(false)}
          loading={c.search.scanLookingUp}
        />
      )}

      {c.searchOpen && !c.search.scannerOpen && (
        <div className="space-y-2">
          <ComposerSearch
            query={c.search.query}
            setQuery={c.search.setQuery}
            searching={c.search.searching}
            results={c.search.searchResults}
            externalSearching={c.search.externalSearching}
            externalSearched={c.search.externalSearched}
            searchExternal={c.search.searchExternal}
            onPick={(food) => c.addFoodToDraft(food, food.defaultGrams ?? 100)}
          />
          {c.userId && (
            <MealComposerCustomProduct
              userId={c.userId}
              saving={c.saving}
              onCreated={(food) => c.addFoodToDraft(food, food.defaultGrams ?? 100)}
            />
          )}
        </div>
      )}

      {c.draftItems?.length ? (
        <MealComposerDraft
          items={c.draftItems}
          saving={c.saving}
          rememberedByName={c.rememberedByName}
          loggedTime={c.loggedTime}
          setLoggedTime={c.setLoggedTime}
          memoryName={c.memoryName}
          setMemoryName={c.setMemoryName}
          onChange={c.setDraftItems}
          onRemove={(id) => c.setDraftItems((items) => items?.filter((item) => item.id !== id) ?? null)}
          onSave={(rememberIds, name) => c.saveFromDraft(rememberIds, name)}
        />
      ) : (
        <MealComposerDraftPlaceholder />
      )}

      {c.error && <p role="alert" className="text-xs text-danger">{c.error}</p>}

      <NutritionDayReview userId={session.user.id} date={c.logDate} hasEntries={c.hasEntries} />
    </Card>
  );
}
