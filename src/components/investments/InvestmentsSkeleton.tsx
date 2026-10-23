import Skeleton from '../ui/Skeleton';

interface InvestmentsSkeletonProps {
  rows?: number;
  hero?: boolean;
  label?: string;
}

/** Szkielet widoków Inwestycji: hero z liczbą + lista wierszy (zamiast spinnera). */
export function InvestmentsSkeleton({ rows = 5, hero = true, label = 'Ładowanie danych' }: InvestmentsSkeletonProps) {
  return (
    <div className="space-y-6" role="status" aria-busy="true" aria-label={label}>
      {hero && (
        <div className="flex flex-col items-center gap-3 py-4">
          <div className="flex gap-2">
            <Skeleton variant="block" className="h-9 w-20 !rounded-full" />
            <Skeleton variant="block" className="h-9 w-24 !rounded-full" />
            <Skeleton variant="block" className="h-9 w-20 !rounded-full" />
          </div>
          <Skeleton variant="block" className="h-14 w-48" />
          <Skeleton variant="block" className="h-4 w-32" />
        </div>
      )}
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, index) => (
          <Skeleton key={index} variant="avatar" className="rounded-2xl bg-surface-1 p-3" />
        ))}
      </div>
    </div>
  );
}
