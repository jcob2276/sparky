import Button from '../ui/Button';

/** Stały dolny pasek: wstecz i jedno główne działanie. Gdy brakuje danych, mówi dokładnie czego. */
export default function ReviewNav({
  onBack,
  onNext,
  nextLabel,
  disabled,
  hint,
  loading,
}: {
  onBack?: () => void;
  onNext: () => void;
  nextLabel: string;
  disabled?: boolean;
  hint?: string | null;
  loading?: boolean;
}) {
  return (
    <div className="sticky bottom-0 -mx-4 space-y-1.5 border-t border-border-custom/60 bg-background/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
      {hint && <p className="text-center text-2xs font-semibold text-warning">{hint}</p>}
      <div className="flex items-center gap-2">
        {onBack && (
          <Button variant="secondary" className="h-12 px-5" onClick={onBack}>
            Wstecz
          </Button>
        )}
        <Button variant="primary" className="h-12 flex-1 text-sm font-bold" disabled={disabled} loading={loading} onClick={onNext}>
          {nextLabel}
        </Button>
      </div>
    </div>
  );
}
