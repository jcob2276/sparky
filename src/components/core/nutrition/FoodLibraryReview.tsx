import { useQuery, useQueryClient } from '@tanstack/react-query';
import Button from '../../ui/Button';
import { formatDecimalPl } from '../../../lib/formatPl';
import { notify } from '../../../lib/notify';
import { energyMismatchPct, fetchReviewCandidates, setLibraryValidation, type ReviewCandidate } from '../../../lib/health/foodReviewApi';
import { foodEntryListsKeys } from '../../../lib/queryKeys';

const reviewKey = (userId: string) => ['food-library-review', userId] as const;

function Row({ item, onAction }: { item: ReviewCandidate; onAction: (status: 'verified' | 'quarantined') => void }) {
  const mismatch = energyMismatchPct(item);
  const suspicious = mismatch != null && mismatch > 20;
  return (
    <li className="space-y-2 border-b border-border-custom py-3 last:border-b-0">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-text-primary">{item.name}{item.brand ? <span className="font-normal text-text-muted"> · {item.brand}</span> : null}</p>
        <p className="text-xs tabular-nums text-text-secondary">
          na 100 g: {formatDecimalPl(item.calories ?? 0)} kcal · B {formatDecimalPl(item.protein ?? 0)} · W {formatDecimalPl(item.carbs ?? 0)} · T {formatDecimalPl(item.fat ?? 0)}
          {item.defaultGrams ? ` · porcja ${item.defaultGrams} g` : ''}
        </p>
        {suspicious && <p role="note" className="text-xs text-warning">Kalorie różnią się o {mismatch}% od makr: sprawdź etykietę.</p>}
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="tonal" onClick={() => onAction('verified')}>Zgadza się</Button>
        <Button size="sm" variant="ghost" onClick={() => onAction('quarantined')}>Ukryj</Button>
      </div>
    </li>
  );
}

/** Przegląd najczęściej używanych, jeszcze niesprawdzonych produktów: jedno kliknięcie podnosi wiarygodność makr. */
export default function FoodLibraryReview({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: reviewKey(userId), queryFn: () => fetchReviewCandidates(userId) });

  const act = async (item: ReviewCandidate, status: 'verified' | 'quarantined') => {
    try {
      await setLibraryValidation(userId, item.libraryId, status);
      queryClient.setQueryData<ReviewCandidate[]>(reviewKey(userId), (rows) => (rows ?? []).filter((row) => row.libraryId !== item.libraryId));
      void queryClient.invalidateQueries({ queryKey: foodEntryListsKeys.favorites(userId) });
    } catch {
      notify('Nie udało się zapisać decyzji. Spróbuj ponownie.', 'error');
    }
  };

  if (isLoading) return <p role="status" className="py-6 text-center text-xs text-text-muted">Wczytuję produkty…</p>;
  if (error) return <p role="alert" className="py-6 text-center text-xs text-danger">Nie udało się wczytać produktów.</p>;
  if (!data?.length) return <p className="py-6 text-center text-sm text-text-muted">Wszystkie często używane produkty są sprawdzone.</p>;
  return (
    <div>
      <p className="pb-2 text-xs text-text-muted">{data.length} najczęściej używanych produktów bez zatwierdzenia. „Ukryj" usuwa produkt z podpowiedzi.</p>
      <ul className="list-none p-0">{data.map((item) => <Row key={item.libraryId} item={item} onAction={(status) => void act(item, status)} />)}</ul>
    </div>
  );
}
